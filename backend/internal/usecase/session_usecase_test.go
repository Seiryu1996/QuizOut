package usecase

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	
	"quiz-app/internal/domain"
)

// SessionRepositoryのモック
type MockSessionRepository struct {
	mock.Mock
}

func (m *MockSessionRepository) CreateSession(ctx context.Context, session *domain.Session) error {
	args := m.Called(ctx, session)
	return args.Error(0)
}

func (m *MockSessionRepository) GetSession(ctx context.Context, sessionID string) (*domain.Session, error) {
	args := m.Called(ctx, sessionID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Session), args.Error(1)
}

func (m *MockSessionRepository) UpdateSession(ctx context.Context, session *domain.Session) error {
	args := m.Called(ctx, session)
	return args.Error(0)
}

func (m *MockSessionRepository) AddParticipant(ctx context.Context, participant *domain.Participant) error {
	args := m.Called(ctx, participant)
	return args.Error(0)
}

func (m *MockSessionRepository) GetParticipants(ctx context.Context, sessionID string) ([]*domain.Participant, error) {
	args := m.Called(ctx, sessionID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Participant), args.Error(1)
}

func (m *MockSessionRepository) GetActiveParticipants(ctx context.Context, sessionID string) ([]*domain.Participant, error) {
	args := m.Called(ctx, sessionID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Participant), args.Error(1)
}

func TestSessionUseCase(t *testing.T) {
	t.Run("セッション作成が正常に動作すること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockSessionRepository{}
		
		ctx := context.Background()
		title := "テストセッション"
		maxParticipants := 100
		settings := domain.Settings{
			TimeLimit:      30,
			RevivalEnabled: true,
			RevivalCount:   5,
		}

		// モックの期待値設定
		mockRepo.On("CreateSession", ctx, mock.AnythingOfType("*domain.Session")).Return(nil)

		// UseCase実行（実際のusecase実装が必要）
		// usecase := NewSessionUseCase(mockRepo)
		// session, err := usecase.CreateSession(ctx, title, maxParticipants, settings)

		// アサーション
		// assert.NoError(t, err)
		// assert.NotNil(t, session)
		// assert.Equal(t, title, session.Title)
		// assert.Equal(t, maxParticipants, session.MaxParticipants)
		// assert.Equal(t, domain.SessionStatusWaiting, session.Status)
		// assert.Equal(t, settings, session.Settings)

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
	})

	t.Run("セッション取得が正常に動作すること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockSessionRepository{}
		
		ctx := context.Background()
		sessionID := "session123"

		// 期待されるセッション
		expectedSession := &domain.Session{
			ID:              sessionID,
			Title:           "テストセッション",
			Status:          domain.SessionStatusWaiting,
			MaxParticipants: 100,
		}

		// モックの期待値設定
		mockRepo.On("GetSession", ctx, sessionID).Return(expectedSession, nil)

		// UseCase実行
		// usecase := NewSessionUseCase(mockRepo)
		// session, err := usecase.GetSession(ctx, sessionID)

		// アサーション
		// assert.NoError(t, err)
		// assert.NotNil(t, session)
		// assert.Equal(t, sessionID, session.ID)
		// assert.Equal(t, "テストセッション", session.Title)

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
	})

	t.Run("存在しないセッション取得でエラーが返ること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockSessionRepository{}
		
		ctx := context.Background()
		sessionID := "nonexistent"

		// モックの期待値設定
		mockRepo.On("GetSession", ctx, sessionID).Return(nil, errors.New("session not found"))

		// UseCase実行
		// usecase := NewSessionUseCase(mockRepo)
		// session, err := usecase.GetSession(ctx, sessionID)

		// アサーション
		// assert.Error(t, err)
		// assert.Nil(t, session)
		// assert.Contains(t, err.Error(), "session not found")

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
	})

	t.Run("セッション開始が正常に動作すること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockSessionRepository{}
		
		ctx := context.Background()
		sessionID := "session123"

		// 開始前のセッション
		waitingSession := &domain.Session{
			ID:     sessionID,
			Title:  "テストセッション",
			Status: domain.SessionStatusWaiting,
		}

		// モックの期待値設定
		mockRepo.On("GetSession", ctx, sessionID).Return(waitingSession, nil)
		mockRepo.On("UpdateSession", ctx, mock.AnythingOfType("*domain.Session")).Return(nil)

		// UseCase実行
		// usecase := NewSessionUseCase(mockRepo)
		// err := usecase.StartSession(ctx, sessionID)

		// アサーション
		// assert.NoError(t, err)

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
	})

	t.Run("Active状態のセッション開始でエラーが返ること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockSessionRepository{}
		
		ctx := context.Background()
		sessionID := "session123"

		// 既にActive状態のセッション
		activeSession := &domain.Session{
			ID:     sessionID,
			Title:  "テストセッション",
			Status: domain.SessionStatusActive,
		}

		// モックの期待値設定
		mockRepo.On("GetSession", ctx, sessionID).Return(activeSession, nil)

		// UseCase実行
		// usecase := NewSessionUseCase(mockRepo)
		// err := usecase.StartSession(ctx, sessionID)

		// アサーション
		// assert.Error(t, err)
		// assert.Equal(t, domain.ErrInvalidSessionStatus, err)

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
		// UpdateSessionは呼ばれないはず
		mockRepo.AssertNotCalled(t, "UpdateSession")
	})

	t.Run("参加者追加が正常に動作すること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockSessionRepository{}
		
		ctx := context.Background()
		sessionID := "session123"
		userID := "user456"
		displayName := "テストユーザー"

		// Activeなセッション
		activeSession := &domain.Session{
			ID:              sessionID,
			Title:           "テストセッション",
			Status:          domain.SessionStatusActive,
			MaxParticipants: 100,
		}

		// 現在の参加者（少ない）
		currentParticipants := []*domain.Participant{
			{UserID: "user1", SessionID: sessionID, DisplayName: "ユーザー1"},
		}

		// モックの期待値設定
		mockRepo.On("GetSession", ctx, sessionID).Return(activeSession, nil)
		mockRepo.On("GetParticipants", ctx, sessionID).Return(currentParticipants, nil)
		mockRepo.On("AddParticipant", ctx, mock.AnythingOfType("*domain.Participant")).Return(nil)

		// UseCase実行
		// usecase := NewSessionUseCase(mockRepo)
		// participant, err := usecase.JoinSession(ctx, sessionID, userID, displayName)

		// アサーション
		// assert.NoError(t, err)
		// assert.NotNil(t, participant)
		// assert.Equal(t, userID, participant.UserID)
		// assert.Equal(t, sessionID, participant.SessionID)
		// assert.Equal(t, displayName, participant.DisplayName)
		// assert.Equal(t, domain.ParticipantStatusActive, participant.Status)

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
	})

	t.Run("満員のセッションへの参加でエラーが返ること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockSessionRepository{}
		
		ctx := context.Background()
		sessionID := "session123"
		userID := "user456"
		displayName := "テストユーザー"

		// 最大参加者数が2のセッション
		activeSession := &domain.Session{
			ID:              sessionID,
			Title:           "テストセッション",
			Status:          domain.SessionStatusActive,
			MaxParticipants: 2,
		}

		// 既に満員の参加者
		fullParticipants := []*domain.Participant{
			{UserID: "user1", SessionID: sessionID, DisplayName: "ユーザー1"},
			{UserID: "user2", SessionID: sessionID, DisplayName: "ユーザー2"},
		}

		// モックの期待値設定
		mockRepo.On("GetSession", ctx, sessionID).Return(activeSession, nil)
		mockRepo.On("GetParticipants", ctx, sessionID).Return(fullParticipants, nil)

		// UseCase実行
		// usecase := NewSessionUseCase(mockRepo)
		// participant, err := usecase.JoinSession(ctx, sessionID, userID, displayName)

		// アサーション
		// assert.Error(t, err)
		// assert.Nil(t, participant)
		// assert.Contains(t, err.Error(), "session is full")

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
		// AddParticipantは呼ばれないはず
		mockRepo.AssertNotCalled(t, "AddParticipant")
	})

	t.Run("重複参加でエラーが返ること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockSessionRepository{}
		
		ctx := context.Background()
		sessionID := "session123"
		userID := "user456"
		displayName := "テストユーザー"

		// Activeなセッション
		activeSession := &domain.Session{
			ID:              sessionID,
			Title:           "テストセッション",
			Status:          domain.SessionStatusActive,
			MaxParticipants: 100,
		}

		// 既に参加済みの参加者
		existingParticipants := []*domain.Participant{
			{UserID: userID, SessionID: sessionID, DisplayName: displayName}, // 同じユーザー
		}

		// モックの期待値設定
		mockRepo.On("GetSession", ctx, sessionID).Return(activeSession, nil)
		mockRepo.On("GetParticipants", ctx, sessionID).Return(existingParticipants, nil)

		// UseCase実行
		// usecase := NewSessionUseCase(mockRepo)
		// participant, err := usecase.JoinSession(ctx, sessionID, userID, displayName)

		// アサーション
		// assert.Error(t, err)
		// assert.Nil(t, participant)
		// assert.Contains(t, err.Error(), "already joined")

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
		// AddParticipantは呼ばれないはず
		mockRepo.AssertNotCalled(t, "AddParticipant")
	})

	t.Run("アクティブ参加者取得が正常に動作すること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockSessionRepository{}
		
		ctx := context.Background()
		sessionID := "session123"

		// アクティブな参加者
		activeParticipants := []*domain.Participant{
			{UserID: "user1", SessionID: sessionID, Status: domain.ParticipantStatusActive},
			{UserID: "user2", SessionID: sessionID, Status: domain.ParticipantStatusRevived},
		}

		// モックの期待値設定
		mockRepo.On("GetActiveParticipants", ctx, sessionID).Return(activeParticipants, nil)

		// UseCase実行
		// usecase := NewSessionUseCase(mockRepo)
		// participants, err := usecase.GetActiveParticipants(ctx, sessionID)

		// アサーション
		// assert.NoError(t, err)
		// assert.NotNil(t, participants)
		// assert.Len(t, participants, 2)
		// assert.Equal(t, "user1", participants[0].UserID)
		// assert.Equal(t, "user2", participants[1].UserID)

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
	})
}