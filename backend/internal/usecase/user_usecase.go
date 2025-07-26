package usecase

import (
	"context"
	"fmt"
	"quiz-app/internal/domain"
	"quiz-app/internal/repository"
)

type userUseCase struct {
	userRepo repository.UserRepository
}

func NewUserUseCase(userRepo repository.UserRepository) UserUseCase {
	return &userUseCase{
		userRepo: userRepo,
	}
}

func (u *userUseCase) CreateUser(ctx context.Context, displayName, email string, isAnonymous bool) (*domain.User, error) {
	if displayName == "" {
		return nil, domain.ErrInvalidInput
	}

	// メールアドレスが指定されている場合、既存ユーザーチェック
	if email != "" && !isAnonymous {
		existingUser, err := u.userRepo.GetByEmail(ctx, email)
		if err == nil && existingUser != nil {
			return existingUser, nil
		}
	}

	user := domain.NewUserWithEmail(displayName, email, isAnonymous)
	
	if err := u.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

func (u *userUseCase) GetUser(ctx context.Context, userID string) (*domain.User, error) {
	if userID == "" {
		return nil, domain.ErrInvalidInput
	}

	user, err := u.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (u *userUseCase) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	if email == "" {
		return nil, domain.ErrInvalidInput
	}

	user, err := u.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}

	return user, nil
}

func (u *userUseCase) UpdateUser(ctx context.Context, user *domain.User) error {
	if user == nil || user.ID == "" {
		return domain.ErrInvalidInput
	}

	if err := u.userRepo.Update(ctx, user); err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	return nil
}