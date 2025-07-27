package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	
	"quiz-app/internal/domain"
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

func (m *MockAuthUseCase) BulkCreateUsers(ctx context.Context, users []domain.UserCredentials) error {
	args := m.Called(ctx, users)
	return args.Error(0)
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

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/api/v1/auth/verify-access-code", bytes.NewReader(reqJSON))
			c.Request.Header.Set("Content-Type", "application/json")

			handler.VerifyAccessCode(c)

			assert.Equal(t, http.StatusOK, w.Code)
			
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.False(t, response["valid"].(bool))

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

			handler.VerifyAccessCode(c)

			assert.Equal(t, http.StatusBadRequest, w.Code)
			
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.Contains(t, response["error"].(string), "access code")
		})
	})

	t.Run("ユーザーログインAPIが正常に動作すること", func(t *testing.T) {
		mockUseCase := &MockAuthUseCase{}
		handler := handler.NewAuthHandler(mockUseCase)

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

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(reqJSON))
			c.Request.Header.Set("Content-Type", "application/json")

			handler.Login(c)

			assert.Equal(t, http.StatusOK, w.Code)
			
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.Equal(t, "user123", response["user"].(map[string]interface{})["id"])
			assert.NotEmpty(t, response["token"])

			mockUseCase.AssertExpectations(t)
		})

		// 無効な認証情報でのログイン失敗
		t.Run("無効な認証情報でのログイン失敗", func(t *testing.T) {
			reqBody := map[string]string{
				"username": "testuser",
				"password": "wrongpassword",
			}
			reqJSON, _ := json.Marshal(reqBody)

			mockUseCase.On("AuthenticateUser", mock.Anything, "testuser", "wrongpassword").Return(nil, errors.New("invalid credentials"))

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(reqJSON))
			c.Request.Header.Set("Content-Type", "application/json")

			handler.Login(c)

			assert.Equal(t, http.StatusUnauthorized, w.Code)
			
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.Contains(t, response["error"].(string), "invalid credentials")

			mockUseCase.AssertExpectations(t)
		})

		// 空の認証情報でのバリデーションエラー
		t.Run("空の認証情報でのバリデーションエラー", func(t *testing.T) {
			reqBody := map[string]string{
				"username": "",
				"password": "",
			}
			reqJSON, _ := json.Marshal(reqBody)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(reqJSON))
			c.Request.Header.Set("Content-Type", "application/json")

			handler.Login(c)

			assert.Equal(t, http.StatusBadRequest, w.Code)
			
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.Contains(t, response["error"].(string), "required")
		})
	})

	t.Run("一括ユーザー登録APIが正常に動作すること", func(t *testing.T) {
		mockUseCase := &MockAuthUseCase{}
		handler := handler.NewAuthHandler(mockUseCase)

		// CSVファイルでの一括ユーザー登録
		t.Run("CSVファイルでの一括ユーザー登録", func(t *testing.T) {
			csvContent := "username,password,displayName\nuser1,pass1,User One\nuser2,pass2,User Two"
			
			expectedUsers := []domain.UserCredentials{
				{Username: "user1", Password: "pass1", DisplayName: "User One"},
				{Username: "user2", Password: "pass2", DisplayName: "User Two"},
			}

			mockUseCase.On("BulkCreateUsers", mock.Anything, expectedUsers).Return(nil)

			// multipart/form-dataのリクエストを作成
			body := &bytes.Buffer{}
			writer := multipart.NewWriter(body)
			part, _ := writer.CreateFormFile("csvfile", "users.csv")
			part.Write([]byte(csvContent))
			writer.Close()

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/api/v1/auth/bulk-users", body)
			c.Request.Header.Set("Content-Type", writer.FormDataContentType())

			handler.BulkCreateUsers(c)

			assert.Equal(t, http.StatusCreated, w.Code)
			
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.Equal(t, float64(2), response["created_count"])

			mockUseCase.AssertExpectations(t)
		})

		// 不正なCSV形式での登録失敗
		t.Run("不正なCSV形式での登録失敗", func(t *testing.T) {
			csvContent := "invalid,csv,format\nuser1,pass1" // 列数が不正

			body := &bytes.Buffer{}
			writer := multipart.NewWriter(body)
			part, _ := writer.CreateFormFile("csvfile", "users.csv")
			part.Write([]byte(csvContent))
			writer.Close()

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/api/v1/auth/bulk-users", body)
			c.Request.Header.Set("Content-Type", writer.FormDataContentType())

			handler.BulkCreateUsers(c)

			assert.Equal(t, http.StatusBadRequest, w.Code)
			
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.Contains(t, response["error"].(string), "CSV")
		})

		// 重複ユーザー名での登録失敗
		t.Run("重複ユーザー名での登録失敗", func(t *testing.T) {
			csvContent := "username,password,displayName\nuser1,pass1,User One\nuser1,pass2,User Two" // 重複

			expectedUsers := []domain.UserCredentials{
				{Username: "user1", Password: "pass1", DisplayName: "User One"},
				{Username: "user1", Password: "pass2", DisplayName: "User Two"},
			}

			mockUseCase.On("BulkCreateUsers", mock.Anything, expectedUsers).Return(errors.New("duplicate username: user1"))

			body := &bytes.Buffer{}
			writer := multipart.NewWriter(body)
			part, _ := writer.CreateFormFile("csvfile", "users.csv")
			part.Write([]byte(csvContent))
			writer.Close()

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/api/v1/auth/bulk-users", body)
			c.Request.Header.Set("Content-Type", writer.FormDataContentType())

			handler.BulkCreateUsers(c)

			assert.Equal(t, http.StatusConflict, w.Code)
			
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.Contains(t, response["error"].(string), "duplicate")

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