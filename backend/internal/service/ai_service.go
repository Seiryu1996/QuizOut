package service

import (
	"context"
	"fmt"
	"quiz-app/internal/domain"
	"quiz-app/pkg/config"
)

type AIService struct {
	clients []AIClient
	current AIClient
}

func NewAIService(cfg *config.Config) (*AIService, error) {
	var clients []AIClient

	// Gemini クライアント追加
	if cfg.AI.GeminiAPIKey != "" {
		geminiClient, err := NewGeminiClient(cfg.AI.GeminiAPIKey)
		if err == nil && geminiClient.IsAvailable() {
			clients = append(clients, geminiClient)
		}
	}

	// OpenAI クライアント追加
	if cfg.AI.OpenAIAPIKey != "" {
		openaiClient := NewOpenAIClient(cfg.AI.OpenAIAPIKey)
		if openaiClient.IsAvailable() {
			clients = append(clients, openaiClient)
		}
	}

	// Claude クライアント追加
	if cfg.AI.ClaudeAPIKey != "" {
		claudeClient := NewClaudeClient(cfg.AI.ClaudeAPIKey)
		if claudeClient.IsAvailable() {
			clients = append(clients, claudeClient)
		}
	}

	if len(clients) == 0 {
		return nil, fmt.Errorf("no AI clients available")
	}

	return &AIService{
		clients: clients,
		current: clients[0], // デフォルトは最初のクライアント
	}, nil
}

func (s *AIService) GenerateQuestion(ctx context.Context, sessionID string, round int, difficulty domain.Difficulty, category string) (*domain.Question, error) {
	// 利用可能なクライアントを順番に試す
	for _, client := range s.clients {
		if !client.IsAvailable() {
			continue
		}

		question, err := client.GenerateQuestion(ctx, difficulty, category)
		if err == nil {
			// 成功したらセッション情報を設定
			question.SessionID = sessionID
			question.Round = round
			s.current = client
			return question, nil
		}

		// エラーログ（実際の実装では適切なログライブラリを使用）
		fmt.Printf("Failed to generate question with %s: %v\n", client.GetName(), err)
	}

	return nil, domain.ErrAIServiceUnavailable
}

func (s *AIService) GetCurrentProvider() string {
	if s.current != nil {
		return s.current.GetName()
	}
	return "Unknown"
}

func (s *AIService) GetAvailableProviders() []string {
	var providers []string
	for _, client := range s.clients {
		if client.IsAvailable() {
			providers = append(providers, client.GetName())
		}
	}
	return providers
}

func (s *AIService) IsAvailable() bool {
	for _, client := range s.clients {
		if client.IsAvailable() {
			return true
		}
	}
	return false
}

// カテゴリのリストを返す
func (s *AIService) GetCategories() []string {
	return []string{
		"一般常識",
		"歴史",
		"地理",
		"スポーツ",
		"エンターテイメント",
		"科学",
		"料理・グルメ",
		"動物",
		"漫画・アニメ",
		"音楽",
		"映画",
		"テレビ",
		"時事問題",
		"雑学",
	}
}

// 難易度の分布を返す（ラウンドに応じて難易度を調整）
func (s *AIService) GetDifficultyForRound(round int) domain.Difficulty {
	switch {
	case round <= 3:
		return domain.DifficultyEasy
	case round <= 6:
		return domain.DifficultyMedium
	default:
		return domain.DifficultyHard
	}
}