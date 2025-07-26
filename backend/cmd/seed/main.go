package main

import (
	"context"
	"log"
	"os"

	"cloud.google.com/go/firestore"
	"quiz-app/internal/repository"
	"quiz-app/internal/usecase"
	"quiz-app/pkg/config"
)

func main() {
	log.Println("Starting database seeding...")

	// 設定読み込み
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Firestoreクライアント初期化
	ctx := context.Background()
	
	// Firebase emulator設定
	if emulatorHost := os.Getenv("FIRESTORE_EMULATOR_HOST"); emulatorHost != "" {
		log.Printf("Using Firestore emulator at %s", emulatorHost)
		os.Setenv("GOOGLE_CLOUD_PROJECT", "quiz-app-test")
	}

	client, err := firestore.NewClient(ctx, cfg.Firebase.ProjectID)
	if err != nil {
		log.Fatalf("Failed to create Firestore client: %v", err)
	}
	defer client.Close()

	// リポジトリ初期化
	userRepo := repository.NewFirebaseUserRepository(client)
	accessCodeRepo := repository.NewFileAccessCodeRepository(cfg.AccessCode.FilePath)
	authUseCase := usecase.NewAuthUseCase(accessCodeRepo, userRepo)

	// 初期ユーザーデータ
	initialUsers := []repository.UserCredentials{
		{
			Username:    "admin",
			Password:    "admin123",
			DisplayName: "システム管理者",
		},
		{
			Username:    "manager",
			Password:    "manager123",
			DisplayName: "イベント管理者",
		},
		{
			Username:    "user1",
			Password:    "user123",
			DisplayName: "参加者1",
		},
		{
			Username:    "user2",
			Password:    "user456",
			DisplayName: "参加者2",
		},
		{
			Username:    "testuser",
			Password:    "password123",
			DisplayName: "テストユーザー",
		},
		{
			Username:    "demo1",
			Password:    "demo123",
			DisplayName: "デモユーザー1",
		},
		{
			Username:    "demo2",
			Password:    "demo456",
			DisplayName: "デモユーザー2",
		},
		{
			Username:    "guest1",
			Password:    "guest123",
			DisplayName: "ゲスト1",
		},
		{
			Username:    "guest2",
			Password:    "guest456",
			DisplayName: "ゲスト2",
		},
		{
			Username:    "participant1",
			Password:    "part123",
			DisplayName: "参加者A",
		},
	}

	// 既存ユーザーチェック
	log.Println("Checking for existing users...")
	for _, user := range initialUsers {
		existingUser, err := userRepo.GetByUsername(ctx, user.Username)
		if err == nil && existingUser != nil {
			log.Printf("User %s already exists, skipping...", user.Username)
			continue
		}

		// ユーザー作成
		log.Printf("Creating user: %s (%s)", user.Username, user.DisplayName)
		createdUser, err := authUseCase.CreateUser(ctx, user.Username, user.Password, user.DisplayName)
		if err != nil {
			log.Printf("Failed to create user %s: %v", user.Username, err)
			continue
		}
		log.Printf("Successfully created user: %s (ID: %s)", createdUser.Username, createdUser.ID)
	}

	// アクセスコード確認
	log.Println("\nVerifying access codes...")
	validCodes, err := authUseCase.GetValidAccessCodes(ctx)
	if err != nil {
		log.Printf("Failed to get valid access codes: %v", err)
	} else {
		log.Printf("Available access codes: %v", validCodes)
	}

	// 作成されたユーザーの確認
	log.Println("\nVerifying created users...")
	for _, user := range initialUsers {
		if createdUser, err := userRepo.GetByUsername(ctx, user.Username); err == nil {
			log.Printf("✓ %s (ID: %s, Display: %s)", 
				createdUser.Username, 
				createdUser.ID, 
				createdUser.DisplayName)
		}
	}

	log.Println("\n🎉 Database seeding completed successfully!")
	log.Println("\n📋 You can now login with:")
	log.Println("   Admin: admin/admin123")
	log.Println("   Manager: manager/manager123") 
	log.Println("   Test User: testuser/password123")
	log.Println("   Demo Users: demo1/demo123, demo2/demo456")
	log.Println("\n🔑 Available access codes:")
	for _, code := range validCodes {
		log.Printf("   - %s", code)
	}
}