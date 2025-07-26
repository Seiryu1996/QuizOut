package usecase

import (
	"context"
	"fmt"
	"quiz-app/internal/domain"
	"quiz-app/internal/repository"
	"quiz-app/internal/websocket"
)

type sessionUseCase struct {
	sessionRepo     repository.SessionRepository
	participantRepo repository.ParticipantRepository
	userRepo        repository.UserRepository
	wsManager       *websocket.Manager
}

func NewSessionUseCase(
	sessionRepo repository.SessionRepository,
	participantRepo repository.ParticipantRepository,
	userRepo repository.UserRepository,
	wsManager *websocket.Manager,
) SessionUseCase {
	return &sessionUseCase{
		sessionRepo:     sessionRepo,
		participantRepo: participantRepo,
		userRepo:        userRepo,
		wsManager:       wsManager,
	}
}

func (u *sessionUseCase) CreateSession(ctx context.Context, title string, maxParticipants int, settings domain.Settings) (*domain.Session, error) {
	if title == "" {
		return nil, domain.ErrInvalidInput
	}
	if maxParticipants <= 0 {
		maxParticipants = 200 // デフォルト値
	}

	session := domain.NewSession(title, maxParticipants, settings)
	
	if err := u.sessionRepo.Create(ctx, session); err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	return session, nil
}

func (u *sessionUseCase) GetSession(ctx context.Context, sessionID string) (*domain.Session, error) {
	if sessionID == "" {
		return nil, domain.ErrInvalidInput
	}

	session, err := u.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	return session, nil
}

func (u *sessionUseCase) StartSession(ctx context.Context, sessionID string) error {
	session, err := u.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("failed to get session: %w", err)
	}

	if err := session.Start(); err != nil {
		return err
	}

	if err := u.sessionRepo.Update(ctx, session); err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}

	// WebSocketで開始通知
	u.wsManager.NotifySessionUpdate(sessionID, session)

	return nil
}

func (u *sessionUseCase) FinishSession(ctx context.Context, sessionID string) error {
	session, err := u.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("failed to get session: %w", err)
	}

	if err := session.Finish(); err != nil {
		return err
	}

	if err := u.sessionRepo.Update(ctx, session); err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}

	// WebSocketで終了通知
	u.wsManager.NotifySessionUpdate(sessionID, session)

	return nil
}

func (u *sessionUseCase) JoinSession(ctx context.Context, sessionID, userID, displayName string) (*domain.Participant, error) {
	if sessionID == "" || userID == "" || displayName == "" {
		return nil, domain.ErrInvalidInput
	}

	// セッション存在確認
	session, err := u.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, domain.ErrSessionNotFound
	}

	// セッション状態確認
	if !session.IsWaiting() && !session.IsActive() {
		return nil, domain.ErrSessionNotActive
	}

	// 既に参加しているかチェック
	existingParticipant, err := u.participantRepo.GetByUserAndSession(ctx, userID, sessionID)
	if err == nil && existingParticipant != nil {
		return existingParticipant, nil
	}

	// 参加者数制限チェック
	participantCount, err := u.participantRepo.CountBySession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to count participants: %w", err)
	}

	if participantCount >= session.MaxParticipants {
		return nil, domain.ErrSessionFull
	}

	// ユーザー情報取得または作成
	user, err := u.userRepo.GetByID(ctx, userID)
	if err != nil {
		// ユーザーが存在しない場合は匿名ユーザーとして作成
		user = domain.NewUserWithEmail(displayName, "", true)
		user.ID = userID
		if err := u.userRepo.Create(ctx, user); err != nil {
			return nil, fmt.Errorf("failed to create user: %w", err)
		}
	}

	// 参加者作成
	participant := domain.NewParticipant(userID, sessionID, displayName)
	
	if err := u.participantRepo.Create(ctx, participant); err != nil {
		return nil, fmt.Errorf("failed to create participant: %w", err)
	}

	// WebSocketで参加通知は Client 側で自動送信される

	return participant, nil
}

func (u *sessionUseCase) GetParticipants(ctx context.Context, sessionID string) ([]*domain.Participant, error) {
	if sessionID == "" {
		return nil, domain.ErrInvalidInput
	}

	participants, err := u.participantRepo.GetBySession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get participants: %w", err)
	}

	return participants, nil
}

func (u *sessionUseCase) GetActiveParticipants(ctx context.Context, sessionID string) ([]*domain.Participant, error) {
	if sessionID == "" {
		return nil, domain.ErrInvalidInput
	}

	participants, err := u.participantRepo.GetActiveBySession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get active participants: %w", err)
	}

	return participants, nil
}