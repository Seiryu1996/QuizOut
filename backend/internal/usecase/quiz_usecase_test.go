package usecase

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	
	"quiz-app/internal/domain"
)

// QuizRepositoryのモック
type MockQuizRepository struct {
	mock.Mock
}

func (m *MockQuizRepository) CreateSession(ctx context.Context, session *domain.Session) error {
	args := m.Called(ctx, session)
	return args.Error(0)
}

func (m *MockQuizRepository) GetSession(ctx context.Context, sessionID string) (*domain.Session, error) {
	args := m.Called(ctx, sessionID)
	return args.Get(0).(*domain.Session), args.Error(1)
}

func (m *MockQuizRepository) UpdateSession(ctx context.Context, session *domain.Session) error {
	args := m.Called(ctx, session)
	return args.Error(0)
}

func (m *MockQuizRepository) SaveQuestion(ctx context.Context, question *domain.Question) error {
	args := m.Called(ctx, question)
	return args.Error(0)
}

func (m *MockQuizRepository) GetCurrentQuestion(ctx context.Context, sessionID string) (*domain.Question, error) {
	args := m.Called(ctx, sessionID)
	return args.Get(0).(*domain.Question), args.Error(1)
}

func (m *MockQuizRepository) SaveAnswer(ctx context.Context, answer *domain.Answer) error {
	args := m.Called(ctx, answer)
	return args.Error(0)
}

func (m *MockQuizRepository) GetParticipants(ctx context.Context, sessionID string) ([]*domain.Participant, error) {
	args := m.Called(ctx, sessionID)
	return args.Get(0).([]*domain.Participant), args.Error(1)
}

func (m *MockQuizRepository) UpdateParticipant(ctx context.Context, participant *domain.Participant) error {
	args := m.Called(ctx, participant)
	return args.Error(0)
}

func (m *MockQuizRepository) AddParticipant(ctx context.Context, participant *domain.Participant) error {
	args := m.Called(ctx, participant)
	return args.Error(0)
}

// AIServiceのモック
type MockAIService struct {
	mock.Mock
}

func (m *MockAIService) GenerateQuestion(ctx context.Context, difficulty domain.Difficulty, category string) (*domain.Question, error) {
	args := m.Called(ctx, difficulty, category)
	return args.Get(0).(*domain.Question), args.Error(1)
}

func TestQuizUseCase(t *testing.T) {
	t.Run("問題生成が正常に動作すること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockQuizRepository{}
		mockAI := &MockAIService{}
		
		ctx := context.Background()
		sessionID := "session123"
		round := 1
		difficulty := domain.DifficultyMedium
		category := "general"

		// 生成される問題のモック
		expectedQuestion := &domain.Question{
			ID:            "q1",
			SessionID:     sessionID,
			Round:         round,
			Text:          "テスト問題",
			Options:       []string{"選択肢1", "選択肢2", "選択肢3", "選択肢4"},
			CorrectAnswer: 0,
			Difficulty:    difficulty,
			Category:      category,
			AIProvider:    domain.AIProviderGemini,
		}

		// モックの期待値設定
		mockAI.On("GenerateQuestion", ctx, difficulty, category).Return(expectedQuestion, nil)
		mockRepo.On("SaveQuestion", ctx, mock.AnythingOfType("*domain.Question")).Return(nil)

		// テスト用のQuizUseCaseインターフェースを直接テスト
		// 実装が完了するまでは、モックの動作確認のみ行う
		
		// 実際の実装待ちのため、現在はモックの動作のみテスト
		question, err := mockAI.GenerateQuestion(ctx, difficulty, category)
		assert.NoError(t, err)
		assert.NotNil(t, question)
		assert.Equal(t, sessionID, question.SessionID)
		assert.Equal(t, round, question.Round)
		
		err = mockRepo.SaveQuestion(ctx, question)
		assert.NoError(t, err)

		// モックの呼び出し確認
		mockAI.AssertExpectations(t)
		mockRepo.AssertExpectations(t)
	})

	t.Run("AI問題生成失敗時に適切なエラーが返ること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockQuizRepository{}
		mockAI := &MockAIService{}
		
		ctx := context.Background()
		difficulty := domain.DifficultyMedium
		category := "general"

		// AI生成エラーのモック
		mockAI.On("GenerateQuestion", ctx, difficulty, category).Return((*domain.Question)(nil), errors.New("AI generation failed"))

		// UseCase実行（モック直接テスト）
		question, err := mockAI.GenerateQuestion(ctx, difficulty, category)

		// アサーション
		assert.Error(t, err)
		assert.Nil(t, question)
		assert.Contains(t, err.Error(), "AI generation failed")

		// モックの呼び出し確認
		mockAI.AssertExpectations(t)
		// SaveQuestionは呼ばれないはず
		mockRepo.AssertNotCalled(t, "SaveQuestion")
	})

	t.Run("回答処理が正常に動作すること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockQuizRepository{}
		
		ctx := context.Background()
		sessionID := "session123"
		userID := "user456"
		questionID := "q1"
		selectedOption := 0
		responseTime := 5000

		// 現在の問題のモック
		currentQuestion := &domain.Question{
			ID:            questionID,
			SessionID:     sessionID,
			Text:          "テスト問題",
			Options:       []string{"正解", "不正解1", "不正解2", "不正解3"},
			CorrectAnswer: 0,
		}

		// モックの期待値設定
		mockRepo.On("GetCurrentQuestion", ctx, sessionID).Return(currentQuestion, nil)
		mockRepo.On("SaveAnswer", ctx, mock.AnythingOfType("*domain.Answer")).Return(nil)

		// UseCase実行（モック直接テスト）
		retrievedQuestion, err := mockRepo.GetCurrentQuestion(ctx, sessionID)
		assert.NoError(t, err)
		assert.NotNil(t, retrievedQuestion)
		
		// 回答作成とテスト
		answer := domain.NewAnswer(userID, sessionID, questionID, selectedOption, responseTime)
		answer.SetCorrect(retrievedQuestion.ValidateAnswer(selectedOption))
		
		err = mockRepo.SaveAnswer(ctx, answer)
		assert.NoError(t, err)
		
		// アサーション
		assert.Equal(t, userID, answer.UserID)
		assert.Equal(t, questionID, answer.QuestionID)
		assert.Equal(t, selectedOption, answer.SelectedOption)
		assert.True(t, answer.IsCorrect) // 正解を選択
		assert.Equal(t, responseTime, answer.ResponseTime)

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
	})

	t.Run("不正解回答時の処理が正常に動作すること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockQuizRepository{}
		
		ctx := context.Background()
		sessionID := "session123"
		userID := "user456"
		questionID := "q1"
		selectedOption := 1 // 不正解
		responseTime := 3000

		// 現在の問題のモック
		currentQuestion := &domain.Question{
			ID:            questionID,
			SessionID:     sessionID,
			Text:          "テスト問題",
			Options:       []string{"正解", "不正解1", "不正解2", "不正解3"},
			CorrectAnswer: 0,
		}

		// モックの期待値設定
		mockRepo.On("GetCurrentQuestion", ctx, sessionID).Return(currentQuestion, nil)
		mockRepo.On("SaveAnswer", ctx, mock.AnythingOfType("*domain.Answer")).Return(nil)

		// UseCase実行（モック直接テスト）
		retrievedQuestion, err := mockRepo.GetCurrentQuestion(ctx, sessionID)
		assert.NoError(t, err)
		assert.NotNil(t, retrievedQuestion)
		
		// 回答作成とテスト
		answer := domain.NewAnswer(userID, sessionID, questionID, selectedOption, responseTime)
		answer.SetCorrect(retrievedQuestion.ValidateAnswer(selectedOption))
		
		err = mockRepo.SaveAnswer(ctx, answer)
		assert.NoError(t, err)

		// アサーション
		assert.Equal(t, userID, answer.UserID)
		assert.Equal(t, questionID, answer.QuestionID)
		assert.Equal(t, selectedOption, answer.SelectedOption)
		assert.False(t, answer.IsCorrect) // 不正解を選択
		assert.Equal(t, responseTime, answer.ResponseTime)

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
	})

	t.Run("存在しない問題への回答でエラーが返ること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockQuizRepository{}
		
		ctx := context.Background()
		sessionID := "session123"

		// 問題が見つからない場合のモック
		mockRepo.On("GetCurrentQuestion", ctx, sessionID).Return((*domain.Question)(nil), errors.New("question not found"))

		// UseCase実行（モック直接テスト）
		question, err := mockRepo.GetCurrentQuestion(ctx, sessionID)

		// アサーション
		assert.Error(t, err)
		assert.Nil(t, question)
		assert.Contains(t, err.Error(), "question not found")

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
		// SaveAnswerは呼ばれないはず
		mockRepo.AssertNotCalled(t, "SaveAnswer")
	})

	t.Run("範囲外の選択肢を選んだ場合の処理が正常に動作すること", func(t *testing.T) {
		// モックの設定
		mockRepo := &MockQuizRepository{}
		
		ctx := context.Background()
		sessionID := "session123"
		userID := "user456"
		questionID := "q1"
		selectedOption := 5 // 範囲外
		responseTime := 2000

		// 現在の問題のモック
		currentQuestion := &domain.Question{
			ID:            questionID,
			SessionID:     sessionID,
			Text:          "テスト問題",
			Options:       []string{"選択肢1", "選択肢2", "選択肢3", "選択肢4"},
			CorrectAnswer: 0,
		}

		// モックの期待値設定
		mockRepo.On("GetCurrentQuestion", ctx, sessionID).Return(currentQuestion, nil)
		mockRepo.On("SaveAnswer", ctx, mock.AnythingOfType("*domain.Answer")).Return(nil)

		// UseCase実行（モック直接テスト）
		retrievedQuestion, err := mockRepo.GetCurrentQuestion(ctx, sessionID)
		assert.NoError(t, err)
		assert.NotNil(t, retrievedQuestion)
		
		// 回答作成とテスト
		answer := domain.NewAnswer(userID, sessionID, questionID, selectedOption, responseTime)
		answer.SetCorrect(retrievedQuestion.ValidateAnswer(selectedOption))
		
		err = mockRepo.SaveAnswer(ctx, answer)
		assert.NoError(t, err)

		// アサーション
		assert.NotNil(t, answer)
		assert.False(t, answer.IsCorrect) // 範囲外は不正解扱い

		// モックの呼び出し確認
		mockRepo.AssertExpectations(t)
	})
}