package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"
)

type Hub struct {
	clients    map[*Client]bool
	sessions   map[string]map[*Client]bool // sessionID -> clients
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mutex      sync.RWMutex
}

type Message struct {
	Type      string      `json:"type"`
	SessionID string      `json:"sessionId,omitempty"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp int64       `json:"timestamp"`
}

type MessageType string

const (
	MessageTypeQuestionStart    MessageType = "question_start"
	MessageTypeQuestionEnd      MessageType = "question_end"
	MessageTypeAnswerSubmitted  MessageType = "answer_submitted"
	MessageTypeRoundResult      MessageType = "round_result"
	MessageTypeParticipantJoin  MessageType = "participant_join"
	MessageTypeParticipantLeave MessageType = "participant_leave"
	MessageTypeSessionUpdate    MessageType = "session_update"
	MessageTypeRevivalStart     MessageType = "revival_start"
	MessageTypeRevivalResult    MessageType = "revival_result"
	MessageTypeError            MessageType = "error"
	MessageTypePing             MessageType = "ping"
	MessageTypePong             MessageType = "pong"
)

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		sessions:   make(map[string]map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client, 256),
		unregister: make(chan *Client, 256),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.registerClient(client)

		case client := <-h.unregister:
			h.unregisterClient(client)

		case message := <-h.broadcast:
			h.broadcastMessage(message)
		}
	}
}

func (h *Hub) registerClient(client *Client) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	h.clients[client] = true

	// セッション別のクライアント管理
	if client.SessionID != "" {
		if h.sessions[client.SessionID] == nil {
			h.sessions[client.SessionID] = make(map[*Client]bool)
		}
		h.sessions[client.SessionID][client] = true
	}

	log.Printf("Client registered: UserID=%s, SessionID=%s", client.UserID, client.SessionID)

	// 参加通知を同じセッションの他のクライアントに送信
	if client.SessionID != "" {
		h.broadcastToSession(client.SessionID, Message{
			Type:      string(MessageTypeParticipantJoin),
			SessionID: client.SessionID,
			Data: map[string]interface{}{
				"userId":      client.UserID,
				"displayName": client.DisplayName,
			},
			Timestamp: getCurrentTimestamp(),
		})
	}
}

func (h *Hub) unregisterClient(client *Client) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	if _, ok := h.clients[client]; ok {
		delete(h.clients, client)
		close(client.send)

		// セッション別のクライアント管理から削除
		if client.SessionID != "" && h.sessions[client.SessionID] != nil {
			delete(h.sessions[client.SessionID], client)
			if len(h.sessions[client.SessionID]) == 0 {
				delete(h.sessions, client.SessionID)
			}
		}

		log.Printf("Client unregistered: UserID=%s, SessionID=%s", client.UserID, client.SessionID)

		// 離脱通知を同じセッションの他のクライアントに送信
		if client.SessionID != "" {
			h.broadcastToSession(client.SessionID, Message{
				Type:      string(MessageTypeParticipantLeave),
				SessionID: client.SessionID,
				Data: map[string]interface{}{
					"userId":      client.UserID,
					"displayName": client.DisplayName,
				},
				Timestamp: getCurrentTimestamp(),
			})
		}
	}
}

func (h *Hub) broadcastMessage(message []byte) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	for client := range h.clients {
		select {
		case client.send <- message:
		default:
			close(client.send)
			delete(h.clients, client)
		}
	}
}

func (h *Hub) BroadcastToSession(sessionID string, msg Message) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	h.broadcastToSession(sessionID, msg)
}

func (h *Hub) broadcastToSession(sessionID string, msg Message) {
	sessionClients, exists := h.sessions[sessionID]
	if !exists {
		return
	}

	msgBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal message: %v", err)
		return
	}

	for client := range sessionClients {
		select {
		case client.send <- msgBytes:
		default:
			close(client.send)
			delete(h.clients, client)
			delete(sessionClients, client)
		}
	}
}

func (h *Hub) BroadcastToUser(userID string, msg Message) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	msgBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal message: %v", err)
		return
	}

	for client := range h.clients {
		if client.UserID == userID {
			select {
			case client.send <- msgBytes:
			default:
				close(client.send)
				delete(h.clients, client)
			}
		}
	}
}

func (h *Hub) GetSessionClientCount(sessionID string) int {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	if clients, exists := h.sessions[sessionID]; exists {
		return len(clients)
	}
	return 0
}

func (h *Hub) GetConnectedUserIDs(sessionID string) []string {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	var userIDs []string
	if clients, exists := h.sessions[sessionID]; exists {
		for client := range clients {
			userIDs = append(userIDs, client.UserID)
		}
	}
	return userIDs
}

func (h *Hub) IsUserConnected(sessionID, userID string) bool {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	if clients, exists := h.sessions[sessionID]; exists {
		for client := range clients {
			if client.UserID == userID {
				return true
			}
		}
	}
	return false
}

func getCurrentTimestamp() int64 {
	return time.Now().Unix()
}