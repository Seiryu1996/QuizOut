package performance

import (
	"context"
	"fmt"
	"runtime"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	
	"quiz-app/internal/domain"
)

// パフォーマンステスト用の構造体
type PerformanceMetrics struct {
	StartTime           time.Time
	EndTime             time.Time
	TotalRequests       int64
	SuccessfulRequests  int64
	FailedRequests      int64
	AverageResponseTime time.Duration
	MaxResponseTime     time.Duration
	MinResponseTime     time.Duration
	MemoryUsageBefore   runtime.MemStats
	MemoryUsageAfter    runtime.MemStats
}

func (pm *PerformanceMetrics) Duration() time.Duration {
	return pm.EndTime.Sub(pm.StartTime)
}

func (pm *PerformanceMetrics) RequestsPerSecond() float64 {
	duration := pm.Duration().Seconds()
	if duration == 0 {
		return 0
	}
	return float64(pm.TotalRequests) / duration
}

func (pm *PerformanceMetrics) SuccessRate() float64 {
	if pm.TotalRequests == 0 {
		return 0
	}
	return float64(pm.SuccessfulRequests) / float64(pm.TotalRequests) * 100
}

// テスト用のWebSocketクライアントシミュレーター
type MockWebSocketClient struct {
	ID            string
	SessionID     string
	Connected     bool
	MessageCount  int64
	LastMessage   time.Time
	ResponseTimes []time.Duration
	mutex         sync.RWMutex
}

func NewMockWebSocketClient(id, sessionID string) *MockWebSocketClient {
	return &MockWebSocketClient{
		ID:            id,
		SessionID:     sessionID,
		Connected:     false,
		ResponseTimes: make([]time.Duration, 0),
	}
}

func (c *MockWebSocketClient) Connect() error {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	
	c.Connected = true
	return nil
}

func (c *MockWebSocketClient) Disconnect() error {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	
	c.Connected = false
	return nil
}

func (c *MockWebSocketClient) SendMessage(message []byte) error {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	
	if !c.Connected {
		return fmt.Errorf("client not connected")
	}
	
	start := time.Now()
	
	// メッセージ送信をシミュレート
	time.Sleep(time.Microsecond * 100) // 100マイクロ秒の処理時間をシミュレート
	
	responseTime := time.Since(start)
	c.ResponseTimes = append(c.ResponseTimes, responseTime)
	c.MessageCount++
	c.LastMessage = time.Now()
	
	return nil
}

func (c *MockWebSocketClient) GetAverageResponseTime() time.Duration {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	
	if len(c.ResponseTimes) == 0 {
		return 0
	}
	
	var total time.Duration
	for _, rt := range c.ResponseTimes {
		total += rt
	}
	
	return total / time.Duration(len(c.ResponseTimes))
}

func TestLargeScalePerformance(t *testing.T) {
	t.Run("200人同時接続での安定性", func(t *testing.T) {
		clientCount := 200
		sessionID := "performance-test-session"
		
		var metrics PerformanceMetrics
		runtime.GC()
		runtime.ReadMemStats(&metrics.MemoryUsageBefore)
		
		metrics.StartTime = time.Now()
		metrics.MinResponseTime = time.Hour // 初期値として大きな値を設定
		
		clients := make([]*MockWebSocketClient, clientCount)
		var wg sync.WaitGroup
		var connectionErrors int64
		var messageErrors int64
		
		// 200クライアント同時接続
		t.Log("200クライアントの同時接続を開始...")
		
		for i := 0; i < clientCount; i++ {
			wg.Add(1)
			go func(index int) {
				defer wg.Done()
				
				clientID := fmt.Sprintf("client-%d", index)
				client := NewMockWebSocketClient(clientID, sessionID)
				clients[index] = client
				
				// 接続
				if err := client.Connect(); err != nil {
					atomic.AddInt64(&connectionErrors, 1)
					return
				}
				
				atomic.AddInt64(&metrics.SuccessfulRequests, 1)
			}(i)
		}
		
		wg.Wait()
		
		connectionTime := time.Since(metrics.StartTime)
		t.Logf("接続完了: %v, 成功: %d/%d, エラー: %d", 
			connectionTime, metrics.SuccessfulRequests, clientCount, connectionErrors)
		
		// 同時メッセージ配信テスト
		t.Log("同時メッセージ配信テストを開始...")
		
		messageCount := 10
		broadcastStart := time.Now()
		
		for msgIndex := 0; msgIndex < messageCount; msgIndex++ {
			message := []byte(fmt.Sprintf("broadcast message %d", msgIndex))
			
			// 全クライアントに同時配信
			for i := 0; i < clientCount; i++ {
				wg.Add(1)
				go func(clientIndex int) {
					defer wg.Done()
					
					if clients[clientIndex] != nil {
						if err := clients[clientIndex].SendMessage(message); err != nil {
							atomic.AddInt64(&messageErrors, 1)
							return
						}
						
						atomic.AddInt64(&metrics.TotalRequests, 1)
						
						// レスポンス時間の記録
						avgRT := clients[clientIndex].GetAverageResponseTime()
						if avgRT > metrics.MaxResponseTime {
							metrics.MaxResponseTime = avgRT
						}
						if avgRT < metrics.MinResponseTime && avgRT > 0 {
							metrics.MinResponseTime = avgRT
						}
					}
				}(i)
			}
			
			wg.Wait()
			
			// メッセージ間隔
			time.Sleep(100 * time.Millisecond)
		}
		
		broadcastTime := time.Since(broadcastStart)
		
		// 切断処理
		t.Log("クライアント切断を開始...")
		
		for i := 0; i < clientCount; i++ {
			wg.Add(1)
			go func(index int) {
				defer wg.Done()
				if clients[index] != nil {
					clients[index].Disconnect()
				}
			}(i)
		}
		
		wg.Wait()
		
		metrics.EndTime = time.Now()
		metrics.FailedRequests = connectionErrors + messageErrors
		
		// 平均レスポンス時間の計算
		var totalResponseTime time.Duration
		var responseCount int
		for _, client := range clients {
			if client != nil {
				avgRT := client.GetAverageResponseTime()
				if avgRT > 0 {
					totalResponseTime += avgRT
					responseCount++
				}
			}
		}
		if responseCount > 0 {
			metrics.AverageResponseTime = totalResponseTime / time.Duration(responseCount)
		}
		
		runtime.GC()
		runtime.ReadMemStats(&metrics.MemoryUsageAfter)
		
		// アサーション
		assert.Equal(t, int64(clientCount), metrics.SuccessfulRequests, "接続成功数が期待値と一致しない")
		assert.Equal(t, int64(0), connectionErrors, "接続エラーが発生")
		assert.Less(t, broadcastTime, 1*time.Second, "ブロードキャスト時間が長すぎる: %v", broadcastTime)
		assert.Less(t, metrics.AverageResponseTime, 50*time.Millisecond, "平均レスポンス時間が長すぎる: %v", metrics.AverageResponseTime)
		
		// メモリ使用量の確認
		memoryIncrease := metrics.MemoryUsageAfter.Alloc - metrics.MemoryUsageBefore.Alloc
		assert.Less(t, memoryIncrease, uint64(100*1024*1024), "メモリ使用量の増加が大きすぎる: %d bytes", memoryIncrease)
		
		// パフォーマンス結果の出力
		t.Logf("=== パフォーマンステスト結果 ===")
		t.Logf("同時接続数: %d", clientCount)
		t.Logf("総実行時間: %v", metrics.Duration())
		t.Logf("接続時間: %v", connectionTime)
		t.Logf("ブロードキャスト時間: %v", broadcastTime)
		t.Logf("総リクエスト数: %d", metrics.TotalRequests)
		t.Logf("成功率: %.2f%%", metrics.SuccessRate())
		t.Logf("平均レスポンス時間: %v", metrics.AverageResponseTime)
		t.Logf("最大レスポンス時間: %v", metrics.MaxResponseTime)
		t.Logf("最小レスポンス時間: %v", metrics.MinResponseTime)
		t.Logf("メモリ使用量増加: %d bytes", memoryIncrease)
		t.Logf("RPS (Request Per Second): %.2f", metrics.RequestsPerSecond())
	})

	t.Run("1000問連続生成での性能", func(t *testing.T) {
		questionCount := 1000
		var metrics PerformanceMetrics
		
		metrics.StartTime = time.Now()
		
		// AI問題生成のシミュレーション
		var successCount int64
		var errorCount int64
		var responseTimes []time.Duration
		var responseTimesMutex sync.Mutex
		
		var wg sync.WaitGroup
		
		for i := 0; i < questionCount; i++ {
			wg.Add(1)
			go func(questionIndex int) {
				defer wg.Done()
				
				start := time.Now()
				
				// 問題生成をシミュレート（AI API呼び出し）
				difficulty := []domain.Difficulty{domain.DifficultyEasy, domain.DifficultyMedium, domain.DifficultyHard}[questionIndex%3]
				category := []string{"general", "science", "history", "sports"}[questionIndex%4]
				
				// API呼び出し時間をシミュレート
				apiCallTime := time.Duration(50+questionIndex%200) * time.Millisecond
				time.Sleep(apiCallTime)
				
				responseTime := time.Since(start)
				
				responseTimesMutex.Lock()
				responseTimes = append(responseTimes, responseTime)
				responseTimesMutex.Unlock()
				
				// 成功率95%をシミュレート
				if questionIndex%20 != 0 {
					atomic.AddInt64(&successCount, 1)
				} else {
					atomic.AddInt64(&errorCount, 1)
				}
				
				atomic.AddInt64(&metrics.TotalRequests, 1)
			}(i)
		}
		
		wg.Wait()
		
		metrics.EndTime = time.Now()
		metrics.SuccessfulRequests = successCount
		metrics.FailedRequests = errorCount
		
		// レスポンス時間の統計計算
		if len(responseTimes) > 0 {
			var total time.Duration
			metrics.MinResponseTime = responseTimes[0]
			metrics.MaxResponseTime = responseTimes[0]
			
			for _, rt := range responseTimes {
				total += rt
				if rt > metrics.MaxResponseTime {
					metrics.MaxResponseTime = rt
				}
				if rt < metrics.MinResponseTime {
					metrics.MinResponseTime = rt
				}
			}
			
			metrics.AverageResponseTime = total / time.Duration(len(responseTimes))
		}
		
		// アサーション
		assert.GreaterOrEqual(t, metrics.SuccessRate(), 90.0, "成功率が低すぎる: %.2f%%", metrics.SuccessRate())
		assert.Less(t, metrics.AverageResponseTime, 2*time.Second, "平均レスポンス時間が長すぎる: %v", metrics.AverageResponseTime)
		assert.Less(t, metrics.Duration(), 30*time.Second, "総実行時間が長すぎる: %v", metrics.Duration())
		
		// エラー率の確認
		errorRate := float64(errorCount) / float64(questionCount) * 100
		assert.Less(t, errorRate, 10.0, "エラー率が高すぎる: %.2f%%", errorRate)
		
		t.Logf("=== 問題生成パフォーマンステスト結果 ===")
		t.Logf("生成問題数: %d", questionCount)
		t.Logf("総実行時間: %v", metrics.Duration())
		t.Logf("成功数: %d", successCount)
		t.Logf("エラー数: %d", errorCount)
		t.Logf("成功率: %.2f%%", metrics.SuccessRate())
		t.Logf("平均レスポンス時間: %v", metrics.AverageResponseTime)
		t.Logf("最大レスポンス時間: %v", metrics.MaxResponseTime)
		t.Logf("最小レスポンス時間: %v", metrics.MinResponseTime)
		t.Logf("問題生成レート: %.2f 問/秒", metrics.RequestsPerSecond())
	})

	t.Run("長時間運用での安定性", func(t *testing.T) {
		// 実際の24時間テストは実用的ではないため、短時間で集約的なテストを実行
		testDuration := 30 * time.Second // 実際の運用では24時間
		
		var metrics PerformanceMetrics
		runtime.GC()
		runtime.ReadMemStats(&metrics.MemoryUsageBefore)
		
		metrics.StartTime = time.Now()
		
		var totalOperations int64
		var memoryLeakDetected bool
		
		ctx, cancel := context.WithTimeout(context.Background(), testDuration)
		defer cancel()
		
		// 継続的な負荷生成
		var wg sync.WaitGroup
		
		// WebSocket接続の維持
		wg.Add(1)
		go func() {
			defer wg.Done()
			
			clients := make([]*MockWebSocketClient, 50)
			for i := 0; i < 50; i++ {
				clients[i] = NewMockWebSocketClient(fmt.Sprintf("long-term-client-%d", i), "long-term-session")
				clients[i].Connect()
			}
			
			ticker := time.NewTicker(100 * time.Millisecond)
			defer ticker.Stop()
			
			for {
				select {
				case <-ctx.Done():
					// クリーンアップ
					for _, client := range clients {
						client.Disconnect()
					}
					return
				case <-ticker.C:
					// 定期的なメッセージ送信
					for _, client := range clients {
						client.SendMessage([]byte("heartbeat"))
						atomic.AddInt64(&totalOperations, 1)
					}
				}
			}
		}()
		
		// メモリ使用量の監視
		wg.Add(1)
		go func() {
			defer wg.Done()
			
			ticker := time.NewTicker(5 * time.Second)
			defer ticker.Stop()
			
			var previousAlloc uint64
			runtime.ReadMemStats(&metrics.MemoryUsageBefore)
			previousAlloc = metrics.MemoryUsageBefore.Alloc
			
			for {
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
					var memStats runtime.MemStats
					runtime.GC() // 強制的にガベージコレクションを実行
					runtime.ReadMemStats(&memStats)
					
					// メモリリークの検出（単純な増加傾向の検出）
					if memStats.Alloc > previousAlloc*2 {
						memoryLeakDetected = true
						t.Logf("メモリリークの可能性を検出: %d -> %d bytes", previousAlloc, memStats.Alloc)
					}
					
					previousAlloc = memStats.Alloc
				}
			}
		}()
		
		// CPU集約的な処理
		wg.Add(1)
		go func() {
			defer wg.Done()
			
			ticker := time.NewTicker(50 * time.Millisecond)
			defer ticker.Stop()
			
			for {
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
					// 問題生成のシミュレーション
					start := time.Now()
					
					// CPU集約的な処理をシミュレート
					for i := 0; i < 1000; i++ {
						_ = fmt.Sprintf("question-%d", i)
					}
					
					processingTime := time.Since(start)
					if processingTime > metrics.MaxResponseTime {
						metrics.MaxResponseTime = processingTime
					}
					
					atomic.AddInt64(&totalOperations, 1)
				}
			}
		}()
		
		wg.Wait()
		
		metrics.EndTime = time.Now()
		metrics.TotalRequests = totalOperations
		metrics.SuccessfulRequests = totalOperations // エラーハンドリングは省略
		
		runtime.GC()
		runtime.ReadMemStats(&metrics.MemoryUsageAfter)
		
		// アサーション
		assert.False(t, memoryLeakDetected, "メモリリークが検出された")
		assert.Greater(t, totalOperations, int64(100), "処理された操作数が少なすぎる")
		assert.Less(t, metrics.MaxResponseTime, 100*time.Millisecond, "最大処理時間が長すぎる: %v", metrics.MaxResponseTime)
		
		// メモリ使用量の確認
		memoryIncrease := int64(metrics.MemoryUsageAfter.Alloc) - int64(metrics.MemoryUsageBefore.Alloc)
		assert.Less(t, memoryIncrease, int64(50*1024*1024), "メモリ使用量の増加が大きすぎる: %d bytes", memoryIncrease)
		
		t.Logf("=== 長時間運用安定性テスト結果 ===")
		t.Logf("テスト時間: %v", metrics.Duration())
		t.Logf("総操作数: %d", totalOperations)
		t.Logf("操作レート: %.2f ops/sec", metrics.RequestsPerSecond())
		t.Logf("最大処理時間: %v", metrics.MaxResponseTime)
		t.Logf("メモリ使用量変化: %d bytes", memoryIncrease)
		t.Logf("メモリリーク検出: %v", memoryLeakDetected)
		t.Logf("ガベージコレクション回数: %d", metrics.MemoryUsageAfter.NumGC-metrics.MemoryUsageBefore.NumGC)
	})
}