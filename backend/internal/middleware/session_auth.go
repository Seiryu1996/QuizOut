package middleware

import (
	"log"
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"quiz-app/internal/domain"
	"quiz-app/internal/repository"
)

// SessionAuthMiddleware セッションベース認証ミドルウェア
func SessionAuthMiddleware(userRepo repository.UserRepository) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		session := sessions.Default(c)
		userIDInterface := session.Get("user_id")
		if userIDInterface == nil {
			log.Printf("SessionAuth: No user_id in session")
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "USER_AUTH_REQUIRED",
					"message": "ユーザー認証が必要です",
				},
			})
			c.Abort()
			return
		}

		userID, ok := userIDInterface.(string)
		if !ok {
			log.Printf("SessionAuth: Invalid user_id type: %T", userIDInterface)
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "INVALID_SESSION",
					"message": "無効なセッションです",
				},
			})
			c.Abort()
			return
		}

		log.Printf("SessionAuth: Found user_id in session: %s", userID)

		// ユーザー情報を取得
		user, err := userRepo.GetByID(c.Request.Context(), userID)
		if err != nil {
			log.Printf("SessionAuth: User not found: %s, error: %v", userID, err)
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "USER_NOT_FOUND",
					"message": "ユーザーが見つかりません",
				},
			})
			c.Abort()
			return
		}

		log.Printf("SessionAuth: User authenticated: %s (%s)", user.Username, user.ID)

		// ユーザー情報をコンテキストに設定
		c.Set("user", user)
		c.Set("user_id", userID)
		c.Next()
	})
}

// AdminSessionMiddleware 管理者セッション認証ミドルウェア
func AdminSessionMiddleware(userRepo repository.UserRepository) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		session := sessions.Default(c)
		userIDInterface := session.Get("user_id")
		if userIDInterface == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "ログインが必要です"})
			c.Abort()
			return
		}

		userID, ok := userIDInterface.(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "無効なセッションです"})
			c.Abort()
			return
		}

		// ユーザー情報を取得
		user, err := userRepo.GetByID(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "ユーザーが見つかりません"})
			c.Abort()
			return
		}

		// 管理者権限チェック
		if !user.IsAdmin() {
			c.JSON(http.StatusForbidden, gin.H{"error": "管理者権限が必要です"})
			c.Abort()
			return
		}

		// ユーザー情報をコンテキストに設定
		c.Set("user", user)
		c.Set("user_id", userID)
		c.Next()
	})
}