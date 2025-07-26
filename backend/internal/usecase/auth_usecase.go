package usecase

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log"
	"time"

	"quiz-app/internal/domain"
	"quiz-app/internal/repository"
)

// AuthUseCase 認証ユースケースインターフェース
type AuthUseCase interface {
	VerifyAccessCode(ctx context.Context, accessCode string) (bool, error)
	AuthenticateUser(ctx context.Context, username, password string) (*domain.User, error)
	CreateUser(ctx context.Context, username, password, displayName string) (*domain.User, error)
	BulkCreateUsers(ctx context.Context, users []repository.UserCredentials) error
	GetAllUsers(ctx context.Context) ([]*domain.User, error)
	GetUserByID(ctx context.Context, userID string) (*domain.User, error)
	DeleteUser(ctx context.Context, userID string) error
	LogLoginAttempt(ctx context.Context, identifier string, success bool, userAgent, ipAddress string) error
	GetValidAccessCodes(ctx context.Context) ([]string, error)
}


// authUseCase 認証ユースケースの実装
type authUseCase struct {
	accessCodeRepo repository.AccessCodeRepository
	userRepo       repository.UserRepository
}

// NewAuthUseCase 新しい認証ユースケースを作成
func NewAuthUseCase(
	accessCodeRepo repository.AccessCodeRepository,
	userRepo repository.UserRepository,
) AuthUseCase {
	return &authUseCase{
		accessCodeRepo: accessCodeRepo,
		userRepo:       userRepo,
	}
}

// VerifyAccessCode アクセスコードの検証
func (u *authUseCase) VerifyAccessCode(ctx context.Context, accessCode string) (bool, error) {
	if accessCode == "" {
		return false, errors.New("access code cannot be empty")
	}

	isValid, err := u.accessCodeRepo.IsValidAccessCode(ctx, accessCode)
	if err != nil {
		log.Printf("Failed to verify access code: %v", err)
		return false, err
	}

	return isValid, nil
}

// AuthenticateUser ユーザー名・パスワードによる認証
func (u *authUseCase) AuthenticateUser(ctx context.Context, username, password string) (*domain.User, error) {
	if username == "" || password == "" {
		return nil, errors.New("username and password cannot be empty")
	}

	user, err := u.userRepo.ValidateUserCredentials(ctx, username, password)
	if err != nil {
		log.Printf("Authentication failed for user %s: %v", username, err)
		return nil, errors.New("invalid credentials")
	}

	// 最終ログイン時刻を更新
	user.LastLoginAt = time.Now()
	err = u.userRepo.Update(ctx, user)
	if err != nil {
		log.Printf("Failed to update last login time for user %s: %v", username, err)
		// エラーログのみで続行
	}

	return user, nil
}

// CreateUser ユーザー作成（管理者用）
func (u *authUseCase) CreateUser(ctx context.Context, username, password, displayName string) (*domain.User, error) {
	if username == "" || password == "" || displayName == "" {
		return nil, errors.New("username, password, and displayName cannot be empty")
	}

	// 既存ユーザーチェック
	existingUser, err := u.userRepo.GetByUsername(ctx, username)
	if err == nil && existingUser != nil {
		return nil, errors.New("username already exists")
	}

	// ユーザー作成
	user := &domain.User{
		ID:          generateUserID(),
		Username:    username,
		DisplayName: displayName,
		CreatedAt:   time.Now(),
		LastLoginAt: time.Time{},
	}

	err = u.userRepo.CreateWithPassword(ctx, user, password)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// BulkCreateUsers 一括ユーザー作成（CSV登録用）
func (u *authUseCase) BulkCreateUsers(ctx context.Context, users []repository.UserCredentials) error {
	if len(users) == 0 {
		return errors.New("no users to create")
	}

	// バリデーション
	for _, user := range users {
		if user.Username == "" || user.Password == "" || user.DisplayName == "" {
			return errors.New("all fields (username, password, displayName) are required")
		}
	}

	return u.userRepo.BulkCreateUsers(ctx, users)
}

// CreateUser アクセスコード検証後のユーザー作成（廃止予定）
func (u *authUseCase) CreateUserDeprecated(ctx context.Context, name, accessCode string) (*domain.User, error) {
	// アクセスコードの再検証
	isValid, err := u.VerifyAccessCode(ctx, accessCode)
	if err != nil {
		return nil, err
	}
	if !isValid {
		return nil, errors.New("invalid access code")
	}

	// ユーザー作成
	user, err := domain.NewUser(name, accessCode)
	if err != nil {
		return nil, err
	}

	// ユーザー保存
	err = u.userRepo.Create(ctx, user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// LogLoginAttempt ログイン試行のログ記録
func (u *authUseCase) LogLoginAttempt(ctx context.Context, accessCode string, success bool, userAgent, ipAddress string) error {
	status := "SUCCESS"
	if !success {
		status = "FAILED"
	}

	log.Printf("Login attempt - Code: %s, Status: %s, UserAgent: %s, IP: %s, Time: %s",
		accessCode, status, userAgent, ipAddress, time.Now().Format(time.RFC3339))

	// 未来の実装: ログをデータベースに保存
	// TODO: ログエントリをデータベースに保存する実装を追加

	return nil
}

// GetAllUsers 全ユーザーの取得（管理者用）
func (u *authUseCase) GetAllUsers(ctx context.Context) ([]*domain.User, error) {
	return u.userRepo.GetAll(ctx)
}

// GetUserByID IDでユーザーを取得
func (u *authUseCase) GetUserByID(ctx context.Context, userID string) (*domain.User, error) {
	return u.userRepo.GetByID(ctx, userID)
}

// DeleteUser ユーザー削除（管理者用）
func (u *authUseCase) DeleteUser(ctx context.Context, userID string) error {
	if userID == "" {
		return errors.New("user ID cannot be empty")
	}

	// ユーザーが存在するかチェック
	user, err := u.userRepo.GetByID(ctx, userID)
	if err != nil {
		return errors.New("user not found")
	}
	if user == nil {
		return errors.New("user not found")
	}

	return u.userRepo.Delete(ctx, userID)
}

// GetValidAccessCodes 有効なアクセスコード一覧を取得（管理者用）
func (u *authUseCase) GetValidAccessCodes(ctx context.Context) ([]string, error) {
	return u.accessCodeRepo.GetValidCodes(ctx)
}

// generateUserID ユーザーIDを生成
func generateUserID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return "user_" + hex.EncodeToString(bytes)[:16]
}
