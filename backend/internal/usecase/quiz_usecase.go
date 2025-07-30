package usecase

import (
	"context"
	"fmt"
	"quiz-app/internal/domain"
	"quiz-app/internal/repository"
	"quiz-app/internal/service"
	"quiz-app/internal/websocket"
	"time"
)

type quizUseCase struct {
	sessionRepo     repository.SessionRepository
	participantRepo repository.ParticipantRepository
	questionRepo    repository.QuestionRepository
	answerRepo      repository.AnswerRepository
	aiService       *service.AIService
	wsManager       *websocket.Manager
}

func NewQuizUseCase(
	sessionRepo repository.SessionRepository,
	participantRepo repository.ParticipantRepository,
	questionRepo repository.QuestionRepository,
	answerRepo repository.AnswerRepository,
	aiService *service.AIService,
	wsManager *websocket.Manager,
) QuizUseCase {
	return &quizUseCase{
		sessionRepo:     sessionRepo,
		participantRepo: participantRepo,
		questionRepo:    questionRepo,
		answerRepo:      answerRepo,
		aiService:       aiService,
		wsManager:       wsManager,
	}
}

func (u *quizUseCase) GenerateQuestion(ctx context.Context, sessionID string, round int, difficulty domain.Difficulty, category string) (*domain.Question, error) {
	if sessionID == "" {
		return nil, domain.ErrInvalidInput
	}

	// セッション確認
	session, err := u.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, domain.ErrSessionNotFound
	}

	if session.IsFinished() {
		return nil, domain.ErrSessionNotActive
	}

	// 問題を順次蓄積していくため、指定されたラウンドの問題をそのまま生成
	// 重複チェックは行わず、管理者が明示的に問題を生成できるようにする

	// 難易度をラウンドに応じて自動調整
	if difficulty == "" {
		difficulty = u.aiService.GetDifficultyForRound(round)
	}

	// カテゴリをランダムに選択
	if category == "" {
		categories := u.aiService.GetCategories()
		if len(categories) > 0 {
			// 簡単なランダム選択（実際にはより良い方法を使用）
			category = categories[round%len(categories)]
		}
	}

	// AI で問題生成
	question, err := u.aiService.GenerateQuestion(ctx, sessionID, round, difficulty, category)
	if err != nil {
		return nil, fmt.Errorf("failed to generate question: %w", err)
	}

	// 問題を保存
	if err := u.questionRepo.Create(ctx, question); err != nil {
		return nil, fmt.Errorf("failed to save question: %w", err)
	}

	// WebSocketで問題開始通知
	u.wsManager.NotifyQuestionStart(sessionID, question, session.Settings.TimeLimit)

	return question, nil
}

func (u *quizUseCase) GetCurrentQuestion(ctx context.Context, sessionID string) (*domain.Question, error) {
	if sessionID == "" {
		return nil, domain.ErrInvalidInput
	}

	session, err := u.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, domain.ErrSessionNotFound
	}

	// 全ての問題を取得して、現在のラウンド以上で最も早いラウンドの問題を取得
	questions, err := u.questionRepo.GetBySession(ctx, sessionID)
	if err != nil {
		return nil, domain.ErrQuestionNotFound
	}

	// 現在のラウンド以上の問題から最も早いものを選択
	var currentQuestion *domain.Question
	for _, q := range questions {
		if q.Round >= session.CurrentRound {
			if currentQuestion == nil || q.Round < currentQuestion.Round {
				currentQuestion = q
			}
		}
	}

	if currentQuestion == nil {
		return nil, domain.ErrQuestionNotFound
	}

	return currentQuestion, nil
}

func (u *quizUseCase) GetAllQuestions(ctx context.Context, sessionID string) ([]*domain.Question, error) {
	if sessionID == "" {
		return nil, domain.ErrInvalidInput
	}

	_, err := u.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, domain.ErrSessionNotFound
	}

	questions, err := u.questionRepo.GetBySession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get questions: %w", err)
	}

	return questions, nil
}

func (u *quizUseCase) SubmitAnswer(ctx context.Context, sessionID, userID, questionID string, selectedOption, responseTime int) (*domain.Answer, error) {
	if sessionID == "" || userID == "" || questionID == "" {
		return nil, domain.ErrInvalidInput
	}

	// セッション確認
	session, err := u.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, domain.ErrSessionNotFound
	}

	if !session.IsActive() {
		return nil, domain.ErrSessionNotActive
	}

	// 参加者確認
	participant, err := u.participantRepo.GetByUserAndSession(ctx, userID, sessionID)
	if err != nil {
		return nil, domain.ErrParticipantNotFound
	}

	if !participant.IsActive() {
		return nil, domain.ErrParticipantEliminated
	}

	// 問題確認
	question, err := u.questionRepo.GetByID(ctx, questionID)
	if err != nil {
		return nil, domain.ErrQuestionNotFound
	}

	// 既に回答済みかチェック
	existingAnswer, err := u.answerRepo.GetByUserAndQuestion(ctx, userID, questionID)
	if err == nil && existingAnswer != nil {
		return existingAnswer, nil
	}

	// 回答作成
	answer := domain.NewAnswer(userID, sessionID, questionID, selectedOption, responseTime)
	
	// 正解判定
	isCorrect := question.ValidateAnswer(selectedOption)
	answer.SetCorrect(isCorrect)

	// 回答保存
	if err := u.answerRepo.Create(ctx, answer); err != nil {
		return nil, fmt.Errorf("failed to save answer: %w", err)
	}

	// 正解の場合、参加者のスコア更新
	if isCorrect {
		points := question.GetPoints()
		participant.AddCorrectAnswer(points)
		if err := u.participantRepo.Update(ctx, participant); err != nil {
			return nil, fmt.Errorf("failed to update participant score: %w", err)
		}
	}

	return answer, nil
}

func (u *quizUseCase) ProcessRoundResults(ctx context.Context, sessionID string, questionID string) ([]*domain.Participant, []*domain.Participant, error) {
	if sessionID == "" || questionID == "" {
		return nil, nil, domain.ErrInvalidInput
	}

	// セッション確認
	session, err := u.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, nil, domain.ErrSessionNotFound
	}

	// 問題確認
	question, err := u.questionRepo.GetByID(ctx, questionID)
	if err != nil {
		return nil, nil, domain.ErrQuestionNotFound
	}

	// アクティブな参加者取得
	activeParticipants, err := u.participantRepo.GetActiveBySession(ctx, sessionID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get active participants: %w", err)
	}

	var survivors []*domain.Participant
	var eliminated []*domain.Participant

	// 各参加者の回答をチェック
	for _, participant := range activeParticipants {
		answer, err := u.answerRepo.GetByUserAndQuestion(ctx, participant.UserID, questionID)
		
		if err != nil || !answer.IsCorrect {
			// 不正解または無回答の場合は脱落
			participant.Eliminate()
			if err := u.participantRepo.Update(ctx, participant); err != nil {
				return nil, nil, fmt.Errorf("failed to eliminate participant: %w", err)
			}
			eliminated = append(eliminated, participant)
		} else {
			// 正解の場合は生き残り
			survivors = append(survivors, participant)
		}
	}

	// WebSocketで問題終了通知
	u.wsManager.NotifyQuestionEnd(sessionID, questionID, question.CorrectAnswer)

	// 少し待ってからラウンド結果通知
	time.Sleep(2 * time.Second)
	u.wsManager.NotifyRoundResult(sessionID, survivors, eliminated, session.CurrentRound)

	// 生き残りが1人以下の場合はゲーム終了
	if len(survivors) <= 1 {
		session.Finish()
		if err := u.sessionRepo.Update(ctx, session); err != nil {
			return nil, nil, fmt.Errorf("failed to finish session: %w", err)
		}
		u.wsManager.NotifySessionUpdate(sessionID, session)
	}

	return survivors, eliminated, nil
}

func (u *quizUseCase) NextRound(ctx context.Context, sessionID string) error {
	if sessionID == "" {
		return domain.ErrInvalidInput
	}

	session, err := u.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return domain.ErrSessionNotFound
	}

	if !session.IsActive() {
		return domain.ErrSessionNotActive
	}

	// アクティブな参加者数をチェック
	activeParticipants, err := u.participantRepo.GetActiveBySession(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("failed to get active participants: %w", err)
	}

	if len(activeParticipants) <= 1 {
		// 1人以下の場合はゲーム終了
		return u.finishGame(ctx, sessionID, session)
	}

	// 次のラウンドに進む
	if err := session.NextRound(); err != nil {
		return err
	}

	if err := u.sessionRepo.Update(ctx, session); err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}

	// WebSocketでセッション更新通知
	u.wsManager.NotifySessionUpdate(sessionID, session)

	return nil
}

func (u *quizUseCase) finishGame(ctx context.Context, sessionID string, session *domain.Session) error {
	if err := session.Finish(); err != nil {
		return err
	}

	if err := u.sessionRepo.Update(ctx, session); err != nil {
		return fmt.Errorf("failed to finish session: %w", err)
	}

	u.wsManager.NotifySessionUpdate(sessionID, session)
	return nil
}