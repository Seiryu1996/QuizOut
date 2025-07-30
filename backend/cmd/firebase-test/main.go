package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"quiz-app/internal/repository"
	"quiz-app/pkg/config"

	"quiz-app/internal/domain"
)

func main() {
	// 設定読み込み
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	fmt.Printf("Environment: %s\n", cfg.Server.Environment)
	fmt.Printf("Firebase Project ID: %s\n", cfg.Firebase.ProjectID)
	
	// Firebase Emulatorの設定確認
	if emulatorHost := os.Getenv("FIRESTORE_EMULATOR_HOST"); emulatorHost != "" {
		fmt.Printf("Firestore Emulator Host: %s\n", emulatorHost)
	} else {
		fmt.Println("Firestore Emulator: Disabled (本番Firebase使用)")
	}

	if authEmulatorHost := os.Getenv("FIREBASE_AUTH_EMULATOR_HOST"); authEmulatorHost != "" {
		fmt.Printf("Firebase Auth Emulator Host: %s\n", authEmulatorHost)
	} else {
		fmt.Println("Firebase Auth Emulator: Disabled (本番Firebase使用)")
	}

	// Firebase初期化
	ctx := context.Background()
	
	firebaseClient, err := repository.NewFirebaseClient(ctx, cfg)
	if err != nil {
		log.Fatalf("Failed to initialize Firebase client: %v", err)
	}
	defer firebaseClient.Close()

	fmt.Println("Firebase connection established successfully!")

	// 簡単な書き込み・読み込みテスト
	testSession := domain.NewSession(
		"Firebase接続テスト",
		10,
		domain.Settings{
			TimeLimit:      30,
			RevivalEnabled: false,
			RevivalCount:   0,
		},
	)

	// 書き込みテスト
	fmt.Println("Testing Firestore write...")
	err = firebaseClient.SessionRepo.Create(ctx, testSession)
	if err != nil {
		log.Fatalf("Failed to create test session: %v", err)
	}
	fmt.Printf("Test session created successfully with ID: %s\n", testSession.ID)

	// 読み込みテスト
	fmt.Println("Testing Firestore read...")
	retrievedSession, err := firebaseClient.SessionRepo.GetByID(ctx, testSession.ID)
	if err != nil {
		log.Fatalf("Failed to retrieve test session: %v", err)
	}
	fmt.Printf("Test session retrieved successfully: %s\n", retrievedSession.Title)

	// クリーンアップ
	fmt.Println("Cleaning up test data...")
	err = firebaseClient.SessionRepo.Delete(ctx, testSession.ID)
	if err != nil {
		log.Printf("Warning: Failed to clean up test session: %v", err)
	} else {
		fmt.Println("Test session cleaned up successfully")
	}

	fmt.Println("✅ Firebase connection test completed successfully!")
	fmt.Println("System is ready to use GCP Firebase in production!")
}