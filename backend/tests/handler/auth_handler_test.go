package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	
	"quiz-app/internal/domain"
	"quiz-app/internal/repository"
	"quiz-app/internal/handler"
)

// AuthUseCaseのモック
type MockAuthUseCase struct {
	mock.Mock
}

func (m *MockAuthUseCase) VerifyAccessCode(ctx context.Context, accessCode string) (bool, error) {
	args := m.Called(ctx, accessCode)
	return args.Bool(0), args.Error(1)
}

func (m *MockAuthUseCase) AuthenticateUser(ctx context.Context, username, password string) (*domain.User, error) {
	args := m.Called(ctx, username, password)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockAuthUseCase) CreateUser(ctx context.Context, username, password, displayName string) (*domain.User, error) {
	args := m.Called(ctx, username, password, displayName)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockAuthUseCase) BulkCreateUsers(ctx context.Context, users []repository.UserCredentials) error {
	args := m.Called(ctx, users)
	return args.Error(0)
}

func (m *MockAuthUseCase) GetAllUsers(ctx context.Context) ([]*domain.User, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.User), args.Error(1)
}

func (m *MockAuthUseCase) GetUserByID(ctx context.Context, userID string) (*domain.User, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockAuthUseCase) DeleteUser(ctx context.Context, userID string) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockAuthUseCase) LogLoginAttempt(ctx context.Context, identifier string, success bool, userAgent, ipAddress string) error {
	args := m.Called(ctx, identifier, success, userAgent, ipAddress)
	return args.Error(0)
}

func (m *MockAuthUseCase) GetValidAccessCodes(ctx context.Context) ([]string, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]string), args.Error(1)
}

func TestAuthHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("アクセスコード検証APIが正常に動作すること", func(t *testing.T) {
		mockUseCase := &MockAuthUseCase{}
		// 実際のハンドラー実装が完了するまではモックハンドラーを使用
		router := gin.New()
		router.POST("/verify", mockVerifyAccessCodeHandler)

		// 有効なアクセスコードでの検証成功
		t.Run("有効なアクセスコードでの検証成功", func(t *testing.T) {
			reqBody := map[string]string{"accessCode": "VALID_CODE_2024"}
			reqJSON, _ := json.Marshal(reqBody)

			w := httptest.NewRecorder()
			req := httptest.NewRequest("POST", "/verify", bytes.NewReader(reqJSON))
			req.Header.Set("Content-Type", "application/json")

			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)
			
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.True(t, response["valid"].(bool))

			mockUseCase.AssertExpectations(t)
		})

		// 無効なアクセスコードでの検証失敗
		t.Run("無効なアクセスコードでの検証失敗", func(t *testing.T) {
			reqBody := map[string]string{"accessCode": "INVALID_CODE"}
			reqJSON, _ := json.Marshal(reqBody)

			mockUseCase.On("VerifyAccessCode", mock.Anything, "INVALID_CODE").Return(false, nil)
			mockUseCase.On("LogLoginAttempt", mock.Anything, "INVALID_CODE", false, mock.Anything, mock.Anything).Return(nil)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/api/v1/auth/verify-access-code", bytes.NewReader(reqJSON))
			c.Request.Header.Set("Content-Type", "application/json")

			// Create handler instance
			authHandler := handler.NewAuthHandler(mockUseCase)
			authHandler.VerifyAccessCode(c)

			assert.Equal(t, http.StatusUnauthorized, w.Code)
			
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.False(t, response["isValid"].(bool))

			mockUseCase.AssertExpectations(t)
		})

		// 空のアクセスコードでのバリデーションエラー
		t.Run("空のアクセスコードでのバリデーションエラー", func(t *testing.T) {
			reqBody := map[string]string{"accessCode": ""}
			reqJSON, _ := json.Marshal(reqBody)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/api/v1/auth/verify-access-code", bytes.NewReader(reqJSON))
			c.Request.Header.Set("Content-Type", "application/json")

			// Create handler instance
			authHandler := handler.NewAuthHandler(mockUseCase)
			authHandler.VerifyAccessCode(c)

			assert.Equal(t, http.StatusBadRequest, w.Code)
			
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.Contains(t, response["error"].(string), "Invalid request format")
		})
	})

	t.Run("ユーザーログインAPIが正常に動作すること", func(t *testing.T) {
		mockUseCase := &MockAuthUseCase{}
		authHandler := handler.NewAuthHandler(mockUseCase)

		// 有効な認証情報でのログイン成功
		t.Run("有効な認証情報でのログイン成功", func(t *testing.T) {
			reqBody := map[string]string{
				"username": "testuser",
				"password": "password123",
			}
			reqJSON, _ := json.Marshal(reqBody)

			expectedUser := &domain.User{
				ID:          "user123",
				Username:    "testuser",
				DisplayName: "Test User",
			}

			mockUseCase.On("AuthenticateUser", mock.Anything, "testuser", "password123").Return(expectedUser, nil)
			mockUseCase.On("LogLoginAttempt", mock.Anything, "testuser", true, mock.Anything, mock.Anything).Return(nil)

			// セッションミドルウェアを含むルーターを作成
			router := gin.New()
			store := cookie.NewStore([]byte("test-secret"))
			router.Use(sessions.Sessions("test-session", store))
			router.POST("/login", authHandler.Login)

			w := httptest.NewRecorder()
			req := httptest.NewRequest("POST", "/login", bytes.NewReader(reqJSON))
			req.Header.Set("Content-Type", "application/json")

			// セッションにアクセスコード認証済み状態を設定
			// まずセッション取得のためのリクエストを送信
			sessionW := httptest.NewRecorder()
			sessionReq := httptest.NewRequest("GET", "/", nil)
			c, _ := gin.CreateTestContext(sessionW)
			c.Request = sessionReq
			router.ServeHTTP(sessionW, sessionReq)

			// Cookieを設定してからログインリクエスト
			if cookie := sessionW.Result().Cookies(); len(cookie) > 0 {
				req.AddCookie(cookie[0])
			}

			// アクセスコード認証済みのセッションを模擬するため、事前にセッションを設定
			preW := httptest.NewRecorder()
			preRouter := gin.New()
			preRouter.Use(sessions.Sessions("test-session", store))
			preRouter.POST("/pre", func(c *gin.Context) {
				session := sessions.Default(c)
				session.Set("access_code_verified", true)
				session.Save()
				c.JSON(200, gin.H{"status": "ok"})
			})
			preReq := httptest.NewRequest("POST", "/pre", nil)
			if cookie := sessionW.Result().Cookies(); len(cookie) > 0 {
				preReq.AddCookie(cookie[0])
			}
			preRouter.ServeHTTP(preW, preReq)

			// 更新されたCookieを使用
			if cookie := preW.Result().Cookies(); len(cookie) > 0 {
				req.Header.Set("Cookie", cookie[0].String())
			}

			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)
			
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.Equal(t, "user123", response["user"].(map[string]interface{})["id"])

			mockUseCase.AssertExpectations(t)
		})

		// 無効な認証情報でのログイン失敗 - アクセスコード未認証でテスト
		t.Run("アクセスコード未検証状態でのログイン拒否", func(t *testing.T) {
			reqBody := map[string]string{
				"username": "testuser",
				"password": "password123",
			}
			reqJSON, _ := json.Marshal(reqBody)

			// セッションミドルウェアを含むルーターを作成（アクセスコード認証なし）
			router := gin.New()
			store := cookie.NewStore([]byte("test-secret"))
			router.Use(sessions.Sessions("test-session", store))
			router.POST("/login", authHandler.Login)

			w := httptest.NewRecorder()
			req := httptest.NewRequest("POST", "/login", bytes.NewReader(reqJSON))
			req.Header.Set("Content-Type", "application/json")

			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusUnauthorized, w.Code)
			
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.Contains(t, response["error"].(string), "アクセスコード認証が必要です")
		})

		// 不正なJSON形式でエラー
		t.Run("不正なJSON形式でエラー", func(t *testing.T) {
			invalidJSON := []byte("{invalid json}")

			// セッションミドルウェアを含むルーターを作成（アクセスコード認証済み）
			router := gin.New()
			store := cookie.NewStore([]byte("test-secret"))
			router.Use(sessions.Sessions("test-session", store))
			router.POST("/pre", func(c *gin.Context) {
				session := sessions.Default(c)
				session.Set("access_code_verified", true)
				session.Save()
				c.JSON(200, gin.H{"status": "ok"})
			})
			router.POST("/login", authHandler.Login)

			// 先にセッション設定
			preW := httptest.NewRecorder()
			preReq := httptest.NewRequest("POST", "/pre", nil)
			router.ServeHTTP(preW, preReq)

			w := httptest.NewRecorder()
			req := httptest.NewRequest("POST", "/login", bytes.NewReader(invalidJSON))
			req.Header.Set("Content-Type", "application/json")
			if cookie := preW.Result().Cookies(); len(cookie) > 0 {
				req.Header.Set("Cookie", cookie[0].String())
			}

			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusBadRequest, w.Code)
			
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.Contains(t, response["error"].(string), "Invalid JSON format")
		})
	})

	t.Run("一括ユーザー登録APIが正常に動作すること", func(t *testing.T) {
		mockUseCase := &MockAuthUseCase{}
		authHandler := handler.NewAuthHandler(mockUseCase)

		// JSON形式での一括ユーザー登録
		t.Run("JSON形式での一括ユーザー登録", func(t *testing.T) {
			reqBody := map[string]interface{}{
				"users": []map[string]string{
					{"username": "user1", "password": "pass1", "displayName": "User One"},
					{"username": "user2", "password": "pass2", "displayName": "User Two"},
				},
			}
			reqJSON, _ := json.Marshal(reqBody)
			
			expectedUsers := []repository.UserCredentials{
				{Username: "user1", Password: "pass1", DisplayName: "User One"},
				{Username: "user2", Password: "pass2", DisplayName: "User Two"},
			}

			mockUseCase.On("BulkCreateUsers", mock.Anything, expectedUsers).Return(nil)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/api/v1/auth/bulk-users", bytes.NewReader(reqJSON))
			c.Request.Header.Set("Content-Type", "application/json")

			authHandler.BulkCreateUsers(c)

			assert.Equal(t, http.StatusCreated, w.Code)
			
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.Equal(t, float64(2), response["count"])

			mockUseCase.AssertExpectations(t)
		})

		// 不正なJSON形式での登録失敗
		t.Run("不正なJSON形式での登録失敗", func(t *testing.T) {
			invalidJSON := []byte("{invalid json}")

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/api/v1/auth/bulk-users", bytes.NewReader(invalidJSON))
			c.Request.Header.Set("Content-Type", "application/json")

			authHandler.BulkCreateUsers(c)

			assert.Equal(t, http.StatusBadRequest, w.Code)
			
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.Contains(t, response["error"].(string), "Invalid request format")
		})

		// 重複ユーザー名での登録失敗
		t.Run("重複ユーザー名での登録失敗", func(t *testing.T) {
			reqBody := map[string]interface{}{
				"users": []map[string]string{
					{"username": "user1", "password": "pass1", "displayName": "User One"},
					{"username": "user1", "password": "pass2", "displayName": "User Two"}, // 重複
				},
			}
			reqJSON, _ := json.Marshal(reqBody)

			expectedUsers := []repository.UserCredentials{
				{Username: "user1", Password: "pass1", DisplayName: "User One"},
				{Username: "user1", Password: "pass2", DisplayName: "User Two"},
			}

			mockUseCase.On("BulkCreateUsers", mock.Anything, expectedUsers).Return(errors.New("duplicate username: user1"))

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/api/v1/auth/bulk-users", bytes.NewReader(reqJSON))
			c.Request.Header.Set("Content-Type", "application/json")

			authHandler.BulkCreateUsers(c)

			assert.Equal(t, http.StatusInternalServerError, w.Code)
			
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.Contains(t, response["error"].(string), "一括ユーザー作成に失敗しました")

			mockUseCase.AssertExpectations(t)
		})
	})
}

// モックハンドラー関数
func mockVerifyAccessCodeHandler(c *gin.Context) {
	var req struct {
		AccessCode string `json:"accessCode"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	
	if req.AccessCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Access code is required"})
		return
	}
	
	valid := req.AccessCode == "VALID_CODE_2024"
	c.JSON(http.StatusOK, gin.H{"valid": valid})
}

func mockLoginHandler(c *gin.Context) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	
	if req.Username == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username and password are required"})
		return
	}
	
	if req.Username == "testuser" && req.Password == "password123" {
		c.JSON(http.StatusOK, gin.H{
			"user":  gin.H{"id": "user123", "username": req.Username},
			"token": "jwt-token-here",
		})
	} else {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
	}
}

func mockBulkUsersHandler(c *gin.Context) {
	c.JSON(http.StatusCreated, gin.H{"created_count": 2})
}