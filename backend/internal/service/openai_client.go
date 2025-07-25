package service

import (
	"context"
	"encoding/json"
	"fmt"
	"quiz-app/internal/domain"
	"strings"

	"github.com/sashabaranov/go-openai"
)

type OpenAIClient struct {
	client *openai.Client
	apiKey string
}

func NewOpenAIClient(apiKey string) *OpenAIClient {
	if apiKey == "" {
		return &OpenAIClient{apiKey: ""}
	}

	client := openai.NewClient(apiKey)
	return &OpenAIClient{
		client: client,
		apiKey: apiKey,
	}
}

func (o *OpenAIClient) IsAvailable() bool {
	return o.apiKey != "" && o.client != nil
}

func (o *OpenAIClient) GetName() string {
	return "OpenAI"
}

func (o *OpenAIClient) GenerateQuestion(ctx context.Context, difficulty domain.Difficulty, category string) (*domain.Question, error) {
	if !o.IsAvailable() {
		return nil, domain.ErrAIServiceUnavailable
	}

	prompt := o.buildPrompt(difficulty, category)

	req := openai.ChatCompletionRequest{
		Model: openai.GPT3Dot5Turbo,
		Messages: []openai.ChatCompletionMessage{
			{
				Role:    openai.ChatMessageRoleSystem,
				Content: "あなたは忘年会用クイズ問題作成の専門家です。楽しく盛り上がる4択クイズを作成してください。",
			},
			{
				Role:    openai.ChatMessageRoleUser,
				Content: prompt,
			},
		},
		Temperature: 0.7,
		MaxTokens:   500,
	}

	resp, err := o.client.CreateChatCompletion(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to create chat completion: %w", err)
	}

	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("no response from OpenAI")
	}

	responseText := resp.Choices[0].Message.Content
	question, err := o.parseResponse(responseText, difficulty, category)
	if err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return question, nil
}

func (o *OpenAIClient) buildPrompt(difficulty domain.Difficulty, category string) string {
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

func (o *OpenAIClient) parseResponse(responseText string, difficulty domain.Difficulty, category string) (*domain.Question, error) {
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
		domain.AIProviderOpenAI,
	)

	return question, nil
}