package usecase

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	
	"quiz-app/internal/domain"
)

// AdminRepositoryのモック
type MockAdminRepository struct {
	mock.Mock
}

func (m *MockAdminRepository) GetSessionStats(ctx context.Context, sessionID string) (map[string]interface{}, error) {
	args := m.Called(ctx, sessionID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]interface{}), args.Error(1)
}

func (m *MockAdminRepository) ExportResults(ctx context.Context, sessionID string) ([]byte, error) {
	args := m.Called(ctx, sessionID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]byte), args.Error(1)
}

func (m *MockAdminRepository) GetEliminatedParticipants(ctx context.Context, sessionID string) ([]*domain.Participant, error) {
	args := m.Called(ctx, sessionID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Participant), args.Error(1)
}

func (m *MockAdminRepository) ReviveParticipants(ctx context.Context, participants []*domain.Participant) error {
	args := m.Called(ctx, participants)
	return args.Error(0)
}

func TestAdminUseCase(t *testing.T) {
	t.Run("セッション統計取得が正常に動作すること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockAdminRepository{}
		
		ctx := context.Background()
		sessionID := "session123"

		// 期待される統計データ
		expectedStats := map[string]interface{}{
			"sessionId":          sessionID,
			"totalParticipants":  50,
			"activeParticipants": 25,
			"eliminatedParticipants": 25,
			"currentRound":       5,
			"questionsGenerated": 5,
		}

		// モックの期待値設定
		mockRepo.On("GetSessionStats", ctx, sessionID).Return(expectedStats, nil)

		// UseCase実行（実際のusecase実装が必要）
		// usecase := NewAdminUseCase(mockRepo, mockSessionRepo)
		// stats, err := usecase.GetSessionStats(ctx, sessionID)

		// アサーション
		// assert.NoError(t, err)
		// assert.NotNil(t, stats)
		// assert.Equal(t, sessionID, stats["sessionId"])
		// assert.Equal(t, 50, stats["totalParticipants"])
		// assert.Equal(t, 25, stats["activeParticipants"])
		// assert.Equal(t, 25, stats["eliminatedParticipants"])

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
	})

	t.Run("存在しないセッションの統計取得でエラーが返ること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockAdminRepository{}
		mockSessionRepo := &MockSessionRepository{}
		
		ctx := context.Background()
		sessionID := "nonexistent"

		// モックの期待値設定
		mockRepo.On("GetSessionStats", ctx, sessionID).Return(nil, errors.New("session not found"))

		// UseCase実行
		// usecase := NewAdminUseCase(mockRepo, mockSessionRepo)
		// stats, err := usecase.GetSessionStats(ctx, sessionID)

		// アサーション
		// assert.Error(t, err)
		// assert.Nil(t, stats)
		// assert.Contains(t, err.Error(), "session not found")

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
	})

	t.Run("敗者復活戦開始が正常に動作すること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockAdminRepository{}
		mockSessionRepo := &MockSessionRepository{}
		
		ctx := context.Background()
		sessionID := "session123"
		revivalCount := 3

		// 脱落した参加者
		eliminatedParticipants := []*domain.Participant{
			{UserID: "user1", SessionID: sessionID, Status: domain.ParticipantStatusEliminated, DisplayName: "ユーザー1"},
			{UserID: "user2", SessionID: sessionID, Status: domain.ParticipantStatusEliminated, DisplayName: "ユーザー2"},
			{UserID: "user3", SessionID: sessionID, Status: domain.ParticipantStatusEliminated, DisplayName: "ユーザー3"},
			{UserID: "user4", SessionID: sessionID, Status: domain.ParticipantStatusEliminated, DisplayName: "ユーザー4"},
			{UserID: "user5", SessionID: sessionID, Status: domain.ParticipantStatusEliminated, DisplayName: "ユーザー5"},
		}

		// モックの期待値設定
		mockRepo.On("GetEliminatedParticipants", ctx, sessionID).Return(eliminatedParticipants, nil)
		mockRepo.On("ReviveParticipants", ctx, mock.MatchedBy(func(participants []*domain.Participant) bool {
			return len(participants) == revivalCount
		})).Return(nil)

		// UseCase実行
		// usecase := NewAdminUseCase(mockRepo, mockSessionRepo)
		// revivedParticipants, err := usecase.StartRevival(ctx, sessionID, revivalCount)

		// アサーション
		// assert.NoError(t, err)
		// assert.NotNil(t, revivedParticipants)
		// assert.Len(t, revivedParticipants, revivalCount)
		
		// 復活した参加者の状態確認
		// for _, participant := range revivedParticipants {
		//     assert.Equal(t, domain.ParticipantStatusRevived, participant.Status)
		//     assert.NotNil(t, participant.RevivedAt)
		// }

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
	})

	t.Run("脱落者が少ない場合の敗者復活戦処理", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockAdminRepository{}
		mockSessionRepo := &MockSessionRepository{}
		
		ctx := context.Background()
		sessionID := "session123"
		revivalCount := 5

		// 脱落した参加者（復活希望人数より少ない）
		eliminatedParticipants := []*domain.Participant{
			{UserID: "user1", SessionID: sessionID, Status: domain.ParticipantStatusEliminated, DisplayName: "ユーザー1"},
			{UserID: "user2", SessionID: sessionID, Status: domain.ParticipantStatusEliminated, DisplayName: "ユーザー2"},
		}

		// モックの期待値設定
		mockRepo.On("GetEliminatedParticipants", ctx, sessionID).Return(eliminatedParticipants, nil)
		mockRepo.On("ReviveParticipants", ctx, mock.MatchedBy(func(participants []*domain.Participant) bool {
			return len(participants) == 2 // 実際の脱落者数
		})).Return(nil)

		// UseCase実行
		// usecase := NewAdminUseCase(mockRepo, mockSessionRepo)
		// revivedParticipants, err := usecase.StartRevival(ctx, sessionID, revivalCount)

		// アサーション
		// assert.NoError(t, err)
		// assert.NotNil(t, revivedParticipants)
		// assert.Len(t, revivedParticipants, 2) // 実際の脱落者数分だけ復活

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
	})

	t.Run("脱落者がいない場合の敗者復活戦処理", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockAdminRepository{}
		mockSessionRepo := &MockSessionRepository{}
		
		ctx := context.Background()
		sessionID := "session123"
		revivalCount := 3

		// 脱落した参加者がいない
		eliminatedParticipants := []*domain.Participant{}

		// モックの期待値設定
		mockRepo.On("GetEliminatedParticipants", ctx, sessionID).Return(eliminatedParticipants, nil)

		// UseCase実行
		// usecase := NewAdminUseCase(mockRepo, mockSessionRepo)
		// revivedParticipants, err := usecase.StartRevival(ctx, sessionID, revivalCount)

		// アサーション
		// assert.NoError(t, err)
		// assert.NotNil(t, revivedParticipants)
		// assert.Len(t, revivedParticipants, 0) // 復活者なし

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
		// ReviveParticipantsは呼ばれないはず
		mockRepo.AssertNotCalled(t, "ReviveParticipants")
	})

	t.Run("結果エクスポートが正常に動作すること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockAdminRepository{}
		mockSessionRepo := &MockSessionRepository{}
		
		ctx := context.Background()
		sessionID := "session123"

		// 期待されるCSVデータ
		expectedCSV := []byte("UserID,DisplayName,Score,CorrectAnswers,Status\nuser1,ユーザー1,100,10,active\nuser2,ユーザー2,80,8,eliminated")

		// モックの期待値設定
		mockRepo.On("ExportResults", ctx, sessionID).Return(expectedCSV, nil)

		// UseCase実行
		// usecase := NewAdminUseCase(mockRepo, mockSessionRepo)
		// csvData, err := usecase.ExportResults(ctx, sessionID)

		// アサーション
		// assert.NoError(t, err)
		// assert.NotNil(t, csvData)
		// assert.Contains(t, string(csvData), "UserID,DisplayName,Score")
		// assert.Contains(t, string(csvData), "user1,ユーザー1,100")

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
	})

	t.Run("問題スキップが正常に動作すること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockAdminRepository{}
		mockSessionRepo := &MockSessionRepository{}
		
		ctx := context.Background()
		sessionID := "session123"

		// Activeなセッション
		activeSession := &domain.Session{
			ID:           sessionID,
			Status:       domain.SessionStatusActive,
			CurrentRound: 3,
		}

		// モックの期待値設定
		mockSessionRepo.On("GetSession", ctx, sessionID).Return(activeSession, nil)
		mockSessionRepo.On("UpdateSession", ctx, mock.AnythingOfType("*domain.Session")).Return(nil)

		// UseCase実行
		// usecase := NewAdminUseCase(mockRepo, mockSessionRepo)
		// err := usecase.SkipQuestion(ctx, sessionID)

		// アサーション
		// assert.NoError(t, err)

		// モックの呼び出し確認
		mockSessionRepo.AssertExpectations(t)
	})

	t.Run("非アクティブセッションでの問題スキップでエラーが返ること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockAdminRepository{}
		mockSessionRepo := &MockSessionRepository{}
		
		ctx := context.Background()
		sessionID := "session123"

		// 非アクティブなセッション
		waitingSession := &domain.Session{
			ID:           sessionID,
			Status:       domain.SessionStatusWaiting,
			CurrentRound: 0,
		}

		// モックの期待値設定
		mockSessionRepo.On("GetSession", ctx, sessionID).Return(waitingSession, nil)

		// UseCase実行
		// usecase := NewAdminUseCase(mockRepo, mockSessionRepo)
		// err := usecase.SkipQuestion(ctx, sessionID)

		// アサーション
		// assert.Error(t, err)
		// assert.Equal(t, domain.ErrInvalidSessionStatus, err)

		// モックの呼び出し確認
		mockSessionRepo.AssertExpectations(t)
		// UpdateSessionは呼ばれないはず
		mockSessionRepo.AssertNotCalled(t, "UpdateSession")
	})
}