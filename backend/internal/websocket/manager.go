package websocket

import (
	"net/http"
	"quiz-app/internal/domain"
)

type Manager struct {
	hub *Hub
}

func NewManager() *Manager {
	hub := NewHub()
	go hub.Run()

	return &Manager{
		hub: hub,
	}
}

func (m *Manager) HandleWebSocket(w http.ResponseWriter, r *http.Request, userID, sessionID, displayName string, isAdmin bool) error {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return err
	}

	client := NewClient(m.hub, conn, userID, sessionID, displayName, isAdmin)
	
	// クライアントをハブに登録
	m.hub.register <- client

	// ゴルーチンを起動してクライアントの読み書きを処理
	go client.WritePump()
	go client.ReadPump()

	return nil
}

// 問題開始の通知
func (m *Manager) NotifyQuestionStart(sessionID string, question *domain.Question, timeLimit int) {
	msg := Message{
		Type:      string(MessageTypeQuestionStart),
		SessionID: sessionID,
		Data: map[string]interface{}{
			"question": map[string]interface{}{
				"id":       question.ID,
				"text":     question.Text,
				"options":  question.Options,
				"round":    question.Round,
				"category": question.Category,
			},
			"timeLimit": timeLimit,
		},
		Timestamp: getCurrentTimestamp(),
	}

	m.hub.BroadcastToSession(sessionID, msg)
}

// 問題終了の通知
func (m *Manager) NotifyQuestionEnd(sessionID string, questionID string, correctAnswer int) {
	msg := Message{
		Type:      string(MessageTypeQuestionEnd),
		SessionID: sessionID,
		Data: map[string]interface{}{
			"questionId":    questionID,
			"correctAnswer": correctAnswer,
		},
		Timestamp: getCurrentTimestamp(),
	}

	m.hub.BroadcastToSession(sessionID, msg)
}

// ラウンド結果の通知
func (m *Manager) NotifyRoundResult(sessionID string, survivors []*domain.Participant, eliminated []*domain.Participant, round int) {
	survivorData := make([]map[string]interface{}, len(survivors))
	for i, p := range survivors {
		survivorData[i] = map[string]interface{}{
			"userId":      p.UserID,
			"displayName": p.DisplayName,
			"score":       p.Score,
		}
	}

	eliminatedData := make([]map[string]interface{}, len(eliminated))
	for i, p := range eliminated {
		eliminatedData[i] = map[string]interface{}{
			"userId":      p.UserID,
			"displayName": p.DisplayName,
			"score":       p.Score,
		}
	}

	msg := Message{
		Type:      string(MessageTypeRoundResult),
		SessionID: sessionID,
		Data: map[string]interface{}{
			"round":      round,
			"survivors":  survivorData,
			"eliminated": eliminatedData,
		},
		Timestamp: getCurrentTimestamp(),
	}

	m.hub.BroadcastToSession(sessionID, msg)
}

// セッション状態更新の通知
func (m *Manager) NotifySessionUpdate(sessionID string, session *domain.Session) {
	msg := Message{
		Type:      string(MessageTypeSessionUpdate),
		SessionID: sessionID,
		Data: map[string]interface{}{
			"status":       string(session.Status),
			"currentRound": session.CurrentRound,
			"participantCount": m.hub.GetSessionClientCount(sessionID),
		},
		Timestamp: getCurrentTimestamp(),
	}

	m.hub.BroadcastToSession(sessionID, msg)
}

// 敗者復活戦開始の通知
func (m *Manager) NotifyRevivalStart(sessionID string, candidates []*domain.Participant) {
	candidateData := make([]map[string]interface{}, len(candidates))
	for i, p := range candidates {
		candidateData[i] = map[string]interface{}{
			"userId":      p.UserID,
			"displayName": p.DisplayName,
		}
	}

	msg := Message{
		Type:      string(MessageTypeRevivalStart),
		SessionID: sessionID,
		Data: map[string]interface{}{
			"candidates": candidateData,
		},
		Timestamp: getCurrentTimestamp(),
	}

	m.hub.BroadcastToSession(sessionID, msg)
}

// 敗者復活戦結果の通知
func (m *Manager) NotifyRevivalResult(sessionID string, revived []*domain.Participant) {
	revivedData := make([]map[string]interface{}, len(revived))
	for i, p := range revived {
		revivedData[i] = map[string]interface{}{
			"userId":      p.UserID,
			"displayName": p.DisplayName,
		}
	}

	msg := Message{
		Type:      string(MessageTypeRevivalResult),
		SessionID: sessionID,
		Data: map[string]interface{}{
			"revived": revivedData,
		},
		Timestamp: getCurrentTimestamp(),
	}

	m.hub.BroadcastToSession(sessionID, msg)
}

// 特定のユーザーにエラーメッセージを送信
func (m *Manager) SendErrorToUser(userID, errorMsg string) {
	msg := Message{
		Type: string(MessageTypeError),
		Data: map[string]interface{}{
			"error": errorMsg,
		},
		Timestamp: getCurrentTimestamp(),
	}

	m.hub.BroadcastToUser(userID, msg)
}

// セッションの接続クライアント数を取得
func (m *Manager) GetSessionClientCount(sessionID string) int {
	return m.hub.GetSessionClientCount(sessionID)
}

// セッションに接続中のユーザーIDリストを取得
func (m *Manager) GetConnectedUserIDs(sessionID string) []string {
	return m.hub.GetConnectedUserIDs(sessionID)
}

// ユーザーがセッションに接続中かチェック
func (m *Manager) IsUserConnected(sessionID, userID string) bool {
	return m.hub.IsUserConnected(sessionID, userID)
}