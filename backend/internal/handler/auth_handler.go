package handler

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"quiz-app/internal/repository"
	"quiz-app/internal/usecase"
)

// AuthHandler 認証ハンドラー
type AuthHandler struct {
	authUseCase usecase.AuthUseCase
}

// NewAuthHandler 新しい認証ハンドラーを作成
func NewAuthHandler(authUseCase usecase.AuthUseCase) *AuthHandler {
	return &AuthHandler{
		authUseCase: authUseCase,
	}
}

// VerifyAccessCodeRequest アクセスコード検証リクエスト
type VerifyAccessCodeRequest struct {
	AccessCode string `json:"accessCode" binding:"required"`
}

// VerifyAccessCodeResponse アクセスコード検証レスポンス
type VerifyAccessCodeResponse struct {
	IsValid bool   `json:"isValid"`
	Message string `json:"message"`
}

// LoginRequest ログインリクエスト
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// VerifyAccessCode アクセスコードの検証
func (h *AuthHandler) VerifyAccessCode(c *gin.Context) {
	var req VerifyAccessCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// アクセスコード検証
	isValid, err := h.authUseCase.VerifyAccessCode(c.Request.Context(), req.AccessCode)
	if err != nil {
		// ログイン試行のログ記録
		h.logLoginAttempt(c, req.AccessCode, false)
		
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Internal server error",
		})
		return
	}

	if !isValid {
		// ログイン試行のログ記録
		h.logLoginAttempt(c, req.AccessCode, false)
		
		c.JSON(http.StatusUnauthorized, VerifyAccessCodeResponse{
			IsValid: false,
			Message: "無効なアクセスコードです",
		})
		return
	}

	// 成功ログ
	h.logLoginAttempt(c, req.AccessCode, true)

	// セッションにアクセスコード情報を保存
	session := sessions.Default(c)
	session.Set("access_code", req.AccessCode)
	session.Set("access_code_verified", true)
	session.Save()

	c.JSON(http.StatusOK, VerifyAccessCodeResponse{
		IsValid: true,
		Message: "アクセスコードが確認されました",
	})
}

// Login ユーザー名・パスワードでログイン
func (h *AuthHandler) Login(c *gin.Context) {
	// アクセスコード認証済みかチェック
	session := sessions.Default(c)
	accessCodeVerified := session.Get("access_code_verified")
	if accessCodeVerified != true {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "アクセスコード認証が必要です",
		})
		return
	}

	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// ユーザー認証
	user, err := h.authUseCase.AuthenticateUser(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		// ログイン試行のログ記録
		h.logLoginAttempt(c, req.Username, false)
		
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "無効なユーザー名またはパスワードです",
		})
		return
	}

	// 成功ログ
	h.logLoginAttempt(c, req.Username, true)

	// セッションにユーザー情報を保存
	session.Set("user_id", user.ID)
	session.Set("username", user.Username)
	session.Set("display_name", user.DisplayName)
	session.Save()

	c.JSON(http.StatusOK, gin.H{
		"user": user,
		"message": "ログインが成功しました",
	})
}

// GetMe 現在のユーザー情報を取得
func (h *AuthHandler) GetMe(c *gin.Context) {
	// ミドルウェアで設定されたユーザー情報を取得
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}

// CreateUser 管理者用ユーザー作成
func (h *AuthHandler) CreateUser(c *gin.Context) {
	var req struct {
		Username    string `json:"username" binding:"required"`
		Password    string `json:"password" binding:"required"`
		DisplayName string `json:"displayName" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	user, err := h.authUseCase.CreateUser(c.Request.Context(), req.Username, req.Password, req.DisplayName)
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			c.JSON(http.StatusConflict, gin.H{
				"error": "ユーザー名が既に存在します",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "ユーザー作成に失敗しました",
			})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"user":    user,
		"message": "ユーザーが作成されました",
	})
}

// BulkCreateUsers CSV一括ユーザー作成
func (h *AuthHandler) BulkCreateUsers(c *gin.Context) {
	var req struct {
		Users []repository.UserCredentials `json:"users" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	err := h.authUseCase.BulkCreateUsers(c.Request.Context(), req.Users)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "一括ユーザー作成に失敗しました",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": fmt.Sprintf("%d人のユーザーが作成されました", len(req.Users)),
		"count":   len(req.Users),
	})
}

// logLoginAttempt ログイン試行のログ記録
func (h *AuthHandler) logLoginAttempt(c *gin.Context, accessCode string, success bool) {
	userAgent := c.GetHeader("User-Agent")
	ipAddress := c.ClientIP()
	
	err := h.authUseCase.LogLoginAttempt(c.Request.Context(), accessCode, success, userAgent, ipAddress)
	if err != nil {
		// ログ記録に失敗してもメインの処理は継続
		// ログにエラーを記録するだけ
	}
}
