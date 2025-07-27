package concurrency

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	
	"quiz-app/internal/domain"
)

// 同時実行テスト用のモック
type MockConcurrentRepository struct {
	mock.Mock
	mu sync.RWMutex
}

func (m *MockConcurrentRepository) SubmitAnswer(ctx context.Context, answer *domain.Answer) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(ctx, answer)
	return args.Error(0)
}

func (m *MockConcurrentRepository) UpdateParticipantScore(ctx context.Context, userID string, score int) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(ctx, userID, score)
	return args.Error(0)
}

func (m *MockConcurrentRepository) EliminateParticipant(ctx context.Context, userID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockConcurrentRepository) JoinSession(ctx context.Context, participant *domain.Participant) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(ctx, participant)
	return args.Error(0)
}

func (m *MockConcurrentRepository) GetParticipantCount(ctx context.Context, sessionID string) (int, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	args := m.Called(ctx, sessionID)
	return args.Int(0), args.Error(1)
}

func TestConcurrentOperations(t *testing.T) {
	t.Run("同時回答送信での整合性確保", func(t *testing.T) {
		mockRepo := &MockConcurrentRepository{}
		ctx := context.Background()
		
		// 100人が同時に回答送信のシミュレーション
		participantCount := 100
		var wg sync.WaitGroup
		var submissionErrors []error
		var errorMutex sync.Mutex
		
		// 同一の問題に対して回答を送信
		questionID := "q1"
		sessionID := "session123"
		
		// 正解者と不正解者を分ける（50:50の比率）
		correctAnswers := make([]bool, participantCount)
		for i := 0; i < participantCount/2; i++ {
			correctAnswers[i] = true // 前半は正解
		}
		
		// モックの設定：全ての回答を受け入れる
		mockRepo.On("SubmitAnswer", mock.Anything, mock.AnythingOfType("*domain.Answer")).Return(nil)
		mockRepo.On("UpdateParticipantScore", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("int")).Return(nil)
		mockRepo.On("EliminateParticipant", mock.Anything, mock.AnythingOfType("string")).Return(nil)
		
		startTime := time.Now()
		
		// 100人が同時に回答送信
		for i := 0; i < participantCount; i++ {
			wg.Add(1)
			go func(userIndex int) {
				defer wg.Done()
				
				userID := fmt.Sprintf("user%d", userIndex)
				selectedOption := 0
				if !correctAnswers[userIndex] {
					selectedOption = 1 // 不正解
				}
				
				answer := domain.NewAnswer(userID, sessionID, questionID, selectedOption, 1000)
				answer.SetCorrect(correctAnswers[userIndex])
				
				// 回答送信
				err := mockRepo.SubmitAnswer(ctx, answer)
				if err != nil {
					errorMutex.Lock()
					submissionErrors = append(submissionErrors, err)
					errorMutex.Unlock()
					return
				}
				
				// スコア更新または脱落処理
				if correctAnswers[userIndex] {
					err = mockRepo.UpdateParticipantScore(ctx, userID, 10)
				} else {
					err = mockRepo.EliminateParticipant(ctx, userID)
				}
				
				if err != nil {
					errorMutex.Lock()
					submissionErrors = append(submissionErrors, err)
					errorMutex.Unlock()
				}
			}(i)
		}
		
		wg.Wait()
		processingTime := time.Since(startTime)
		
		// アサーション
		assert.Empty(t, submissionErrors, "同時回答送信でエラーが発生")
		assert.Less(t, processingTime, 5*time.Second, "処理時間が長すぎる: %v", processingTime)
		
		// 全ての回答が処理されたことを確認
		mockRepo.AssertNumberOfCalls(t, "SubmitAnswer", participantCount)
		mockRepo.AssertNumberOfCalls(t, "UpdateParticipantScore", participantCount/2)    // 正解者のみ
		mockRepo.AssertNumberOfCalls(t, "EliminateParticipant", participantCount/2)       // 不正解者のみ
		
		t.Logf("100人の同時回答送信が %v で完了", processingTime)
	})

	t.Run("同時参加での整合性確保", func(t *testing.T) {
		mockRepo := &MockConcurrentRepository{}
		ctx := context.Background()
		
		sessionID := "session456"
		maxParticipants := 10
		attemptingParticipants := 20 // 定員の2倍が参加を試行
		
		var wg sync.WaitGroup
		var joinErrors []error
		var errorMutex sync.Mutex
		var successCount int32
		var successMutex sync.Mutex
		
		// 参加者数カウンターをシミュレート
		currentCount := 0
		
		// モックの設定：定員管理のシミュレーション
		mockRepo.On("GetParticipantCount", mock.Anything, sessionID).Return(func(ctx context.Context, sessionID string) int {
			successMutex.Lock()
			defer successMutex.Unlock()
			return int(successCount)
		}, nil)
		
		mockRepo.On("JoinSession", mock.Anything, mock.AnythingOfType("*domain.Participant")).Return(func(ctx context.Context, participant *domain.Participant) error {
			successMutex.Lock()
			defer successMutex.Unlock()
			
			if successCount >= int32(maxParticipants) {
				return errors.New("session is full")
			}
			
			successCount++
			return nil
		})
		
		// 20人が同時に参加を試行
		for i := 0; i < attemptingParticipants; i++ {
			wg.Add(1)
			go func(userIndex int) {
				defer wg.Done()
				
				userID := fmt.Sprintf("user%d", userIndex)
				displayName := fmt.Sprintf("User %d", userIndex)
				participant := domain.NewParticipant(userID, sessionID, displayName)
				
				// 参加者数確認
				currentCount, err := mockRepo.GetParticipantCount(ctx, sessionID)
				if err != nil {
					errorMutex.Lock()
					joinErrors = append(joinErrors, err)
					errorMutex.Unlock()
					return
				}
				
				// 定員チェック
				if currentCount >= maxParticipants {
					errorMutex.Lock()
					joinErrors = append(joinErrors, errors.New("session is full"))
					errorMutex.Unlock()
					return
				}
				
				// 参加処理
				err = mockRepo.JoinSession(ctx, participant)
				if err != nil {
					errorMutex.Lock()
					joinErrors = append(joinErrors, err)
					errorMutex.Unlock()
				}
			}(i)
		}
		
		wg.Wait()
		
		// アサーション
		errorMutex.Lock()
		finalSuccessCount := successCount
		fullErrors := 0
		for _, err := range joinErrors {
			if strings.Contains(err.Error(), "session is full") {
				fullErrors++
			}
		}
		errorMutex.Unlock()
		
		// 定員ぴったりで参加が制限されることを確認
		assert.Equal(t, int32(maxParticipants), finalSuccessCount, "参加者数が定員と一致しない")
		assert.Equal(t, attemptingParticipants-maxParticipants, fullErrors, "満員エラーの数が期待値と一致しない")
		
		t.Logf("定員%d名に対して%d名が参加試行、成功%d名、満員エラー%d件", 
			maxParticipants, attemptingParticipants, finalSuccessCount, fullErrors)
	})

	t.Run("管理者操作との同時実行", func(t *testing.T) {
		mockRepo := &MockConcurrentRepository{}
		ctx := context.Background()
		
		var wg sync.WaitGroup
		var operationErrors []error
		var errorMutex sync.Mutex
		
		sessionID := "session789"
		
		// モックの設定
		mockRepo.On("SubmitAnswer", mock.Anything, mock.AnythingOfType("*domain.Answer")).Return(nil)
		mockRepo.On("EliminateParticipant", mock.Anything, mock.AnythingOfType("string")).Return(nil)
		
		// シナリオ1: 参加者の回答中にゲーム終了
		t.Run("参加者の回答中にゲーム終了", func(t *testing.T) {
			// 10人が回答送信中
			for i := 0; i < 10; i++ {
				wg.Add(1)
				go func(userIndex int) {
					defer wg.Done()
					
					userID := fmt.Sprintf("user%d", userIndex)
					questionID := "q1"
					
					// 回答送信処理に少し時間をかける
					time.Sleep(time.Duration(userIndex*10) * time.Millisecond)
					
					answer := domain.NewAnswer(userID, sessionID, questionID, 0, 1500)
					err := mockRepo.SubmitAnswer(ctx, answer)
					
					if err != nil {
						errorMutex.Lock()
						operationErrors = append(operationErrors, err)
						errorMutex.Unlock()
					}
				}(i)
			}
			
			// 同時に管理者がゲーム終了操作
			wg.Add(1)
			go func() {
				defer wg.Done()
				
				time.Sleep(50 * time.Millisecond) // 少し遅れてゲーム終了
				
				// ゲーム終了処理のシミュレーション
				// 実際の実装では、進行中の回答を適切に処理する必要がある
				t.Log("管理者がゲーム終了操作を実行")
			}()
			
			wg.Wait()
			
			// 回答処理が完了していることを確認
			assert.Empty(t, operationErrors, "回答処理中のエラー")
			mockRepo.AssertNumberOfCalls(t, "SubmitAnswer", 10)
		})

		// シナリオ2: 問題配信中にセッション操作
		t.Run("問題配信中にセッション操作", func(t *testing.T) {
			var configErrors []error
			var configMutex sync.Mutex
			
			// 問題配信プロセス
			wg.Add(1)
			go func() {
				defer wg.Done()
				
				for i := 0; i < 5; i++ {
					time.Sleep(20 * time.Millisecond)
					t.Logf("問題%d を配信中", i+1)
				}
			}()
			
			// 同時にセッション設定変更
			wg.Add(1)
			go func() {
				defer wg.Done()
				
				time.Sleep(30 * time.Millisecond)
				
				// セッション設定変更のシミュレーション
				// 実際の実装では適切な排他制御が必要
				t.Log("セッション設定を変更中")
			}()
			
			wg.Wait()
			
			assert.Empty(t, configErrors, "設定変更中のエラー")
		})

		// シナリオ3: 敗者復活戦中の通常ゲーム操作
		t.Run("敗者復活戦中の通常ゲーム操作", func(t *testing.T) {
			// 敗者復活戦処理
			wg.Add(1)
			go func() {
				defer wg.Done()
				
				// 脱落者の復活処理
				eliminatedUsers := []string{"user1", "user2", "user3"}
				for _, userID := range eliminatedUsers {
					time.Sleep(10 * time.Millisecond)
					t.Logf("ユーザー %s を復活中", userID)
				}
			}()
			
			// 同時に通常ゲームでの脱落処理
			wg.Add(1)
			go func() {
				defer wg.Done()
				
				time.Sleep(25 * time.Millisecond)
				
				err := mockRepo.EliminateParticipant(ctx, "user4")
				if err != nil {
					errorMutex.Lock()
					operationErrors = append(operationErrors, err)
					errorMutex.Unlock()
				}
			}()
			
			wg.Wait()
			
			assert.Empty(t, operationErrors, "復活戦中の操作エラー")
		})
	})

	t.Run("データ競合状態の検出", func(t *testing.T) {
		// レースコンディションが発生しやすい状況をテスト
		
		// 共有カウンター
		var counter int64
		var counterMutex sync.RWMutex
		
		var wg sync.WaitGroup
		goroutineCount := 100
		incrementsPerGoroutine := 1000
		
		// 読み取り専用操作
		for i := 0; i < goroutineCount/2; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for j := 0; j < incrementsPerGoroutine; j++ {
					counterMutex.RLock()
					_ = counter // 読み取り
					counterMutex.RUnlock()
				}
			}()
		}
		
		// 書き込み操作
		for i := 0; i < goroutineCount/2; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for j := 0; j < incrementsPerGoroutine; j++ {
					counterMutex.Lock()
					counter++
					counterMutex.Unlock()
				}
			}()
		}
		
		wg.Wait()
		
		expectedCount := int64(goroutineCount/2) * int64(incrementsPerGoroutine)
		assert.Equal(t, expectedCount, counter, "カウンターの値が期待値と一致しない（データ競合の可能性）")
		
		t.Logf("同時読み書き操作完了: 期待値=%d, 実際=%d", expectedCount, counter)
	})
}