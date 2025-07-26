package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"

	"cloud.google.com/go/firestore"
	"golang.org/x/crypto/bcrypt"
	"quiz-app/internal/domain"
)

// UserRepository インターフェースはinterfaces.goで定義済み

// FirebaseUserRepository Firebaseを使用したユーザーリポジトリ
type FirebaseUserRepository struct {
	client *firestore.Client
}

// NewFirebaseUserRepository 新しいFirebaseユーザーリポジトリを作成
func NewFirebaseUserRepository(client *firestore.Client) UserRepository {
	return &FirebaseUserRepository{
		client: client,
	}
}

// Create ユーザーを作成
func (r *FirebaseUserRepository) Create(ctx context.Context, user *domain.User) error {
	_, err := r.client.Collection("users").Doc(user.ID).Set(ctx, user)
	return err
}

// GetByID ユーザーを取得
func (r *FirebaseUserRepository) GetByID(ctx context.Context, userID string) (*domain.User, error) {
	doc, err := r.client.Collection("users").Doc(userID).Get(ctx)
	if err != nil {
		return nil, err
	}

	var user domain.User
	if err := doc.DataTo(&user); err != nil {
		return nil, err
	}

	return &user, nil
}

// GetByEmail メールアドレスでユーザーを取得
func (r *FirebaseUserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	iter := r.client.Collection("users").Where("email", "==", email).Limit(1).Documents(ctx)
	doc, err := iter.Next()
	if err != nil {
		return nil, err
	}

	var user domain.User
	if err := doc.DataTo(&user); err != nil {
		return nil, err
	}

	return &user, nil
}

// Update ユーザーを更新
func (r *FirebaseUserRepository) Update(ctx context.Context, user *domain.User) error {
	_, err := r.client.Collection("users").Doc(user.ID).Set(ctx, user)
	return err
}

// Delete ユーザーを削除
func (r *FirebaseUserRepository) Delete(ctx context.Context, userID string) error {
	_, err := r.client.Collection("users").Doc(userID).Delete(ctx)
	return err
}

// CreateWithPassword パスワード付きでユーザーを作成
func (r *FirebaseUserRepository) CreateWithPassword(ctx context.Context, user *domain.User, password string) error {
	// パスワードをハッシュ化
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// ユーザー情報とパスワードを保存
	batch := r.client.Batch()
	
	// ユーザー情報
	userRef := r.client.Collection("users").Doc(user.ID)
	batch.Set(userRef, user)
	
	// パスワード情報（別コレクション）
	passwordRef := r.client.Collection("user_passwords").Doc(user.ID)
	batch.Set(passwordRef, map[string]interface{}{
		"username":     user.Username,
		"passwordHash": string(hashedPassword),
	})

	_, err = batch.Commit(ctx)
	return err
}

// GetByUsername ユーザー名でユーザーを取得
func (r *FirebaseUserRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	iter := r.client.Collection("users").Where("username", "==", username).Limit(1).Documents(ctx)
	doc, err := iter.Next()
	if err != nil {
		return nil, err
	}

	var user domain.User
	if err := doc.DataTo(&user); err != nil {
		return nil, err
	}

	return &user, nil
}

// ValidateUserCredentials ユーザー認証情報を検証
func (r *FirebaseUserRepository) ValidateUserCredentials(ctx context.Context, username, password string) (*domain.User, error) {
	// パスワード情報を取得
	passwordDoc, err := r.client.Collection("user_passwords").Where("username", "==", username).Limit(1).Documents(ctx).Next()
	if err != nil {
		return nil, errors.New("user not found")
	}

	var passwordData struct {
		Username     string `firestore:"username"`
		PasswordHash string `firestore:"passwordHash"`
	}
	if err := passwordDoc.DataTo(&passwordData); err != nil {
		return nil, err
	}

	// パスワード検証
	if err := bcrypt.CompareHashAndPassword([]byte(passwordData.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	// ユーザー情報を取得
	return r.GetByUsername(ctx, username)
}

// BulkCreateUsers 一括ユーザー作成
func (r *FirebaseUserRepository) BulkCreateUsers(ctx context.Context, users []UserCredentials) error {
	batch := r.client.Batch()

	for _, userCred := range users {
		// ユーザーID生成
		userID := generateUserID()

		// ユーザー作成
		user := &domain.User{
			ID:          userID,
			Username:    userCred.Username,
			DisplayName: userCred.DisplayName,
		}

		// パスワードハッシュ化
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(userCred.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		// ユーザー情報
		userRef := r.client.Collection("users").Doc(userID)
		batch.Set(userRef, user)

		// パスワード情報
		passwordRef := r.client.Collection("user_passwords").Doc(userID)
		batch.Set(passwordRef, map[string]interface{}{
			"username":     userCred.Username,
			"passwordHash": string(hashedPassword),
		})
	}

	_, err := batch.Commit(ctx)
	return err
}

// GetUserByAccessCode アクセスコードでユーザーを検索
func (r *FirebaseUserRepository) GetUserByAccessCode(ctx context.Context, accessCode string) (*domain.User, error) {
	iter := r.client.Collection("users").Where("accessCode", "==", accessCode).Limit(1).Documents(ctx)
	doc, err := iter.Next()
	if err != nil {
		return nil, err
	}

	var user domain.User
	if err := doc.DataTo(&user); err != nil {
		return nil, err
	}

	return &user, nil
}

// generateUserID ユーザーIDを生成
func generateUserID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return "user_" + hex.EncodeToString(bytes)[:16]
}
