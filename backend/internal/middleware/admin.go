package middleware

import (
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"quiz-app/internal/domain"
	"quiz-app/internal/repository"
)

// AdminMiddleware 管理者権限チェックミドルウェア
func AdminMiddleware(userRepo repository.UserRepository) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		session := sessions.Default(c)
		
		// セッションからユーザーIDを取得
		userIDInterface := session.Get("user_id")
		if userIDInterface == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "ログインが必要です",
			})
			c.Abort()
			return
		}

		userID, ok := userIDInterface.(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "invalid_session",
				"message": "無効なセッションです",
			})
			c.Abort()
			return
		}

		// ユーザー情報を取得
		user, err := userRepo.GetByID(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "user_not_found",
				"message": "ユーザーが見つかりません",
			})
			c.Abort()
			return
		}

		// 管理者権限チェック
		if !user.IsAdmin() {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "insufficient_permissions",
				"message": "管理者権限が必要です",
			})
			c.Abort()
			return
		}

		// コンテキストにユーザー情報を設定
		c.Set("current_user", user)
		c.Next()
	})
}

// ManagerMiddleware マネージャー権限チェックミドルウェア
func ManagerMiddleware(userRepo repository.UserRepository) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		session := sessions.Default(c)
		
		// セッションからユーザーIDを取得
		userIDInterface := session.Get("user_id")
		if userIDInterface == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "ログインが必要です",
			})
			c.Abort()
			return
		}

		userID, ok := userIDInterface.(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "invalid_session",
				"message": "無効なセッションです",
			})
			c.Abort()
			return
		}

		// ユーザー情報を取得
		user, err := userRepo.GetByID(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "user_not_found",
				"message": "ユーザーが見つかりません",
			})
			c.Abort()
			return
		}

		// マネージャー権限チェック
		if !user.HasManagerAccess() {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "insufficient_permissions",
				"message": "マネージャー権限が必要です",
			})
			c.Abort()
			return
		}

		// コンテキストにユーザー情報を設定
		c.Set("current_user", user)
		c.Next()
	})
}

// GetCurrentUser コンテキストから現在のユーザーを取得するヘルパー関数
func GetCurrentUser(c *gin.Context) (*domain.User, bool) {
	user, exists := c.Get("current_user")
	if !exists {
		return nil, false
	}
	
	domainUser, ok := user.(*domain.User)
	return domainUser, ok
}