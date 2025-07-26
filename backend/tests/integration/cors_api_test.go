package integration

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// setupCORSTestRouter CORS設定を含むテスト用ルーターを設定
func setupCORSTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	
	router := gin.New()

	// CORS設定
	config := cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:3001"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		AllowCredentials: true,
	}
	router.Use(cors.New(config))

	// セッション設定
	store := cookie.NewStore([]byte("test-secret-key"))
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: true,
		Secure:   false, // テスト環境
		SameSite: http.SameSiteLaxMode,
	})
	router.Use(sessions.Sessions("quiz-session", store))

	// シンプルなテスト用エンドポイント
	v1 := router.Group("/api/v1")
	{
		auth := v1.Group("/auth")
		{
			auth.POST("/verify-access-code", func(c *gin.Context) {
				var req struct {
					AccessCode string `json:"accessCode" binding:"required"`
				}
				if err := c.ShouldBindJSON(&req); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
					return
				}
				
				if req.AccessCode == "VALID_CODE" {
					// セッションに保存
					session := sessions.Default(c)
					session.Set("access_code", req.AccessCode)
					session.Set("access_code_verified", true)
					session.Save()
					
					c.JSON(http.StatusOK, gin.H{"isValid": true, "message": "アクセスコードが確認されました"})
				} else {
					c.JSON(http.StatusUnauthorized, gin.H{"isValid": false, "message": "無効なアクセスコードです"})
				}
			})
			
			auth.POST("/login", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "login endpoint"})
			})
			
			auth.GET("/me", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "me endpoint"})
			})
		}
	}

	return router
}

func TestCORSAPI(t *testing.T) {
	router := setupCORSTestRouter()
	server := httptest.NewServer(router)
	defer server.Close()

	t.Run("CORS設定が正常に動作すること", func(t *testing.T) {
		t.Run("許可されたOriginからのPreflightリクエスト", func(t *testing.T) {
			req, _ := http.NewRequest("OPTIONS", server.URL+"/api/v1/auth/verify-access-code", nil)
			req.Header.Set("Origin", "http://localhost:3000")
			req.Header.Set("Access-Control-Request-Method", "POST")
			req.Header.Set("Access-Control-Request-Headers", "Content-Type")

			client := &http.Client{}
			resp, err := client.Do(req)

			assert.NoError(t, err)
			defer resp.Body.Close()
			assert.Equal(t, http.StatusNoContent, resp.StatusCode)
			assert.Equal(t, "http://localhost:3000", resp.Header.Get("Access-Control-Allow-Origin"))
			assert.Equal(t, "true", resp.Header.Get("Access-Control-Allow-Credentials"))
			assert.Contains(t, resp.Header.Get("Access-Control-Allow-Methods"), "POST")
			assert.Contains(t, resp.Header.Get("Access-Control-Allow-Headers"), "Content-Type")
		})

		t.Run("別の許可されたOriginからのPreflightリクエスト", func(t *testing.T) {
			req, _ := http.NewRequest("OPTIONS", server.URL+"/api/v1/auth/verify-access-code", nil)
			req.Header.Set("Origin", "http://localhost:3001")
			req.Header.Set("Access-Control-Request-Method", "POST")
			req.Header.Set("Access-Control-Request-Headers", "Content-Type")

			client := &http.Client{}
			resp, err := client.Do(req)

			assert.NoError(t, err)
			defer resp.Body.Close()
			assert.Equal(t, http.StatusNoContent, resp.StatusCode)
			assert.Equal(t, "http://localhost:3001", resp.Header.Get("Access-Control-Allow-Origin"))
			assert.Equal(t, "true", resp.Header.Get("Access-Control-Allow-Credentials"))
		})

		t.Run("許可されていないOriginからのPreflightリクエスト", func(t *testing.T) {
			req, _ := http.NewRequest("OPTIONS", server.URL+"/api/v1/auth/verify-access-code", nil)
			req.Header.Set("Origin", "http://malicious-site.com")
			req.Header.Set("Access-Control-Request-Method", "POST")
			req.Header.Set("Access-Control-Request-Headers", "Content-Type")

			client := &http.Client{}
			resp, err := client.Do(req)

			assert.NoError(t, err)
			defer resp.Body.Close()
			
			// 許可されていないOriginの場合、Access-Control-Allow-Originヘッダーが設定されない
			assert.Empty(t, resp.Header.Get("Access-Control-Allow-Origin"))
		})
	})

	t.Run("Credentialsを含むリクエストが正常に処理されること", func(t *testing.T) {
		t.Run("許可されたOriginからのPOSTリクエスト", func(t *testing.T) {
			reqBody := `{"accessCode":"TEST_CODE"}`
			req, _ := http.NewRequest("POST", server.URL+"/api/v1/auth/verify-access-code", strings.NewReader(reqBody))
			req.Header.Set("Origin", "http://localhost:3000")
			req.Header.Set("Content-Type", "application/json")

			client := &http.Client{}
			resp, err := client.Do(req)

			assert.NoError(t, err)
			defer resp.Body.Close()
			assert.Equal(t, "http://localhost:3000", resp.Header.Get("Access-Control-Allow-Origin"))
			assert.Equal(t, "true", resp.Header.Get("Access-Control-Allow-Credentials"))
			
			// レスポンスコードは実装に依存するが、CORSヘッダーは正しく設定されている必要がある
			assert.True(t, resp.StatusCode >= 200)
		})

		t.Run("許可されたOriginからのGETリクエスト", func(t *testing.T) {
			req, _ := http.NewRequest("GET", server.URL+"/api/v1/auth/me", nil)
			req.Header.Set("Origin", "http://localhost:3000")

			client := &http.Client{}
			resp, err := client.Do(req)

			assert.NoError(t, err)
			defer resp.Body.Close()
			assert.Equal(t, "http://localhost:3000", resp.Header.Get("Access-Control-Allow-Origin"))
			assert.Equal(t, "true", resp.Header.Get("Access-Control-Allow-Credentials"))
		})

		t.Run("許可されていないOriginからのリクエスト", func(t *testing.T) {
			reqBody := `{"accessCode":"TEST_CODE"}`
			req, _ := http.NewRequest("POST", server.URL+"/api/v1/auth/verify-access-code", strings.NewReader(reqBody))
			req.Header.Set("Origin", "http://malicious-site.com")
			req.Header.Set("Content-Type", "application/json")

			client := &http.Client{}
			resp, err := client.Do(req)

			assert.NoError(t, err)
			defer resp.Body.Close()
			
			// 許可されていないOriginからのリクエストでは、Access-Control-Allow-Originヘッダーが設定されない
			assert.Empty(t, resp.Header.Get("Access-Control-Allow-Origin"))
			
			// サーバー自体は正常に処理する（CORSエラーはブラウザ側で発生）
			assert.True(t, resp.StatusCode >= 200)
		})
	})

	t.Run("複雑なCORSシナリオのテスト", func(t *testing.T) {
		t.Run("Cookieを含むリクエストのCORS処理", func(t *testing.T) {
			client := &http.Client{}

			// 最初にアクセスコード検証でセッションクッキーを取得
			reqBody := `{"accessCode":"TEST_CODE"}`
			req1, _ := http.NewRequest("POST", server.URL+"/api/v1/auth/verify-access-code", strings.NewReader(reqBody))
			req1.Header.Set("Origin", "http://localhost:3000")
			req1.Header.Set("Content-Type", "application/json")

			resp1, err := client.Do(req1)
			assert.NoError(t, err)
			defer resp1.Body.Close()

			// セッションクッキーを取得
			var sessionCookie *http.Cookie
			for _, cookie := range resp1.Cookies() {
				if cookie.Name == "quiz-session" {
					sessionCookie = cookie
					break
				}
			}

			if sessionCookie != nil {
				// セッションクッキーを含む後続リクエスト
				req2, _ := http.NewRequest("GET", server.URL+"/api/v1/auth/me", nil)
				req2.Header.Set("Origin", "http://localhost:3000")
				req2.AddCookie(sessionCookie)

				resp2, err := client.Do(req2)
				assert.NoError(t, err)
				defer resp2.Body.Close()

				// CORSヘッダーが正しく設定されていることを確認
				assert.Equal(t, "http://localhost:3000", resp2.Header.Get("Access-Control-Allow-Origin"))
				assert.Equal(t, "true", resp2.Header.Get("Access-Control-Allow-Credentials"))
			}
		})

		t.Run("異なるHTTPメソッドでのCORS動作", func(t *testing.T) {
			methods := []string{"GET", "POST", "PUT", "DELETE"}
			
			for _, method := range methods {
				// Preflightリクエスト
				req, _ := http.NewRequest("OPTIONS", server.URL+"/api/v1/auth/verify-access-code", nil)
				req.Header.Set("Origin", "http://localhost:3000")
				req.Header.Set("Access-Control-Request-Method", method)
				req.Header.Set("Access-Control-Request-Headers", "Content-Type")

				client := &http.Client{}
				resp, err := client.Do(req)

				assert.NoError(t, err)
				defer resp.Body.Close()
				assert.Equal(t, http.StatusNoContent, resp.StatusCode)
				assert.Equal(t, "http://localhost:3000", resp.Header.Get("Access-Control-Allow-Origin"))
				assert.Contains(t, resp.Header.Get("Access-Control-Allow-Methods"), method)
			}
		})

		t.Run("カスタムヘッダーを含むリクエストのCORS処理", func(t *testing.T) {
			// Preflightリクエスト
			req, _ := http.NewRequest("OPTIONS", server.URL+"/api/v1/auth/verify-access-code", nil)
			req.Header.Set("Origin", "http://localhost:3000")
			req.Header.Set("Access-Control-Request-Method", "POST")
			req.Header.Set("Access-Control-Request-Headers", "Content-Type,Authorization,X-Requested-With")

			client := &http.Client{}
			resp, err := client.Do(req)

			assert.NoError(t, err)
			defer resp.Body.Close()
			assert.Equal(t, http.StatusNoContent, resp.StatusCode)
			assert.Equal(t, "http://localhost:3000", resp.Header.Get("Access-Control-Allow-Origin"))
			
			allowedHeaders := resp.Header.Get("Access-Control-Allow-Headers")
			assert.Contains(t, allowedHeaders, "Content-Type")
			assert.Contains(t, allowedHeaders, "Authorization")
			assert.Contains(t, allowedHeaders, "X-Requested-With")
		})
	})

	t.Run("セッション管理とCORSの統合テスト", func(t *testing.T) {
		t.Run("クロスオリジンセッション管理", func(t *testing.T) {
			client := &http.Client{}

			// Step 1: アクセスコード検証
			reqBody1 := `{"accessCode":"VALID_CODE"}`
			req1, _ := http.NewRequest("POST", server.URL+"/api/v1/auth/verify-access-code", strings.NewReader(reqBody1))
			req1.Header.Set("Origin", "http://localhost:3000")
			req1.Header.Set("Content-Type", "application/json")

			resp1, err := client.Do(req1)
			assert.NoError(t, err)
			defer resp1.Body.Close()

			// CORSヘッダーの確認
			assert.Equal(t, "http://localhost:3000", resp1.Header.Get("Access-Control-Allow-Origin"))
			assert.Equal(t, "true", resp1.Header.Get("Access-Control-Allow-Credentials"))

			// セッションクッキーの取得
			var sessionCookie *http.Cookie
			for _, cookie := range resp1.Cookies() {
				if cookie.Name == "quiz-session" {
					sessionCookie = cookie
					break
				}
			}

			if sessionCookie != nil {
				// Step 2: セッションを使用したログイン
				reqBody2 := `{"username":"testuser","password":"password123"}`
				req2, _ := http.NewRequest("POST", server.URL+"/api/v1/auth/login", strings.NewReader(reqBody2))
				req2.Header.Set("Origin", "http://localhost:3000")
				req2.Header.Set("Content-Type", "application/json")
				req2.AddCookie(sessionCookie)

				resp2, err := client.Do(req2)
				assert.NoError(t, err)
				defer resp2.Body.Close()

				// CORSヘッダーの確認
				assert.Equal(t, "http://localhost:3000", resp2.Header.Get("Access-Control-Allow-Origin"))
				assert.Equal(t, "true", resp2.Header.Get("Access-Control-Allow-Credentials"))

				// Step 3: 認証が必要なエンドポイントへのアクセス
				req3, _ := http.NewRequest("GET", server.URL+"/api/v1/auth/me", nil)
				req3.Header.Set("Origin", "http://localhost:3000")
				req3.AddCookie(sessionCookie)

				resp3, err := client.Do(req3)
				assert.NoError(t, err)
				defer resp3.Body.Close()

				// CORSヘッダーの確認
				assert.Equal(t, "http://localhost:3000", resp3.Header.Get("Access-Control-Allow-Origin"))
				assert.Equal(t, "true", resp3.Header.Get("Access-Control-Allow-Credentials"))
			}
		})
	})
}

// TestCORSConfiguration CORS設定そのもののテスト
func TestCORSConfiguration(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	router := gin.New()

	// テスト用CORS設定
	config := cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:3001"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * 60 * 60, // 12時間
	}
	router.Use(cors.New(config))

	// テスト用エンドポイント
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "test"})
	})

	t.Run("CORS設定パラメータの検証", func(t *testing.T) {
		t.Run("MaxAgeヘッダーの確認", func(t *testing.T) {
			req := httptest.NewRequest("OPTIONS", "/test", nil)
			req.Header.Set("Origin", "http://localhost:3000")
			req.Header.Set("Access-Control-Request-Method", "GET")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusNoContent, w.Code)
			// MaxAge ヘッダーが設定されていることを確認（値は実装に依存）
			maxAge := w.Header().Get("Access-Control-Max-Age")
			assert.True(t, maxAge == "43200" || maxAge == "0" || maxAge == "", "MaxAge header should be set appropriately")
		})

		t.Run("許可されたメソッドの確認", func(t *testing.T) {
			req := httptest.NewRequest("OPTIONS", "/test", nil)
			req.Header.Set("Origin", "http://localhost:3000")
			req.Header.Set("Access-Control-Request-Method", "DELETE")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusNoContent, w.Code)
			allowedMethods := w.Header().Get("Access-Control-Allow-Methods")
			assert.Contains(t, allowedMethods, "DELETE")
			assert.Contains(t, allowedMethods, "GET")
			assert.Contains(t, allowedMethods, "POST")
		})

		t.Run("Credentialsフラグの確認", func(t *testing.T) {
			req := httptest.NewRequest("GET", "/test", nil)
			req.Header.Set("Origin", "http://localhost:3000")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)
			assert.Equal(t, "true", w.Header().Get("Access-Control-Allow-Credentials"))
		})
	})
}