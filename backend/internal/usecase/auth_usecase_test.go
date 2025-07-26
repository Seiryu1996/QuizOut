package usecase

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"quiz-app/internal/domain"
	"quiz-app/internal/repository"
)

// MockAccessCodeRepository アクセスコードリポジトリのモック
type MockAccessCodeRepository struct {
	mock.Mock
}

func (m *MockAccessCodeRepository) LoadAccessCodes(ctx context.Context) ([]string, error) {
	args := m.Called(ctx)
	return args.Get(0).([]string), args.Error(1)
}

func (m *MockAccessCodeRepository) IsValidAccessCode(ctx context.Context, code string) (bool, error) {
	args := m.Called(ctx, code)
	return args.Bool(0), args.Error(1)
}

func (m *MockAccessCodeRepository) ReloadAccessCodes(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

func (m *MockAccessCodeRepository) GetValidCodes(ctx context.Context) ([]string, error) {
	args := m.Called(ctx)
	return args.Get(0).([]string), args.Error(1)
}

// MockUserRepository ユーザーリポジトリのモック
type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) Create(ctx context.Context, user *domain.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *MockUserRepository) CreateWithPassword(ctx context.Context, user *domain.User, password string) error {
	args := m.Called(ctx, user, password)
	return args.Error(0)
}

func (m *MockUserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockUserRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	args := m.Called(ctx, username)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockUserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockUserRepository) ValidateUserCredentials(ctx context.Context, username, password string) (*domain.User, error) {
	args := m.Called(ctx, username, password)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockUserRepository) Update(ctx context.Context, user *domain.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *MockUserRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockUserRepository) BulkCreateUsers(ctx context.Context, users []repository.UserCredentials) error {
	args := m.Called(ctx, users)
	return args.Error(0)
}

// Legacy methods for compatibility
func (m *MockUserRepository) CreateUser(ctx context.Context, user *domain.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *MockUserRepository) GetUser(ctx context.Context, userID string) (*domain.User, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockUserRepository) UpdateUser(ctx context.Context, user *domain.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *MockUserRepository) DeleteUser(ctx context.Context, userID string) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func TestAuthUseCase(t *testing.T) {
	ctx := context.Background()

	t.Run("アクセスコード検証が正常に動作すること", func(t *testing.T) {
		mockAccessCodeRepo := &MockAccessCodeRepository{}
		mockUserRepo := &MockUserRepository{}
		usecase := NewAuthUseCase(mockAccessCodeRepo, mockUserRepo)

		t.Run("有効なアクセスコードの検証", func(t *testing.T) {
			mockAccessCodeRepo.On("IsValidAccessCode", ctx, "VALID_CODE").Return(true, nil)
			
			isValid, err := usecase.VerifyAccessCode(ctx, "VALID_CODE")
			
			assert.NoError(t, err)
			assert.True(t, isValid)
			mockAccessCodeRepo.AssertExpectations(t)
		})

		t.Run("無効なアクセスコードの検証", func(t *testing.T) {
			mockAccessCodeRepo.On("IsValidAccessCode", ctx, "INVALID_CODE").Return(false, nil)
			
			isValid, err := usecase.VerifyAccessCode(ctx, "INVALID_CODE")
			
			assert.NoError(t, err)
			assert.False(t, isValid)
			mockAccessCodeRepo.AssertExpectations(t)
		})

		t.Run("空のアクセスコードでエラーになること", func(t *testing.T) {
			isValid, err := usecase.VerifyAccessCode(ctx, "")
			
			assert.Error(t, err)
			assert.False(t, isValid)
			assert.Contains(t, err.Error(), "access code cannot be empty")
		})

		t.Run("リポジトリエラー時の処理", func(t *testing.T) {
			mockAccessCodeRepo.On("IsValidAccessCode", ctx, "ERROR_CODE").Return(false, errors.New("repository error"))
			
			isValid, err := usecase.VerifyAccessCode(ctx, "ERROR_CODE")
			
			assert.Error(t, err)
			assert.False(t, isValid)
			mockAccessCodeRepo.AssertExpectations(t)
		})
	})

	t.Run("ユーザー認証が正常に動作すること", func(t *testing.T) {
		mockAccessCodeRepo := &MockAccessCodeRepository{}
		mockUserRepo := &MockUserRepository{}
		usecase := NewAuthUseCase(mockAccessCodeRepo, mockUserRepo)

		t.Run("有効な認証情報での認証成功", func(t *testing.T) {
			user := &domain.User{
				ID:          "user123",
				Username:    "testuser",
				DisplayName: "Test User",
			}
			mockUserRepo.On("ValidateUserCredentials", ctx, "testuser", "password123").Return(user, nil)
			mockUserRepo.On("Update", ctx, mock.AnythingOfType("*domain.User")).Return(nil)

			authenticatedUser, err := usecase.AuthenticateUser(ctx, "testuser", "password123")

			assert.NoError(t, err)
			assert.Equal(t, "testuser", authenticatedUser.Username)
			assert.Equal(t, "Test User", authenticatedUser.DisplayName)
			mockUserRepo.AssertExpectations(t)
		})

		t.Run("無効な認証情報での認証失敗", func(t *testing.T) {
			mockUserRepo.On("ValidateUserCredentials", ctx, "testuser", "wrongpassword").Return(nil, errors.New("invalid credentials"))

			_, err := usecase.AuthenticateUser(ctx, "testuser", "wrongpassword")

			assert.Error(t, err)
			assert.Contains(t, err.Error(), "invalid credentials")
			mockUserRepo.AssertExpectations(t)
		})

		t.Run("空のユーザー名・パスワードでエラーになること", func(t *testing.T) {
			_, err1 := usecase.AuthenticateUser(ctx, "", "password")
			_, err2 := usecase.AuthenticateUser(ctx, "username", "")

			assert.Error(t, err1)
			assert.Error(t, err2)
			assert.Contains(t, err1.Error(), "username and password cannot be empty")
			assert.Contains(t, err2.Error(), "username and password cannot be empty")
		})
	})

	t.Run("ユーザー作成が正常に動作すること", func(t *testing.T) {
		mockAccessCodeRepo := &MockAccessCodeRepository{}
		mockUserRepo := &MockUserRepository{}
		usecase := NewAuthUseCase(mockAccessCodeRepo, mockUserRepo)

		t.Run("正常なユーザー作成", func(t *testing.T) {
			mockUserRepo.On("GetByUsername", ctx, "newuser").Return(nil, errors.New("user not found"))
			mockUserRepo.On("CreateWithPassword", ctx, mock.AnythingOfType("*domain.User"), "password123").Return(nil)

			user, err := usecase.CreateUser(ctx, "newuser", "password123", "New User")

			assert.NoError(t, err)
			assert.Equal(t, "newuser", user.Username)
			assert.Equal(t, "New User", user.DisplayName)
			assert.NotEmpty(t, user.ID)
			mockUserRepo.AssertExpectations(t)
		})

		t.Run("重複ユーザー名でエラーになること", func(t *testing.T) {
			existingUser := &domain.User{Username: "existinguser"}
			mockUserRepo.On("GetByUsername", ctx, "existinguser").Return(existingUser, nil)

			_, err := usecase.CreateUser(ctx, "existinguser", "password123", "Existing User")

			assert.Error(t, err)
			assert.Contains(t, err.Error(), "username already exists")
			mockUserRepo.AssertExpectations(t)
		})

		t.Run("空のフィールドでエラーになること", func(t *testing.T) {
			_, err1 := usecase.CreateUser(ctx, "", "password", "display")
			_, err2 := usecase.CreateUser(ctx, "username", "", "display")
			_, err3 := usecase.CreateUser(ctx, "username", "password", "")

			assert.Error(t, err1)
			assert.Error(t, err2)
			assert.Error(t, err3)
		})
	})

	t.Run("一括ユーザー作成が正常に動作すること", func(t *testing.T) {
		mockAccessCodeRepo := &MockAccessCodeRepository{}
		mockUserRepo := &MockUserRepository{}
		usecase := NewAuthUseCase(mockAccessCodeRepo, mockUserRepo)

		t.Run("正常な一括ユーザー作成", func(t *testing.T) {
			users := []repository.UserCredentials{
				{Username: "user1", Password: "pass1", DisplayName: "User 1"},
				{Username: "user2", Password: "pass2", DisplayName: "User 2"},
			}
			mockUserRepo.On("BulkCreateUsers", ctx, users).Return(nil)

			err := usecase.BulkCreateUsers(ctx, users)

			assert.NoError(t, err)
			mockUserRepo.AssertExpectations(t)
		})

		t.Run("空のユーザーリストでエラーになること", func(t *testing.T) {
			err := usecase.BulkCreateUsers(ctx, []repository.UserCredentials{})

			assert.Error(t, err)
			assert.Contains(t, err.Error(), "no users to create")
		})

		t.Run("不完全なユーザー情報でエラーになること", func(t *testing.T) {
			users := []repository.UserCredentials{
				{Username: "user1", Password: "", DisplayName: "User 1"}, // パスワードが空
			}

			err := usecase.BulkCreateUsers(ctx, users)

			assert.Error(t, err)
			assert.Contains(t, err.Error(), "all fields (username, password, displayName) are required")
		})
	})

	t.Run("ログイン試行のログ記録が動作すること", func(t *testing.T) {
		mockAccessCodeRepo := &MockAccessCodeRepository{}
		mockUserRepo := &MockUserRepository{}
		usecase := NewAuthUseCase(mockAccessCodeRepo, mockUserRepo)

		t.Run("成功ログの記録", func(t *testing.T) {
			err := usecase.LogLoginAttempt(ctx, "testuser", true, "Mozilla/5.0", "192.168.1.1")
			assert.NoError(t, err)
		})

		t.Run("失敗ログの記録", func(t *testing.T) {
			err := usecase.LogLoginAttempt(ctx, "testuser", false, "Mozilla/5.0", "192.168.1.1")
			assert.NoError(t, err)
		})
	})

	t.Run("有効なアクセスコード一覧取得が動作すること", func(t *testing.T) {
		mockAccessCodeRepo := &MockAccessCodeRepository{}
		mockUserRepo := &MockUserRepository{}
		usecase := NewAuthUseCase(mockAccessCodeRepo, mockUserRepo)

		expectedCodes := []string{"CODE1", "CODE2", "CODE3"}
		mockAccessCodeRepo.On("GetValidCodes", ctx).Return(expectedCodes, nil)

		codes, err := usecase.GetValidAccessCodes(ctx)

		assert.NoError(t, err)
		assert.Equal(t, expectedCodes, codes)
		mockAccessCodeRepo.AssertExpectations(t)
	})

	t.Run("レガシーメソッド：アクセスコード検証後のユーザー作成", func(t *testing.T) {
		mockAccessCodeRepo := &MockAccessCodeRepository{}
		mockUserRepo := &MockUserRepository{}
		usecase := NewAuthUseCase(mockAccessCodeRepo, mockUserRepo)
		concreteUsecase := usecase.(*authUseCase)

		t.Run("正常なユーザー作成", func(t *testing.T) {
			mockAccessCodeRepo.On("IsValidAccessCode", ctx, "VALID_CODE").Return(true, nil)
			mockUserRepo.On("Create", ctx, mock.AnythingOfType("*domain.User")).Return(nil)

			user, err := concreteUsecase.CreateUserDeprecated(ctx, "Test User", "VALID_CODE")

			assert.NoError(t, err)
			assert.Equal(t, "Test User", user.DisplayName)
			assert.Equal(t, "VALID_CODE", user.AccessCode)
			assert.True(t, user.IsAnonymous)
			mockAccessCodeRepo.AssertExpectations(t)
			mockUserRepo.AssertExpectations(t)
		})

		t.Run("無効なアクセスコードでエラーになること", func(t *testing.T) {
			mockAccessCodeRepo.On("IsValidAccessCode", ctx, "INVALID_CODE").Return(false, nil)

			_, err := concreteUsecase.CreateUserDeprecated(ctx, "Test User", "INVALID_CODE")

			assert.Error(t, err)
			assert.Contains(t, err.Error(), "invalid access code")
			mockAccessCodeRepo.AssertExpectations(t)
		})
	})
}
