package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"quiz-app/internal/handler"
	"quiz-app/internal/middleware"
	"quiz-app/internal/repository"
	"quiz-app/internal/service"
	"quiz-app/internal/usecase"
	"quiz-app/internal/websocket"
	"quiz-app/pkg/config"
	"syscall"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
)

func main() {
	// 設定読み込み
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Firebase初期化
	ctx := context.Background()
	
	// Repository と UseCase の初期化用にFirebaseClientを初期化
	firebaseClient, err := repository.NewFirebaseClient(ctx, cfg)
	if err != nil {
		log.Fatalf("Failed to initialize Firebase client: %v", err)
	}
	defer firebaseClient.Close()

	// WebSocket マネージャー初期化
	wsManager := websocket.NewManager()

	// Gin エンジン設定
	if cfg.Server.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// セッション設定
	store := cookie.NewStore([]byte("quiz-app-secret-key"))
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 7, // 7日間
		HttpOnly: true,
		Secure:   cfg.Server.Environment == "production",
		SameSite: http.SameSiteLaxMode,
	})
	router.Use(sessions.Sessions("quiz-session", store))

	// ミドルウェア設定
	router.Use(middleware.Logger())
	router.Use(middleware.Recovery())
	router.Use(middleware.ErrorHandler())
	router.Use(middleware.CORS(cfg))

	// 認証ミドルウェア
	authMiddleware := middleware.NewAuthMiddleware(firebaseClient.Auth)
	
	// アクセスコード認証の初期化
	accessCodeRepo := repository.NewFileAccessCodeRepository("/app/configs/access_codes.txt")
	authUseCase := usecase.NewAuthUseCase(accessCodeRepo, firebaseClient.UserRepo)
	authHandler := handler.NewAuthHandler(authUseCase)
	accessCodeMiddleware := middleware.NewAccessCodeMiddleware(authUseCase)

	// ヘルスチェック
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"timestamp": time.Now().Unix(),
		})
	})

	// WebSocket エンドポイント
	router.GET("/ws", authMiddleware.OptionalAuth(), func(c *gin.Context) {
		userID, _ := middleware.GetUserID(c)
		if userID == "" {
			userID = "anonymous_" + generateRandomID()
		}

		sessionID := c.Query("sessionId")
		displayName := c.Query("displayName")
		if displayName == "" {
			displayName = "匿名ユーザー"
		}

		// 管理者権限チェック
		isAdmin := false
		if claims, exists := middleware.GetUserClaims(c); exists {
			if role, ok := claims["role"].(string); ok && role == "admin" {
				isAdmin = true
			}
		}

		err := wsManager.HandleWebSocket(c.Writer, c.Request, userID, sessionID, displayName, isAdmin)
		if err != nil {
			log.Printf("WebSocket error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "WebSocket connection failed"})
		}
	})

	// AI Service 初期化
	aiService, err := service.NewAIService(cfg)
	if err != nil {
		log.Printf("Failed to initialize AI service: %v", err)
		// テスト環境では続行
		aiService = nil
	}

	// UseCase 初期化
	sessionUseCase := usecase.NewSessionUseCase(
		firebaseClient.SessionRepo,
		firebaseClient.ParticipantRepo,
		firebaseClient.UserRepo,
		wsManager,
	)

	userUseCase := usecase.NewUserUseCase(firebaseClient.UserRepo)

	quizUseCase := usecase.NewQuizUseCase(
		firebaseClient.SessionRepo,
		firebaseClient.ParticipantRepo,
		firebaseClient.QuestionRepo,
		firebaseClient.AnswerRepo,
		aiService,
		wsManager,
	)

	adminUseCase := usecase.NewAdminUseCase(
		firebaseClient.SessionRepo,
		firebaseClient.ParticipantRepo,
		firebaseClient.QuestionRepo,
		firebaseClient.AnswerRepo,
		wsManager,
	)

	// Handler 初期化
	sessionHandler := handler.NewSessionHandler(sessionUseCase, userUseCase)
	quizHandler := handler.NewQuizHandler(quizUseCase, sessionUseCase)
	adminHandler := handler.NewAdminHandler(sessionUseCase, adminUseCase)

	// API ルート
	v1 := router.Group("/api/v1")
	{
		// アクセスコード認証エンドポイント
		auth := v1.Group("/auth")
		{
			auth.POST("/verify-access-code", authHandler.VerifyAccessCode)
			auth.POST("/login", authHandler.Login)
			auth.GET("/me", accessCodeMiddleware.RequireUserAuth(), authHandler.GetMe)
		}

		// 管理者専用エンドポイント（新しい認証システム）
		adminAuth := v1.Group("/admin")
		adminAuth.Use(accessCodeMiddleware.RequireUserAuth())
		adminAuth.Use(middleware.AdminMiddleware(firebaseClient.UserRepo))
		{
			// ユーザー管理
			adminAuth.GET("/users", authHandler.GetUsers)
			adminAuth.POST("/users", authHandler.CreateUser)
			adminAuth.DELETE("/users/:id", authHandler.DeleteUser)
			adminAuth.POST("/users/bulk", authHandler.BulkCreateUsers)
		}
		
		// 認証不要のエンドポイント
		v1.GET("/sessions/:id/info", sessionHandler.GetSessionInfo)
		v1.GET("/sessions/:id/status", sessionHandler.GetSessionStatus)

		// 認証必要のエンドポイント（Firebase認証）
		authRequired := v1.Group("")
		authRequired.Use(authMiddleware.RequireAuth())
		{
			// セッション関連
			authRequired.POST("/sessions/:id/join", sessionHandler.JoinSession)
			authRequired.GET("/sessions/:id/participants", sessionHandler.GetParticipants)

			// クイズ関連
			authRequired.GET("/sessions/:id/current-question", quizHandler.GetCurrentQuestion)
			authRequired.POST("/sessions/:id/answers", quizHandler.SubmitAnswer)
		}

		// 管理者専用のエンドポイント
		admin := v1.Group("/admin")
		admin.Use(authMiddleware.RequireAuth())
		admin.Use(authMiddleware.RequireAdmin())
		{
			// セッション管理
			admin.POST("/sessions", adminHandler.CreateSession)
			admin.PUT("/sessions/:id/control", adminHandler.ControlSession)
			admin.GET("/sessions/:id/stats", adminHandler.GetSessionStats)
			admin.GET("/sessions/:id/results", adminHandler.GetResults)
			admin.GET("/sessions/:id/export", adminHandler.ExportResults)

			// クイズ管理
			admin.POST("/sessions/:id/generate-question", quizHandler.GenerateQuestion)
			admin.POST("/sessions/:id/process-results", quizHandler.ProcessRoundResults)
			admin.POST("/sessions/:id/next-round", quizHandler.NextRound)
			admin.POST("/sessions/:id/skip-question", adminHandler.SkipQuestion)

			// 敗者復活戦
			admin.POST("/sessions/:id/revival", adminHandler.StartRevival)
		}
	}

	// サーバー起動
	srv := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      router,
		ReadTimeout:  time.Duration(cfg.Server.ReadTimeout) * time.Second,
		WriteTimeout: time.Duration(cfg.Server.WriteTimeout) * time.Second,
	}

	// グレースフルシャットダウンの設定
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	log.Printf("Server started on port %s", cfg.Server.Port)

	// シャットダウンシグナルを待機
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 
		time.Duration(cfg.Server.ShutdownTimeout)*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}

func generateRandomID() string {
	// 簡単なランダムID生成（実際の実装ではUUIDなどを使用）
	return fmt.Sprintf("anon_%d", time.Now().UnixNano())
}