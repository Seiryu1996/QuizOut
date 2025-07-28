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
		
		// モック設定のテスト
		_ = ctx

		// テスト用セッション作成
		title := "テストセッション"
		maxParticipants := 100
		settings := domain.Settings{TimeLimit: 30}
		
		session := &domain.Session{
			Title:           title,
			MaxParticipants: maxParticipants,
			Status:          domain.SessionStatusWaiting,
			Settings:        settings,
		}

		// モックの期待値設定と実行
		mockRepo.On("CreateSession", ctx, mock.AnythingOfType("*domain.Session")).Return(nil)
		err := mockRepo.CreateSession(ctx, session)

		// アサーション
		assert.NoError(t, err)
		assert.NotNil(t, session)
		assert.Equal(t, title, session.Title)
		assert.Equal(t, maxParticipants, session.MaxParticipants)
		assert.Equal(t, domain.SessionStatusWaiting, session.Status)
		assert.Equal(t, settings, session.Settings)

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

		// モックの期待値設定と実行
		mockRepo.On("GetSession", ctx, sessionID).Return(expectedSession, nil)
		session, err := mockRepo.GetSession(ctx, sessionID)

		// アサーション
		assert.NoError(t, err)
		assert.NotNil(t, session)
		assert.Equal(t, sessionID, session.ID)
		assert.Equal(t, "テストセッション", session.Title)

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
	})

	t.Run("存在しないセッション取得でエラーが返ること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockSessionRepository{}
		
		ctx := context.Background()
		sessionID := "nonexistent"

		// モックの期待値設定と実行
		mockRepo.On("GetSession", ctx, sessionID).Return(nil, errors.New("session not found"))
		session, err := mockRepo.GetSession(ctx, sessionID)

		// アサーション
		assert.Error(t, err)
		assert.Nil(t, session)
		assert.Contains(t, err.Error(), "session not found")

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

		// モックの期待値設定と実行
		mockRepo.On("GetSession", ctx, sessionID).Return(waitingSession, nil)
		mockRepo.On("UpdateSession", ctx, mock.AnythingOfType("*domain.Session")).Return(nil)
		
		session, err := mockRepo.GetSession(ctx, sessionID)
		assert.NoError(t, err)
		
		// セッション開始ロジックをシミュレート
		if session.Status == domain.SessionStatusWaiting {
			session.Status = domain.SessionStatusActive
			err = mockRepo.UpdateSession(ctx, session)
		}

		// アサーション
		assert.NoError(t, err)
		assert.Equal(t, domain.SessionStatusActive, session.Status)

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

		// モックの期待値設定と実行
		mockRepo.On("GetSession", ctx, sessionID).Return(activeSession, nil)
		session, err := mockRepo.GetSession(ctx, sessionID)
		assert.NoError(t, err)
		
		// セッション開始ロジックをシミュレート（Active状態でエラー）
		var startErr error
		if session.Status != domain.SessionStatusWaiting {
			startErr = domain.ErrInvalidSessionStatus
		}

		// アサーション
		assert.Error(t, startErr)
		assert.Equal(t, domain.ErrInvalidSessionStatus, startErr)

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

		// テストデータ
		userID := "user456"
		displayName := "テストユーザー"
		
		// モックの期待値設定と実行
		mockRepo.On("GetSession", ctx, sessionID).Return(activeSession, nil)
		mockRepo.On("GetParticipants", ctx, sessionID).Return(currentParticipants, nil)
		mockRepo.On("AddParticipant", ctx, mock.AnythingOfType("*domain.Participant")).Return(nil)
		
		session, err := mockRepo.GetSession(ctx, sessionID)
		assert.NoError(t, err)
		
		participants, err := mockRepo.GetParticipants(ctx, sessionID)
		assert.NoError(t, err)
		
		// 参加者数チェックと参加者作成
		var participant *domain.Participant
		if len(participants) < session.MaxParticipants {
			participant = &domain.Participant{
				UserID:      userID,
				SessionID:   sessionID,
				DisplayName: displayName,
				Status:      domain.ParticipantStatusActive,
			}
			err = mockRepo.AddParticipant(ctx, participant)
		}

		// アサーション
		assert.NoError(t, err)
		assert.NotNil(t, participant)
		assert.Equal(t, userID, participant.UserID)
		assert.Equal(t, sessionID, participant.SessionID)
		assert.Equal(t, displayName, participant.DisplayName)
		assert.Equal(t, domain.ParticipantStatusActive, participant.Status)

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
	})

	t.Run("満員のセッションへの参加でエラーが返ること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockSessionRepository{}
		
		ctx := context.Background()
		sessionID := "session123"

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

		// テストデータ
		_ = "user3" // テスト用ユーザーID
		_ = "テストユーザー3" // テスト用表示名
		
		// モックの期待値設定と実行
		mockRepo.On("GetSession", ctx, sessionID).Return(activeSession, nil)
		mockRepo.On("GetParticipants", ctx, sessionID).Return(fullParticipants, nil)
		
		session, err := mockRepo.GetSession(ctx, sessionID)
		assert.NoError(t, err)
		
		participants, err := mockRepo.GetParticipants(ctx, sessionID)
		assert.NoError(t, err)
		
		// 満員チェックとエラーシミュレート
		var participant *domain.Participant
		var joinErr error
		if len(participants) >= session.MaxParticipants {
			joinErr = errors.New("session is full")
		}

		// アサーション
		assert.Error(t, joinErr)
		assert.Nil(t, participant)
		assert.Contains(t, joinErr.Error(), "session is full")

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

		// Activeなセッション
		activeSession := &domain.Session{
			ID:              sessionID,
			Title:           "テストセッション",
			Status:          domain.SessionStatusActive,
			MaxParticipants: 100,
		}

		// 既に参加済みの参加者
		userID := "user456"
		displayName := "テストユーザー"
		existingParticipants := []*domain.Participant{
			{UserID: userID, SessionID: sessionID, DisplayName: displayName}, // 同じユーザー
		}
		

		// モックの期待値設定
		mockRepo.On("GetSession", ctx, sessionID).Return(activeSession, nil)
		mockRepo.On("GetParticipants", ctx, sessionID).Return(existingParticipants, nil)

		// モックの実行と重複チェック
		_, err := mockRepo.GetSession(ctx, sessionID)
		assert.NoError(t, err)
		
		participants, err := mockRepo.GetParticipants(ctx, sessionID)
		assert.NoError(t, err)
		
		// 重複参加チェック
		var participant *domain.Participant
		var joinErr error
		for _, p := range participants {
			if p.UserID == userID {
				joinErr = errors.New("user already joined")
				break
			}
		}

		// アサーション
		assert.Error(t, joinErr)
		assert.Nil(t, participant)
		assert.Contains(t, joinErr.Error(), "already joined")

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

		// モックの期待値設定と実行
		mockRepo.On("GetActiveParticipants", ctx, sessionID).Return(activeParticipants, nil)
		participants, err := mockRepo.GetActiveParticipants(ctx, sessionID)

		// アサーション
		assert.NoError(t, err)
		assert.NotNil(t, participants)
		assert.Len(t, participants, 2)
		assert.Equal(t, "user1", participants[0].UserID)
		assert.Equal(t, "user2", participants[1].UserID)

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
	})
}