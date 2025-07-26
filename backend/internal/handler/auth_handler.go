package handler

import (
	"encoding/json"
	"fmt"
	"log"
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

	// 生のJSONボディを直接読み取り
	body, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Failed to read request body",
		})
		return
	}

	// json.Unmarshalを使用してパース
	var requestData map[string]interface{}
	if err := json.Unmarshal(body, &requestData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid JSON format",
		})
		return
	}

	// 手動でフィールドを抽出・検証
	username, usernameExists := requestData["username"].(string)
	password, passwordExists := requestData["password"].(string)

	if !usernameExists || !passwordExists || username == "" || password == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "username and password are required",
		})
		return
	}

	// ユーザー認証
	user, err := h.authUseCase.AuthenticateUser(c.Request.Context(), username, password)
	if err != nil {
		// ログイン試行のログ記録
		h.logLoginAttempt(c, username, false)
		
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "無効なユーザー名またはパスワードです",
		})
		return
	}

	// 成功ログ
	h.logLoginAttempt(c, username, true)

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
	log.Printf("=== GetMe function called ===")
	// セッションから直接ユーザー情報を取得
	session := sessions.Default(c)
	userIDInterface := session.Get("user_id")
	log.Printf("GetMe: Session user_id = %v", userIDInterface)
	
	if userIDInterface == nil {
		log.Printf("GetMe: No user_id in session")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	userID, ok := userIDInterface.(string)
	if !ok {
		log.Printf("GetMe: Invalid user_id type: %T", userIDInterface)
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid session",
		})
		return
	}

	// ユーザー情報を取得
	user, err := h.authUseCase.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		log.Printf("GetMe: User not found: %s, error: %v", userID, err)
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not found",
		})
		return
	}

	log.Printf("GetMe: User found: %s (%s)", user.Username, user.ID)

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

// GetUsers 管理者用ユーザー一覧取得
func (h *AuthHandler) GetUsers(c *gin.Context) {
	users, err := h.authUseCase.GetAllUsers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "ユーザー一覧の取得に失敗しました",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users": users,
		"count": len(users),
	})
}

// DeleteUser 管理者用ユーザー削除
func (h *AuthHandler) DeleteUser(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ユーザーIDが必要です",
		})
		return
	}

	err := h.authUseCase.DeleteUser(c.Request.Context(), userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "ユーザーが見つかりません",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "ユーザーの削除に失敗しました",
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "ユーザーが削除されました",
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
