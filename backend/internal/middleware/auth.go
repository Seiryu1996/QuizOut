package middleware

import (
	"context"
	"log"
	"net/http"
	"os"
	"quiz-app/pkg/utils"
	"strings"

	"firebase.google.com/go/v4/auth"
	"github.com/gin-gonic/gin"
)

type AuthMiddleware struct {
	authClient *auth.Client
}

func NewAuthMiddleware(authClient *auth.Client) *AuthMiddleware {
	return &AuthMiddleware{
		authClient: authClient,
	}
}

func (a *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 開発環境でエミュレータを使用している場合は認証をスキップ
		environment := os.Getenv("ENVIRONMENT")
		authEmulatorHost := os.Getenv("FIREBASE_AUTH_EMULATOR_HOST")
		log.Printf("RequireAuth: Environment=%s, AuthEmulatorHost=%s", environment, authEmulatorHost)
		if (environment == "development" || environment == "") && authEmulatorHost != "" {
			log.Printf("Development mode with emulator: Skipping auth check")
			// ダミーのユーザー情報を設定
			c.Set("userID", "dev_user")
			c.Set("userClaims", map[string]interface{}{
				"role": "user",
			})
			c.Next()
			return
		}

		token := extractToken(c)
		if token == "" {
			log.Printf("Auth failed: Missing authentication token")
			utils.UnauthorizedError(c, "Missing authentication token")
			c.Abort()
			return
		}

		idToken, err := a.authClient.VerifyIDToken(context.Background(), token)
		if err != nil {
			log.Printf("Auth failed: Invalid authentication token: %v", err)
			utils.UnauthorizedError(c, "Invalid authentication token")
			c.Abort()
			return
		}

		// ユーザー情報をコンテキストに設定
		log.Printf("Auth success: User %s authenticated", idToken.UID)
		c.Set("userID", idToken.UID)
		c.Set("userClaims", idToken.Claims)
		c.Next()
	}
}

func (a *AuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractToken(c)
		if token != "" {
			idToken, err := a.authClient.VerifyIDToken(context.Background(), token)
			if err == nil {
				c.Set("userID", idToken.UID)
				c.Set("userClaims", idToken.Claims)
			}
		}
		c.Next()
	}
}

func (a *AuthMiddleware) RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 開発環境では管理者権限チェックをスキップ
		environment := os.Getenv("ENVIRONMENT")
		authEmulatorHost := os.Getenv("FIREBASE_AUTH_EMULATOR_HOST")
		if (environment == "development" || environment == "") && authEmulatorHost != "" {
			log.Printf("Development mode with emulator: Skipping admin check")
			// ダミーのユーザー情報を設定
			c.Set("userID", "dev_admin_user")
			c.Set("userClaims", map[string]interface{}{
				"role": "admin",
			})
			c.Next()
			return
		}

		userClaims, exists := c.Get("userClaims")
		if !exists {
			utils.UnauthorizedError(c, "Authentication required")
			c.Abort()
			return
		}

		claims, ok := userClaims.(map[string]interface{})
		if !ok {
			utils.UnauthorizedError(c, "Invalid user claims")
			c.Abort()
			return
		}

		// 管理者権限チェック（カスタムクレームを使用）
		if role, exists := claims["role"]; !exists || role != "admin" {
			utils.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "Admin access required")
			c.Abort()
			return
		}

		c.Next()
	}
}

func extractToken(c *gin.Context) string {
	bearerToken := c.GetHeader("Authorization")
	if bearerToken != "" && strings.HasPrefix(bearerToken, "Bearer ") {
		return strings.TrimPrefix(bearerToken, "Bearer ")
	}

	// クエリパラメータからも確認
	return c.Query("token")
}

func GetUserID(c *gin.Context) (string, bool) {
	userID, exists := c.Get("userID")
	if !exists {
		return "", false
	}
	
	uid, ok := userID.(string)
	return uid, ok
}

func GetUserClaims(c *gin.Context) (map[string]interface{}, bool) {
	userClaims, exists := c.Get("userClaims")
	if !exists {
		return nil, false
	}
	
	claims, ok := userClaims.(map[string]interface{})
	return claims, ok
}