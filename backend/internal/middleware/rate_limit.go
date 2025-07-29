package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter はIPアドレスベースのレート制限を実装する
type RateLimiter struct {
	mu      sync.RWMutex
	clients map[string]*clientInfo
	limit   int           // 制限回数
	window  time.Duration // 時間窓
}

type clientInfo struct {
	requests []time.Time
	lastSeen time.Time
}

// NewRateLimiter 新しいレート制限ミドルウェアを作成
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		clients: make(map[string]*clientInfo),
		limit:   limit,
		window:  window,
	}
	
	// 定期的にクリーンアップを実行
	go rl.cleanup()
	
	return rl
}

// Middleware レート制限ミドルウェア関数
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		
		if rl.isRateLimited(clientIP) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Too many requests",
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// isRateLimited クライアントがレート制限を超えているかチェック
func (rl *RateLimiter) isRateLimited(clientIP string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	
	now := time.Now()
	client, exists := rl.clients[clientIP]
	
	if !exists {
		client = &clientInfo{
			requests: []time.Time{now},
			lastSeen: now,
		}
		rl.clients[clientIP] = client
		return false
	}
	
	// 時間窓外のリクエストを削除
	validRequests := []time.Time{}
	for _, req := range client.requests {
		if now.Sub(req) < rl.window {
			validRequests = append(validRequests, req)
		}
	}
	
	// 制限チェック
	if len(validRequests) >= rl.limit {
		client.lastSeen = now
		return true
	}
	
	// 新しいリクエストを記録
	validRequests = append(validRequests, now)
	client.requests = validRequests
	client.lastSeen = now
	
	return false
}

// cleanup 古いクライアント情報をクリーンアップ
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		
		for ip, client := range rl.clients {
			// 1時間以上アクセスがないクライアントを削除
			if now.Sub(client.lastSeen) > time.Hour {
				delete(rl.clients, ip)
			}
		}
		
		rl.mu.Unlock()
	}
}

// LoginRateLimit ログイン専用のレート制限（より厳しい制限）
func LoginRateLimit() gin.HandlerFunc {
	limiter := NewRateLimiter(20, time.Minute) // 1分間に20回まで（開発用に緩和）
	return limiter.Middleware()
}

// AccessCodeRateLimit アクセスコード検証専用のレート制限
func AccessCodeRateLimit() gin.HandlerFunc {
	limiter := NewRateLimiter(10, time.Minute) // 1分間に10回まで
	return limiter.Middleware()
}

// APIRateLimit API呼び出し用のレート制限
func APIRateLimit() gin.HandlerFunc {
	limiter := NewRateLimiter(100, time.Minute) // 1分間に100回まで
	return limiter.Middleware()
}

// WebSocketRateLimit WebSocket接続用のレート制限（より厳しい制限）
func WebSocketRateLimit() gin.HandlerFunc {
	limiter := NewRateLimiter(5, time.Minute) // 1分間に5回まで
	return limiter.Middleware()
}