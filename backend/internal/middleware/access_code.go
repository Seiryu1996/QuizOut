package middleware

import (
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"quiz-app/internal/usecase"
	"quiz-app/pkg/utils"
)

// AccessCodeMiddleware アクセスコード認証ミドルウェア
type AccessCodeMiddleware struct {
	authUseCase usecase.AuthUseCase
}

// NewAccessCodeMiddleware 新しいアクセスコードミドルウェアを作成
func NewAccessCodeMiddleware(authUseCase usecase.AuthUseCase) *AccessCodeMiddleware {
	return &AccessCodeMiddleware{
		authUseCase: authUseCase,
	}
}

// RequireAccessCode アクセスコード認証が必要なエンドポイント用
func (m *AccessCodeMiddleware) RequireAccessCode() gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		accessCodeVerified := session.Get("access_code_verified")
		accessCode := session.Get("access_code")

		if accessCodeVerified == nil || accessCodeVerified != true {
			utils.ErrorResponse(c, http.StatusUnauthorized, "ACCESS_CODE_REQUIRED", "アクセスコード認証が必要です")
			c.Abort()
			return
		}

		// コンテキストにアクセスコード情報を設定
		c.Set("accessCode", accessCode)
		c.Set("accessCodeVerified", true)
		c.Next()
	}
}

// RequireUserAuth ユーザー認証（アクセスコード + ユーザー情報）が必要なエンドポイント用
func (m *AccessCodeMiddleware) RequireUserAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		userID := session.Get("user_id")
		accessCode := session.Get("access_code")
		accessCodeVerified := session.Get("access_code_verified")

		if userID == nil || accessCode == nil || accessCodeVerified != true {
			utils.ErrorResponse(c, http.StatusUnauthorized, "USER_AUTH_REQUIRED", "ユーザー認証が必要です")
			c.Abort()
			return
		}

		// コンテキストにユーザー情報を設定
		c.Set("userID", userID)
		c.Set("accessCode", accessCode)
		c.Set("accessCodeVerified", true)
		c.Next()
	}
}

// GetAccessCode コンテキストからアクセスコードを取得
func GetAccessCode(c *gin.Context) (string, bool) {
	accessCode, exists := c.Get("accessCode")
	if !exists {
		return "", false
	}
	
	code, ok := accessCode.(string)
	return code, ok
}

// IsAccessCodeVerified アクセスコードが検証されているかを確認
func IsAccessCodeVerified(c *gin.Context) bool {
	verified, exists := c.Get("accessCodeVerified")
	if !exists {
		return false
	}
	
	is_verified, ok := verified.(bool)
	return ok && is_verified
}
