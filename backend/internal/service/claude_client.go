package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"quiz-app/internal/domain"
	"strings"
	"time"
)

type ClaudeClient struct {
	apiKey     string
	httpClient *http.Client
	baseURL    string
}

type ClaudeRequest struct {
	Model     string          `json:"model"`
	MaxTokens int             `json:"max_tokens"`
	Messages  []ClaudeMessage `json:"messages"`
}

type ClaudeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ClaudeResponse struct {
	Content []ClaudeContent `json:"content"`
	Type    string          `json:"type"`
}

type ClaudeContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

func NewClaudeClient(apiKey string) *ClaudeClient {
	if apiKey == "" {
		return &ClaudeClient{apiKey: ""}
	}

	return &ClaudeClient{
		apiKey:  apiKey,
		baseURL: "https://api.anthropic.com/v1/messages",
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *ClaudeClient) IsAvailable() bool {
	return c.apiKey != ""
}

func (c *ClaudeClient) GetName() string {
	return "Claude"
}

func (c *ClaudeClient) GenerateQuestion(ctx context.Context, difficulty domain.Difficulty, category string) (*domain.Question, error) {
	if !c.IsAvailable() {
		return nil, domain.ErrAIServiceUnavailable
	}

	prompt := c.buildPrompt(difficulty, category)

	req := ClaudeRequest{
		Model:     "claude-3-haiku-20240307",
		MaxTokens: 500,
		Messages: []ClaudeMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", c.baseURL, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", c.apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	var claudeResp ClaudeResponse
	if err := json.Unmarshal(respBody, &claudeResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if len(claudeResp.Content) == 0 {
		return nil, fmt.Errorf("no content in response")
	}

	responseText := claudeResp.Content[0].Text
	question, err := c.parseResponse(responseText, difficulty, category)
	if err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return question, nil
}

func (c *ClaudeClient) buildPrompt(difficulty domain.Difficulty, category string) string {
	difficultyDesc := map[domain.Difficulty]string{
		domain.DifficultyEasy:   "初級レベル（一般常識）",
		domain.DifficultyMedium: "中級レベル（少し考える必要がある）",
		domain.DifficultyHard:   "上級レベル（専門知識が必要）",
	}

	categoryDesc := category
	if category == "" {
		categoryDesc = "一般常識・雑学"
	}

	return fmt.Sprintf(`忘年会で使用するクイズ問題を1問作成してください。

【条件】
- 難易度: %s
- カテゴリ: %s
- 4択問題
- 日本語で作成
- 楽しく盛り上がる内容
- 不適切な内容は避ける

【出力形式】
以下のJSON形式で回答してください。余計な説明は不要です。

{
  "text": "問題文",
  "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
  "correctAnswer": 0,
  "explanation": "解説（省略可）"
}

※correctAnswerは正解の選択肢のインデックス（0-3）`, difficultyDesc[difficulty], categoryDesc)
}

func (c *ClaudeClient) parseResponse(responseText string, difficulty domain.Difficulty, category string) (*domain.Question, error) {
	// JSONブロックを抽出
	jsonStart := strings.Index(responseText, "{")
	jsonEnd := strings.LastIndex(responseText, "}")
	
	if jsonStart == -1 || jsonEnd == -1 {
		return nil, fmt.Errorf("invalid response format: no JSON found")
	}

	jsonText := responseText[jsonStart : jsonEnd+1]

	var response QuestionGenerationResponse
	if err := json.Unmarshal([]byte(jsonText), &response); err != nil {
		return nil, fmt.Errorf("failed to unmarshal JSON: %w", err)
	}

	// バリデーション
	if response.Text == "" {
		return nil, fmt.Errorf("question text is empty")
	}
	if len(response.Options) != 4 {
		return nil, fmt.Errorf("question must have exactly 4 options")
	}
	if response.CorrectAnswer < 0 || response.CorrectAnswer >= len(response.Options) {
		return nil, fmt.Errorf("invalid correct answer index")
	}

	if category == "" {
		category = "一般"
	}

	question := domain.NewQuestion(
		"", // SessionID will be set by usecase
		0,  // Round will be set by usecase
		response.Text,
		response.Options,
		response.CorrectAnswer,
		difficulty,
		category,
		domain.AIProviderClaude,
	)

	return question, nil
}