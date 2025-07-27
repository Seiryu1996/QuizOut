package websocket

import (
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// テスト用のクライアント構造体
type TestClient struct {
	userID     string
	sessionID  string
	send       chan []byte
	hub        *Hub
	conn       *TestWebSocketConn
	closeOnce  sync.Once
	isActive   bool
	mutex      sync.RWMutex
}

func NewTestClient(userID, sessionID string, hub *Hub) *TestClient {
	return &TestClient{
		userID:    userID,
		sessionID: sessionID,
		send:      make(chan []byte, 256),
		hub:       hub,
		conn:      &TestWebSocketConn{},
		isActive:  true,
	}
}

func (c *TestClient) GetUserID() string {
	return c.userID
}

func (c *TestClient) GetSessionID() string {
	return c.sessionID
}

func (c *TestClient) SendMessage(message []byte) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	
	if c.isActive {
		select {
		case c.send <- message:
		default:
			// チャンネルが満杯の場合は無視
		}
	}
}

func (c *TestClient) Close() {
	c.closeOnce.Do(func() {
		c.mutex.Lock()
		c.isActive = false
		close(c.send)
		c.mutex.Unlock()
	})
}

func (c *TestClient) IsActive() bool {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	return c.isActive
}

// テスト用のWebSocket接続モック
type TestWebSocketConn struct {
	closed bool
}

func (c *TestWebSocketConn) Close() error {
	c.closed = true
	return nil
}

func TestHub(t *testing.T) {
	t.Run("Hubが正常に初期化されること", func(t *testing.T) {
		hub := NewHub()
		
		assert.NotNil(t, hub)
		assert.NotNil(t, hub.clients)
		assert.NotNil(t, hub.register)
		assert.NotNil(t, hub.unregister)
		assert.NotNil(t, hub.broadcast)
		assert.Equal(t, 0, len(hub.clients))
	})

	t.Run("クライアント登録・削除が正常に動作すること", func(t *testing.T) {
		hub := NewHub()
		go hub.Run()
		defer hub.Stop()

		// クライアント作成
		client := NewTestClient("test-user-1", "session-1", hub)

		// クライアント登録
		hub.register <- client
		time.Sleep(10 * time.Millisecond) // Hubの処理を待つ

		// 登録確認
		hub.clientsMutex.RLock()
		clientCount := len(hub.clients)
		_, exists := hub.clients[client]
		hub.clientsMutex.RUnlock()

		assert.Equal(t, 1, clientCount)
		assert.True(t, exists)

		// クライアント削除
		hub.unregister <- client
		time.Sleep(10 * time.Millisecond) // Hubの処理を待つ

		// 削除確認
		hub.clientsMutex.RLock()
		clientCount = len(hub.clients)
		_, exists = hub.clients[client]
		hub.clientsMutex.RUnlock()

		assert.Equal(t, 0, clientCount)
		assert.False(t, exists)
	})

	t.Run("複数クライアントの管理が正常に動作すること", func(t *testing.T) {
		hub := NewHub()
		go hub.Run()
		defer hub.Stop()

		// 複数クライアント作成
		client1 := NewTestClient("user-1", "session-1", hub)
		client2 := NewTestClient("user-2", "session-1", hub)
		client3 := NewTestClient("user-3", "session-2", hub)

		// 順次登録
		hub.register <- client1
		hub.register <- client2
		hub.register <- client3
		time.Sleep(20 * time.Millisecond)

		// 登録確認
		hub.clientsMutex.RLock()
		clientCount := len(hub.clients)
		hub.clientsMutex.RUnlock()

		assert.Equal(t, 3, clientCount)

		// 一部削除
		hub.unregister <- client2
		time.Sleep(10 * time.Millisecond)

		hub.clientsMutex.RLock()
		clientCount = len(hub.clients)
		_, exists1 := hub.clients[client1]
		_, exists2 := hub.clients[client2]
		_, exists3 := hub.clients[client3]
		hub.clientsMutex.RUnlock()

		assert.Equal(t, 2, clientCount)
		assert.True(t, exists1)
		assert.False(t, exists2)
		assert.True(t, exists3)
	})

	t.Run("全クライアントへのブロードキャストが正常に動作すること", func(t *testing.T) {
		hub := NewHub()
		go hub.Run()
		defer hub.Stop()

		// 複数クライアント作成・登録
		clients := make([]*TestClient, 5)
		for i := 0; i < 5; i++ {
			clients[i] = NewTestClient(fmt.Sprintf("user-%d", i), "session-1", hub)
			hub.register <- clients[i]
		}
		time.Sleep(20 * time.Millisecond)

		// ブロードキャストメッセージ送信
		testMessage := []byte("test broadcast message")
		broadcastMsg := &BroadcastMessage{
			Message:   testMessage,
			SessionID: "",  // 全セッション
		}
		hub.broadcast <- broadcastMsg
		time.Sleep(20 * time.Millisecond)

		// 全クライアントがメッセージを受信したか確認
		for i, client := range clients {
			select {
			case receivedMsg := <-client.send:
				assert.Equal(t, testMessage, receivedMsg, "client %d did not receive correct message", i)
			case <-time.After(100 * time.Millisecond):
				t.Errorf("client %d did not receive message", i)
			}
		}
	})

	t.Run("セッション別ブロードキャストが正常に動作すること", func(t *testing.T) {
		hub := NewHub()
		go hub.Run()
		defer hub.Stop()

		// 異なるセッションのクライアント作成
		session1Client1 := NewTestClient("user-1", "session-1", hub)
		session1Client2 := NewTestClient("user-2", "session-1", hub)
		session2Client1 := NewTestClient("user-3", "session-2", hub)

		hub.register <- session1Client1
		hub.register <- session1Client2
		hub.register <- session2Client1
		time.Sleep(20 * time.Millisecond)

		// セッション1のみにブロードキャスト
		testMessage := []byte("session-1 message")
		broadcastMsg := &BroadcastMessage{
			Message:   testMessage,
			SessionID: "session-1",
		}
		hub.broadcast <- broadcastMsg
		time.Sleep(20 * time.Millisecond)

		// セッション1のクライアントのみがメッセージを受信することを確認
		select {
		case receivedMsg := <-session1Client1.send:
			assert.Equal(t, testMessage, receivedMsg)
		case <-time.After(100 * time.Millisecond):
			t.Error("session1Client1 did not receive message")
		}

		select {
		case receivedMsg := <-session1Client2.send:
			assert.Equal(t, testMessage, receivedMsg)
		case <-time.After(100 * time.Millisecond):
			t.Error("session1Client2 did not receive message")
		}

		// セッション2のクライアントはメッセージを受信しないことを確認
		select {
		case <-session2Client1.send:
			t.Error("session2Client1 should not receive message")
		case <-time.After(50 * time.Millisecond):
			// 期待通り、メッセージを受信しない
		}
	})

	t.Run("大量クライアント接続時の処理が正常に動作すること", func(t *testing.T) {
		hub := NewHub()
		go hub.Run()
		defer hub.Stop()

		// 200クライアント同時接続をシミュレート
		clientCount := 200
		clients := make([]*TestClient, clientCount)

		// 同時登録
		var wg sync.WaitGroup
		for i := 0; i < clientCount; i++ {
			wg.Add(1)
			go func(index int) {
				defer wg.Done()
				clients[index] = NewTestClient(fmt.Sprintf("user-%d", index), "session-load-test", hub)
				hub.register <- clients[index]
			}(i)
		}
		wg.Wait()
		time.Sleep(100 * time.Millisecond) // 全ての登録処理を待つ

		// 登録確認
		hub.clientsMutex.RLock()
		registeredCount := len(hub.clients)
		hub.clientsMutex.RUnlock()

		assert.Equal(t, clientCount, registeredCount)

		// 大量ブロードキャストテスト
		testMessage := []byte("load test message")
		broadcastMsg := &BroadcastMessage{
			Message:   testMessage,
			SessionID: "session-load-test",
		}
		
		startTime := time.Now()
		hub.broadcast <- broadcastMsg
		
		// 全クライアントがメッセージを受信するまでの時間を測定
		receivedCount := 0
		for i := 0; i < clientCount; i++ {
			if clients[i] != nil {
				select {
				case <-clients[i].send:
					receivedCount++
				case <-time.After(2 * time.Second):
					// タイムアウト
				}
			}
		}
		
		broadcastTime := time.Since(startTime)
		
		// パフォーマンス確認（2秒以内に全配信完了）
		assert.Equal(t, clientCount, receivedCount, "Not all clients received the broadcast")
		assert.Less(t, broadcastTime, 2*time.Second, "Broadcast took too long: %v", broadcastTime)

		t.Logf("Successfully broadcasted to %d clients in %v", receivedCount, broadcastTime)
	})

	t.Run("クライアント切断時の自動クリーンアップが動作すること", func(t *testing.T) {
		hub := NewHub()
		go hub.Run()
		defer hub.Stop()

		client := NewTestClient("user-disconnect", "session-disconnect", hub)
		hub.register <- client
		time.Sleep(10 * time.Millisecond)

		// 登録確認
		hub.clientsMutex.RLock()
		initialCount := len(hub.clients)
		hub.clientsMutex.RUnlock()
		assert.Equal(t, 1, initialCount)

		// クライアント切断をシミュレート
		client.Close()
		hub.unregister <- client
		time.Sleep(10 * time.Millisecond)

		// 削除確認
		hub.clientsMutex.RLock()
		finalCount := len(hub.clients)
		hub.clientsMutex.RUnlock()
		assert.Equal(t, 0, finalCount)
	})
}

// BroadcastMessageの構造体定義（実際の実装に合わせて調整）
type BroadcastMessage struct {
	Message   []byte
	SessionID string
}

// テスト用のHub実装
type Hub struct {
	clients      map[*TestClient]bool
	clientsMutex sync.RWMutex
	register     chan *TestClient
	unregister   chan *TestClient
	broadcast    chan *BroadcastMessage
	done         chan bool
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*TestClient]bool),
		register:   make(chan *TestClient),
		unregister: make(chan *TestClient),
		broadcast:  make(chan *BroadcastMessage),
		done:       make(chan bool),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clientsMutex.Lock()
			h.clients[client] = true
			h.clientsMutex.Unlock()
			
		case client := <-h.unregister:
			h.clientsMutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
			}
			h.clientsMutex.Unlock()
			
		case message := <-h.broadcast:
			h.clientsMutex.RLock()
			for client := range h.clients {
				if message.SessionID == "" || client.GetSessionID() == message.SessionID {
					client.SendMessage(message.Message)
				}
			}
			h.clientsMutex.RUnlock()
			
		case <-h.done:
			return
		}
	}
}

func (h *Hub) Stop() {
	select {
	case h.done <- true:
	default:
	}
}

// クライアントのインターフェース
type ClientInterface interface {
	GetUserID() string
	GetSessionID() string
	SendMessage(message []byte)
	Close()
	IsActive() bool
}