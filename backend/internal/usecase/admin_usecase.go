package usecase

import (
	"context"
	"encoding/csv"
	"fmt"
	"math/rand"
	"quiz-app/internal/domain"
	"quiz-app/internal/repository"
	"quiz-app/internal/websocket"
	"strings"
	"time"
)

type adminUseCase struct {
	sessionRepo     repository.SessionRepository
	participantRepo repository.ParticipantRepository
	questionRepo    repository.QuestionRepository
	answerRepo      repository.AnswerRepository
	wsManager       *websocket.Manager
}

func NewAdminUseCase(
	sessionRepo repository.SessionRepository,
	participantRepo repository.ParticipantRepository,
	questionRepo repository.QuestionRepository,
	answerRepo repository.AnswerRepository,
	wsManager *websocket.Manager,
) AdminUseCase {
	return &adminUseCase{
		sessionRepo:     sessionRepo,
		participantRepo: participantRepo,
		questionRepo:    questionRepo,
		answerRepo:      answerRepo,
		wsManager:       wsManager,
	}
}

func (u *adminUseCase) GetSessionStats(ctx context.Context, sessionID string) (map[string]interface{}, error) {
	if sessionID == "" {
		return nil, domain.ErrInvalidInput
	}

	session, err := u.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, domain.ErrSessionNotFound
	}

	// 参加者情報
	allParticipants, err := u.participantRepo.GetBySession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get participants: %w", err)
	}

	activeParticipants, err := u.participantRepo.GetActiveBySession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get active participants: %w", err)
	}

	eliminatedParticipants, err := u.participantRepo.GetEliminatedBySession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get eliminated participants: %w", err)
	}

	// 問題情報
	questions, err := u.questionRepo.GetBySession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get questions: %w", err)
	}

	// 回答情報
	answers, err := u.answerRepo.GetBySession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get answers: %w", err)
	}

	// 統計計算
	totalAnswers := len(answers)
	correctAnswers := 0
	for _, answer := range answers {
		if answer.IsCorrect {
			correctAnswers++
		}
	}

	correctRate := 0.0
	if totalAnswers > 0 {
		correctRate = float64(correctAnswers) / float64(totalAnswers) * 100
	}

	// WebSocket接続数
	connectedCount := u.wsManager.GetSessionClientCount(sessionID)

	stats := map[string]interface{}{
		"session": map[string]interface{}{
			"id":           session.ID,
			"title":        session.Title,
			"status":       string(session.Status),
			"currentRound": session.CurrentRound,
			"createdAt":    session.CreatedAt,
		},
		"participants": map[string]interface{}{
			"total":      len(allParticipants),
			"active":     len(activeParticipants),
			"eliminated": len(eliminatedParticipants),
			"connected":  connectedCount,
		},
		"questions": map[string]interface{}{
			"total": len(questions),
		},
		"answers": map[string]interface{}{
			"total":       totalAnswers,
			"correct":     correctAnswers,
			"correctRate": correctRate,
		},
	}

	return stats, nil
}

func (u *adminUseCase) StartRevival(ctx context.Context, sessionID string, count int) ([]*domain.Participant, error) {
	if sessionID == "" {
		return nil, domain.ErrInvalidInput
	}
	if count <= 0 {
		count = 1 // デフォルトで1人復活
	}

	session, err := u.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, domain.ErrSessionNotFound
	}

	if !session.IsActive() {
		return nil, domain.ErrSessionNotActive
	}

	if !session.Settings.RevivalEnabled {
		return nil, fmt.Errorf("revival is not enabled for this session")
	}

	// 脱落者取得
	eliminatedParticipants, err := u.participantRepo.GetEliminatedBySession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get eliminated participants: %w", err)
	}

	if len(eliminatedParticipants) == 0 {
		return nil, fmt.Errorf("no eliminated participants available for revival")
	}

	// 復活者をランダムに選出
	reviveCount := count
	if reviveCount > len(eliminatedParticipants) {
		reviveCount = len(eliminatedParticipants)
	}
	if reviveCount > session.Settings.RevivalCount {
		reviveCount = session.Settings.RevivalCount
	}

	// 復活通知開始
	u.wsManager.NotifyRevivalStart(sessionID, eliminatedParticipants)

	// 少し待ってからランダム選出
	time.Sleep(3 * time.Second)

	revivedParticipants := u.selectRandomParticipants(eliminatedParticipants, reviveCount)

	// 復活処理
	for _, participant := range revivedParticipants {
		participant.Revive()
		if err := u.participantRepo.Update(ctx, participant); err != nil {
			return nil, fmt.Errorf("failed to revive participant %s: %w", participant.ID, err)
		}
	}

	// 復活結果通知
	u.wsManager.NotifyRevivalResult(sessionID, revivedParticipants)

	return revivedParticipants, nil
}

func (u *adminUseCase) selectRandomParticipants(participants []*domain.Participant, count int) []*domain.Participant {
	if count >= len(participants) {
		return participants
	}

	// Fisher-Yates shuffle algorithm
	rand.Seed(time.Now().UnixNano())
	shuffled := make([]*domain.Participant, len(participants))
	copy(shuffled, participants)

	for i := len(shuffled) - 1; i > 0; i-- {
		j := rand.Intn(i + 1)
		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
	}

	return shuffled[:count]
}

func (u *adminUseCase) ExportResults(ctx context.Context, sessionID string) ([]byte, error) {
	if sessionID == "" {
		return nil, domain.ErrInvalidInput
	}

	session, err := u.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, domain.ErrSessionNotFound
	}

	// 参加者データ取得
	participants, err := u.participantRepo.GetBySession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get participants: %w", err)
	}

	// 問題データ取得
	questions, err := u.questionRepo.GetBySession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get questions: %w", err)
	}

	// 回答データ取得
	answers, err := u.answerRepo.GetBySession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get answers: %w", err)
	}

	// CSV形式でエクスポート
	var csvData strings.Builder
	writer := csv.NewWriter(&csvData)

	// ヘッダー行
	header := []string{
		"セッションID", "セッション名", "参加者ID", "表示名", "ステータス",
		"スコア", "正解数", "参加時刻", "脱落時刻", "復活時刻",
	}
	
	// 各問題の列を追加
	for _, question := range questions {
		header = append(header, fmt.Sprintf("Q%d_回答", question.Round))
		header = append(header, fmt.Sprintf("Q%d_正解", question.Round))
		header = append(header, fmt.Sprintf("Q%d_回答時間", question.Round))
	}

	writer.Write(header)

	// 各参加者のデータ行
	for _, participant := range participants {
		row := []string{
			session.ID,
			session.Title,
			participant.UserID,
			participant.DisplayName,
			string(participant.Status),
			fmt.Sprintf("%d", participant.Score),
			fmt.Sprintf("%d", participant.CorrectAnswers),
			participant.JoinedAt.Format("2006-01-02 15:04:05"),
		}

		// 脱落時刻
		if participant.EliminatedAt != nil {
			row = append(row, participant.EliminatedAt.Format("2006-01-02 15:04:05"))
		} else {
			row = append(row, "")
		}

		// 復活時刻
		if participant.RevivedAt != nil {
			row = append(row, participant.RevivedAt.Format("2006-01-02 15:04:05"))
		} else {
			row = append(row, "")
		}

		// 各問題の回答データ
		for _, question := range questions {
			answer := u.findAnswerByUserAndQuestion(answers, participant.UserID, question.ID)
			if answer != nil {
				row = append(row, fmt.Sprintf("%d", answer.SelectedOption))
				if answer.IsCorrect {
					row = append(row, "○")
				} else {
					row = append(row, "×")
				}
				row = append(row, fmt.Sprintf("%d", answer.ResponseTime))
			} else {
				row = append(row, "", "", "")
			}
		}

		writer.Write(row)
	}

	writer.Flush()
	return []byte(csvData.String()), nil
}

func (u *adminUseCase) findAnswerByUserAndQuestion(answers []*domain.Answer, userID, questionID string) *domain.Answer {
	for _, answer := range answers {
		if answer.UserID == userID && answer.QuestionID == questionID {
			return answer
		}
	}
	return nil
}

func (u *adminUseCase) SkipQuestion(ctx context.Context, sessionID string) error {
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

	// 現在の問題を取得
	currentQuestion, err := u.questionRepo.GetBySessionAndRound(ctx, sessionID, session.CurrentRound)
	if err != nil {
		return domain.ErrQuestionNotFound
	}

	// 問題終了通知（正解は表示しない）
	u.wsManager.NotifyQuestionEnd(sessionID, currentQuestion.ID, -1)

	// 次のラウンドに進む
	if err := session.NextRound(); err != nil {
		return err
	}

	if err := u.sessionRepo.Update(ctx, session); err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}

	// セッション更新通知
	u.wsManager.NotifySessionUpdate(sessionID, session)

	return nil
}