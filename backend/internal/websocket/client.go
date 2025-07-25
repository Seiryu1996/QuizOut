package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// 本番環境では適切なオリジンチェックを実装
		return true
	},
}

type Client struct {
	hub         *Hub
	conn        *websocket.Conn
	send        chan []byte
	UserID      string
	SessionID   string
	DisplayName string
	IsAdmin     bool
}

type ClientMessage struct {
	Type      string      `json:"type"`
	SessionID string      `json:"sessionId,omitempty"`
	Data      interface{} `json:"data,omitempty"`
}

func NewClient(hub *Hub, conn *websocket.Conn, userID, sessionID, displayName string, isAdmin bool) *Client {
	return &Client{
		hub:         hub,
		conn:        conn,
		send:        make(chan []byte, 256),
		UserID:      userID,
		SessionID:   sessionID,
		DisplayName: displayName,
		IsAdmin:     isAdmin,
	}
}

func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		var msg ClientMessage
		if err := json.Unmarshal(messageBytes, &msg); err != nil {
			log.Printf("Failed to unmarshal client message: %v", err)
			continue
		}

		c.handleMessage(msg)
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// キューに残っているメッセージも一緒に送信
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) handleMessage(msg ClientMessage) {
	switch MessageType(msg.Type) {
	case MessageTypePing:
		c.sendPong()

	case "answer_submit":
		c.handleAnswerSubmit(msg)

	case "admin_control":
		if c.IsAdmin {
			c.handleAdminControl(msg)
		}

	case "join_session":
		c.handleJoinSession(msg)

	default:
		log.Printf("Unknown message type: %s", msg.Type)
	}
}

func (c *Client) sendPong() {
	pongMsg := Message{
		Type:      string(MessageTypePong),
		Timestamp: getCurrentTimestamp(),
	}

	msgBytes, err := json.Marshal(pongMsg)
	if err != nil {
		log.Printf("Failed to marshal pong message: %v", err)
		return
	}

	select {
	case c.send <- msgBytes:
	default:
		close(c.send)
	}
}

func (c *Client) handleAnswerSubmit(msg ClientMessage) {
	// 回答データの処理は UseCase レイヤーに委譲
	// ここではメッセージの転送のみ行う
	responseMsg := Message{
		Type:      string(MessageTypeAnswerSubmitted),
		SessionID: c.SessionID,
		Data: map[string]interface{}{
			"userId": c.UserID,
			"answer": msg.Data,
		},
		Timestamp: getCurrentTimestamp(),
	}

	// 同じセッションの管理者に通知
	c.hub.BroadcastToSession(c.SessionID, responseMsg)
}

func (c *Client) handleAdminControl(msg ClientMessage) {
	// 管理者コントロールメッセージの処理
	controlMsg := Message{
		Type:      "admin_control",
		SessionID: c.SessionID,
		Data:      msg.Data,
		Timestamp: getCurrentTimestamp(),
	}

	// セッション内の全クライアントに管理者コマンドを送信
	c.hub.BroadcastToSession(c.SessionID, controlMsg)
}

func (c *Client) handleJoinSession(msg ClientMessage) {
	// セッション参加処理
	if sessionID, ok := msg.Data.(map[string]interface{})["sessionId"].(string); ok {
		c.SessionID = sessionID
		
		// 参加成功メッセージを送信
		joinMsg := Message{
			Type:      "join_success",
			SessionID: sessionID,
			Data: map[string]interface{}{
				"userId":      c.UserID,
				"displayName": c.DisplayName,
			},
			Timestamp: getCurrentTimestamp(),
		}

		msgBytes, err := json.Marshal(joinMsg)
		if err != nil {
			log.Printf("Failed to marshal join message: %v", err)
			return
		}

		select {
		case c.send <- msgBytes:
		default:
			close(c.send)
		}
	}
}

func (c *Client) SendMessage(msg Message) {
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal message: %v", err)
		return
	}

	select {
	case c.send <- msgBytes:
	default:
		close(c.send)
	}
}

func (c *Client) SendError(errorMsg string) {
	errorMessage := Message{
		Type: string(MessageTypeError),
		Data: map[string]interface{}{
			"error": errorMsg,
		},
		Timestamp: getCurrentTimestamp(),
	}

	c.SendMessage(errorMessage)
}