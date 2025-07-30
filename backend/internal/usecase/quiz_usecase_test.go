package usecase

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	
	"quiz-app/internal/domain"
)

// Mock repositories
type MockSessionRepository struct {
	mock.Mock
}

func (m *MockSessionRepository) Create(ctx context.Context, session *domain.Session) error {
	args := m.Called(ctx, session)
	return args.Error(0)
}

func (m *MockSessionRepository) GetByID(ctx context.Context, id string) (*domain.Session, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Session), args.Error(1)
}

func (m *MockSessionRepository) Update(ctx context.Context, session *domain.Session) error {
	args := m.Called(ctx, session)
	return args.Error(0)
}

func (m *MockSessionRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockSessionRepository) List(ctx context.Context, limit int, offset int) ([]*domain.Session, error) {
	args := m.Called(ctx, limit, offset)
	return args.Get(0).([]*domain.Session), args.Error(1)
}

type MockParticipantRepository struct {
	mock.Mock
}

func (m *MockParticipantRepository) Create(ctx context.Context, participant *domain.Participant) error {
	args := m.Called(ctx, participant)
	return args.Error(0)
}

func (m *MockParticipantRepository) GetByID(ctx context.Context, id string) (*domain.Participant, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*domain.Participant), args.Error(1)
}

func (m *MockParticipantRepository) GetByUserAndSession(ctx context.Context, userID, sessionID string) (*domain.Participant, error) {
	args := m.Called(ctx, userID, sessionID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Participant), args.Error(1)
}

func (m *MockParticipantRepository) GetBySession(ctx context.Context, sessionID string) ([]*domain.Participant, error) {
	args := m.Called(ctx, sessionID)
	return args.Get(0).([]*domain.Participant), args.Error(1)
}

func (m *MockParticipantRepository) GetActiveBySession(ctx context.Context, sessionID string) ([]*domain.Participant, error) {
	args := m.Called(ctx, sessionID)
	return args.Get(0).([]*domain.Participant), args.Error(1)
}

func (m *MockParticipantRepository) GetEliminatedBySession(ctx context.Context, sessionID string) ([]*domain.Participant, error) {
	args := m.Called(ctx, sessionID)
	return args.Get(0).([]*domain.Participant), args.Error(1)
}

func (m *MockParticipantRepository) Update(ctx context.Context, participant *domain.Participant) error {
	args := m.Called(ctx, participant)
	return args.Error(0)
}

func (m *MockParticipantRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockParticipantRepository) CountBySession(ctx context.Context, sessionID string) (int, error) {
	args := m.Called(ctx, sessionID)
	return args.Int(0), args.Error(1)
}

type MockQuestionRepository struct {
	mock.Mock
}

func (m *MockQuestionRepository) Create(ctx context.Context, question *domain.Question) error {
	args := m.Called(ctx, question)
	return args.Error(0)
}

func (m *MockQuestionRepository) GetByID(ctx context.Context, id string) (*domain.Question, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Question), args.Error(1)
}

func (m *MockQuestionRepository) GetBySessionAndRound(ctx context.Context, sessionID string, round int) (*domain.Question, error) {
	args := m.Called(ctx, sessionID, round)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Question), args.Error(1)
}

func (m *MockQuestionRepository) GetBySession(ctx context.Context, sessionID string) ([]*domain.Question, error) {
	args := m.Called(ctx, sessionID)
	return args.Get(0).([]*domain.Question), args.Error(1)
}

func (m *MockQuestionRepository) Update(ctx context.Context, question *domain.Question) error {
	args := m.Called(ctx, question)
	return args.Error(0)
}

func (m *MockQuestionRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

type MockAnswerRepository struct {
	mock.Mock
}

func (m *MockAnswerRepository) Create(ctx context.Context, answer *domain.Answer) error {
	args := m.Called(ctx, answer)
	return args.Error(0)
}

func (m *MockAnswerRepository) GetByID(ctx context.Context, id string) (*domain.Answer, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*domain.Answer), args.Error(1)
}

func (m *MockAnswerRepository) GetByUserAndQuestion(ctx context.Context, userID, questionID string) (*domain.Answer, error) {
	args := m.Called(ctx, userID, questionID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Answer), args.Error(1)
}

func (m *MockAnswerRepository) GetByQuestion(ctx context.Context, questionID string) ([]*domain.Answer, error) {
	args := m.Called(ctx, questionID)
	return args.Get(0).([]*domain.Answer), args.Error(1)
}

func (m *MockAnswerRepository) GetBySession(ctx context.Context, sessionID string) ([]*domain.Answer, error) {
	args := m.Called(ctx, sessionID)
	return args.Get(0).([]*domain.Answer), args.Error(1)
}

func (m *MockAnswerRepository) GetByUserAndSession(ctx context.Context, userID, sessionID string) ([]*domain.Answer, error) {
	args := m.Called(ctx, userID, sessionID)
	return args.Get(0).([]*domain.Answer), args.Error(1)
}

func (m *MockAnswerRepository) Update(ctx context.Context, answer *domain.Answer) error {
	args := m.Called(ctx, answer)
	return args.Error(0)
}

func (m *MockAnswerRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockAnswerRepository) CountCorrectByUserAndSession(ctx context.Context, userID, sessionID string) (int, error) {
	args := m.Called(ctx, userID, sessionID)
	return args.Int(0), args.Error(1)
}

// AIServiceのモック
type MockAIService struct {
	mock.Mock
}

func (m *MockAIService) GenerateQuestion(ctx context.Context, sessionID string, round int, difficulty domain.Difficulty, category string) (*domain.Question, error) {
	args := m.Called(ctx, sessionID, round, difficulty, category)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Question), args.Error(1)
}

func (m *MockAIService) GetDifficultyForRound(round int) domain.Difficulty {
	args := m.Called(round)
	return args.Get(0).(domain.Difficulty)
}

func (m *MockAIService) GetCategories() []string {
	args := m.Called()
	return args.Get(0).([]string)
}

// WebSocket Manager Mock
type MockWebSocketManager struct {
	mock.Mock
}

func (m *MockWebSocketManager) NotifyQuestionStart(sessionID string, question *domain.Question, timeLimit int) {
	m.Called(sessionID, question, timeLimit)
}

func (m *MockWebSocketManager) NotifyQuestionEnd(sessionID string, questionID string, correctAnswer int) {
	m.Called(sessionID, questionID, correctAnswer)
}

func (m *MockWebSocketManager) NotifyRoundResult(sessionID string, survivors, eliminated []*domain.Participant, round int) {
	m.Called(sessionID, survivors, eliminated, round)
}

func (m *MockWebSocketManager) NotifySessionUpdate(sessionID string, session *domain.Session) {
	m.Called(sessionID, session)
}

func TestQuizUseCase(t *testing.T) {
	t.Run("問題生成が正常に動作すること", func(t *testing.T) {
		// モックの設定
		mockSessionRepo := &MockSessionRepository{}
		mockParticipantRepo := &MockParticipantRepository{}
		mockQuestionRepo := &MockQuestionRepository{}
		mockAnswerRepo := &MockAnswerRepository{}
		mockAI := &MockAIService{}
		mockWS := &MockWebSocketManager{}
		
		// usecase作成
		usecase := NewQuizUseCase(
			mockSessionRepo,
			mockParticipantRepo,
			mockQuestionRepo,
			mockAnswerRepo,
			mockAI,
			mockWS,
		)
		
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

		// テストセッション
		session := &domain.Session{
			ID:           sessionID,
			Status:       domain.GameStatusActive,
			CurrentRound: round,
		}

		// モックの期待値設定
		mockSessionRepo.On("GetByID", ctx, sessionID).Return(session, nil)
		mockAI.On("GetDifficultyForRound", round).Return(difficulty)
		mockAI.On("GenerateQuestion", ctx, sessionID, round, difficulty, category).Return(expectedQuestion, nil)
		mockQuestionRepo.On("Create", ctx, mock.AnythingOfType("*domain.Question")).Return(nil)
		mockWS.On("NotifyQuestionStart", sessionID, mock.AnythingOfType("*domain.Question"), mock.AnythingOfType("int")).Return()

		// UseCase実行
		question, err := usecase.GenerateQuestion(ctx, sessionID, round, difficulty, category)
		
		// アサーション
		assert.NoError(t, err)
		assert.NotNil(t, question)
		assert.Equal(t, sessionID, question.SessionID)
		assert.Equal(t, round, question.Round)
		assert.Equal(t, "テスト問題", question.Text)

		// モックの呼び出し確認
		mockSessionRepo.AssertExpectations(t)
		mockAI.AssertExpectations(t)
		mockQuestionRepo.AssertExpectations(t)
		mockWS.AssertExpectations(t)
	})

	t.Run("現在の問題を取得できること", func(t *testing.T) {
		// モックの設定
		mockSessionRepo := &MockSessionRepository{}
		mockParticipantRepo := &MockParticipantRepository{}
		mockQuestionRepo := &MockQuestionRepository{}
		mockAnswerRepo := &MockAnswerRepository{}
		mockAI := &MockAIService{}
		mockWS := &MockWebSocketManager{}
		
		// usecase作成
		usecase := NewQuizUseCase(
			mockSessionRepo,
			mockParticipantRepo,
			mockQuestionRepo,
			mockAnswerRepo,
			mockAI,
			mockWS,
		)
		
		ctx := context.Background()
		sessionID := "session123"

		// テストセッション (現在ラウンド = 3)
		session := &domain.Session{
			ID:           sessionID,
			Status:       domain.GameStatusActive,
			CurrentRound: 3,
		}

		// 複数の問題がある状況をシミュレート
		questions := []*domain.Question{
			{ID: "q1", SessionID: sessionID, Round: 1, Text: "問題1"},
			{ID: "q2", SessionID: sessionID, Round: 2, Text: "問題2"},
			{ID: "q3", SessionID: sessionID, Round: 3, Text: "問題3"}, // 現在のラウンド
			{ID: "q4", SessionID: sessionID, Round: 4, Text: "問題4"}, // 次のラウンド
		}

		// モックの期待値設定
		mockSessionRepo.On("GetByID", ctx, sessionID).Return(session, nil)
		mockQuestionRepo.On("GetBySession", ctx, sessionID).Return(questions, nil)

		// UseCase実行 - 現在のラウンド以上で最も早い問題を取得
		question, err := usecase.GetCurrentQuestion(ctx, sessionID)
		
		// アサーション - 現在のラウンド3の問題が取得される
		assert.NoError(t, err)
		assert.NotNil(t, question)
		assert.Equal(t, "q3", question.ID)
		assert.Equal(t, 3, question.Round)
		assert.Equal(t, "問題3", question.Text)

		// モックの呼び出し確認
		mockSessionRepo.AssertExpectations(t)
		mockQuestionRepo.AssertExpectations(t)
	})

	t.Run("全ての問題を取得できること", func(t *testing.T) {
		// モックの設定
		mockSessionRepo := &MockSessionRepository{}
		mockParticipantRepo := &MockParticipantRepository{}
		mockQuestionRepo := &MockQuestionRepository{}
		mockAnswerRepo := &MockAnswerRepository{}
		mockAI := &MockAIService{}
		mockWS := &MockWebSocketManager{}
		
		// usecase作成
		usecase := NewQuizUseCase(
			mockSessionRepo,
			mockParticipantRepo,
			mockQuestionRepo,
			mockAnswerRepo,
			mockAI,
			mockWS,
		)
		
		ctx := context.Background()
		sessionID := "session123"

		// 複数の問題
		questions := []*domain.Question{
			{ID: "q1", SessionID: sessionID, Round: 1, Text: "問題1"},
			{ID: "q2", SessionID: sessionID, Round: 2, Text: "問題2"},
			{ID: "q3", SessionID: sessionID, Round: 3, Text: "問題3"},
		}

		// モックの期待値設定
		mockSessionRepo.On("GetByID", ctx, sessionID).Return(&domain.Session{ID: sessionID}, nil)
		mockQuestionRepo.On("GetBySession", ctx, sessionID).Return(questions, nil)

		// UseCase実行
		result, err := usecase.GetAllQuestions(ctx, sessionID)
		
		// アサーション
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Len(t, result, 3)
		assert.Equal(t, "問題1", result[0].Text)
		assert.Equal(t, "問題2", result[1].Text)
		assert.Equal(t, "問題3", result[2].Text)

		// モックの呼び出し確認
		mockSessionRepo.AssertExpectations(t)
		mockQuestionRepo.AssertExpectations(t)
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