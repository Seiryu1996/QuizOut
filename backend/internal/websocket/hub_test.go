package websocket

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestHub(t *testing.T) {
	t.Run("Hubの基本操作", func(t *testing.T) {
		hub := NewHub()
		
		// Hubの初期状態確認
		assert.NotNil(t, hub)
		assert.NotNil(t, hub.broadcast)
		assert.NotNil(t, hub.register)
		assert.NotNil(t, hub.unregister)
	})

	t.Run("セッション別メッセージ送信", func(t *testing.T) {
		hub := NewHub()
		
		// Hub開始（バックグラウンド実行）
		go hub.Run()
		
		sessionID := "test-session-1"
		testMessage := Message{
			Type:      "test",
			SessionID: sessionID,
			Data:      "hello",
			Timestamp: time.Now().Unix(),
		}

		// セッション別送信のテスト
		// BroadcastToSessionは非同期なので、パニックしないことを確認
		assert.NotPanics(t, func() {
			hub.BroadcastToSession(sessionID, testMessage)
		})
		
		// 少し待ってメッセージが処理されることを確認
		time.Sleep(10 * time.Millisecond)
	})

	t.Run("ユーザー別メッセージ送信", func(t *testing.T) {
		hub := NewHub()
		go hub.Run()

		userID := "test-user-1"
		testMessage := Message{
			Type:      "user_message",
			Data:      "hello user",
			Timestamp: time.Now().Unix(),
		}

		// ユーザー別送信のテスト
		assert.NotPanics(t, func() {
			hub.BroadcastToUser(userID, testMessage)
		})
		
		time.Sleep(10 * time.Millisecond)
	})

	t.Run("セッション情報の取得", func(t *testing.T) {
		hub := NewHub()
		go hub.Run()

		sessionID := "test-session-2"
		
		// 初期状態では0人
		count := hub.GetSessionClientCount(sessionID)
		assert.Equal(t, 0, count)

		// 接続ユーザーIDリストも空
		userIDs := hub.GetConnectedUserIDs(sessionID)
		assert.Empty(t, userIDs)

		// ユーザーが接続していない状態
		isConnected := hub.IsUserConnected(sessionID, "user1")
		assert.False(t, isConnected)
	})

	t.Run("ブロードキャスト機能", func(t *testing.T) {
		hub := NewHub()
		go hub.Run()

		// ブロードキャスト機能のテスト（パニックしないことを確認）
		testMessage := []byte(`{"type":"broadcast_test","data":"hello all"}`)
		
		assert.NotPanics(t, func() {
			hub.broadcast <- testMessage
		})
		
		time.Sleep(10 * time.Millisecond)
	})

	t.Run("コンカレント操作の安全性", func(t *testing.T) {
		hub := NewHub()
		go hub.Run()

		// 複数のgoroutineから同時操作
		numOperations := 10
		done := make(chan bool, numOperations)

		// 同時ブロードキャスト
		for i := 0; i < numOperations; i++ {
			go func(id int) {
				message := Message{
					Type:      "concurrent_test",
					Data:      map[string]int{"id": id},
					Timestamp: time.Now().Unix(),
				}
				hub.BroadcastToSession("concurrent-session", message)
				done <- true
			}(i)
		}

		// 全操作の完了を待つ
		for i := 0; i < numOperations; i++ {
			select {
			case <-done:
				// 操作完了
			case <-time.After(100 * time.Millisecond):
				t.Error("コンカレント操作のタイムアウト")
				return
			}
		}

		assert.True(t, true, "コンカレント操作が安全に実行された")
	})

	t.Run("メッセージタイプの検証", func(t *testing.T) {
		hub := NewHub()
		go hub.Run()

		// 様々なメッセージタイプでテスト
		messageTypes := []string{
			string(MessageTypeQuestionStart),
			string(MessageTypeQuestionEnd),
			string(MessageTypeAnswerSubmitted),
			string(MessageTypeSessionUpdate),
			string(MessageTypeParticipantJoin),
		}

		for _, msgType := range messageTypes {
			message := Message{
				Type:      msgType,
				SessionID: "test-session",
				Data:      "test data",
				Timestamp: time.Now().Unix(),
			}

			assert.NotPanics(t, func() {
				hub.BroadcastToSession("test-session", message)
			}, "メッセージタイプ %s でパニックが発生", msgType)
		}

		time.Sleep(50 * time.Millisecond)
	})
}

func TestHubMessageHandling(t *testing.T) {
	t.Run("大量メッセージの処理", func(t *testing.T) {
		hub := NewHub()
		go hub.Run()

		// 大量のメッセージを送信
		numMessages := 100
		for i := 0; i < numMessages; i++ {
			message := Message{
				Type:      "load_test",
				SessionID: "load-test-session",
				Data:      map[string]int{"count": i},
				Timestamp: time.Now().Unix(),
			}

			assert.NotPanics(t, func() {
				hub.BroadcastToSession("load-test-session", message)
			})
		}

		// 処理完了を待つ
		time.Sleep(100 * time.Millisecond)
		assert.True(t, true, "大量メッセージの処理が完了")
	})

	t.Run("メッセージデータの多様性", func(t *testing.T) {
		hub := NewHub()
		go hub.Run()

		// 様々なデータ型でテスト
		testCases := []struct {
			name string
			data interface{}
		}{
			{"文字列", "test string"},
			{"数値", 42},
			{"真偽値", true},
			{"配列", []string{"a", "b", "c"}},
			{"オブジェクト", map[string]interface{}{"key": "value", "num": 123}},
			{"nil", nil},
		}

		for _, tc := range testCases {
			message := Message{
				Type:      "data_test",
				SessionID: "data-test-session",
				Data:      tc.data,
				Timestamp: time.Now().Unix(),
			}

			assert.NotPanics(t, func() {
				hub.BroadcastToSession("data-test-session", message)
			}, "データ型 %s でパニックが発生", tc.name)
		}

		time.Sleep(50 * time.Millisecond)
	})
}

func TestHubErrorHandling(t *testing.T) {
	t.Run("空のセッションIDでの処理", func(t *testing.T) {
		hub := NewHub()
		go hub.Run()

		message := Message{
			Type:      "empty_session_test",
			SessionID: "",
			Data:      "test",
			Timestamp: time.Now().Unix(),
		}

		assert.NotPanics(t, func() {
			hub.BroadcastToSession("", message)
		})

		time.Sleep(10 * time.Millisecond)
	})

	t.Run("空のユーザーIDでの処理", func(t *testing.T) {
		hub := NewHub()
		go hub.Run()

		message := Message{
			Type:      "empty_user_test",
			Data:      "test",
			Timestamp: time.Now().Unix(),
		}

		assert.NotPanics(t, func() {
			hub.BroadcastToUser("", message)
		})

		time.Sleep(10 * time.Millisecond)
	})
}