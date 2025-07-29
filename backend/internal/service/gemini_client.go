package service

import (
	"context"
	"encoding/json"
	"fmt"
	"quiz-app/internal/domain"
	"strings"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

type GeminiClient struct {
	client *genai.Client
	model  *genai.GenerativeModel
	apiKey string
}

func NewGeminiClient(apiKey string) (*GeminiClient, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("Gemini API key is required")
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, fmt.Errorf("failed to create Gemini client: %w", err)
	}

	model := client.GenerativeModel("gemini-1.5-flash")
	model.SetTemperature(0.7)
	model.SetTopK(40)
	model.SetTopP(0.95)

	return &GeminiClient{
		client: client,
		model:  model,
		apiKey: apiKey,
	}, nil
}

func (g *GeminiClient) IsAvailable() bool {
	return g.apiKey != "" && g.client != nil
}

func (g *GeminiClient) GetName() string {
	return "Gemini"
}

func (g *GeminiClient) GenerateQuestion(ctx context.Context, difficulty domain.Difficulty, category string) (*domain.Question, error) {
	if !g.IsAvailable() {
		return nil, domain.ErrAIServiceUnavailable
	}

	prompt := g.buildPrompt(difficulty, category)
	
	resp, err := g.model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, fmt.Errorf("failed to generate content: %w", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no content generated")
	}

	responseText := ""
	for _, part := range resp.Candidates[0].Content.Parts {
		if textPart, ok := part.(genai.Text); ok {
			responseText += string(textPart)
		}
	}

	question, err := g.parseResponse(responseText, difficulty, category)
	if err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return question, nil
}

func (g *GeminiClient) buildPrompt(difficulty domain.Difficulty, category string) string {
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

func (g *GeminiClient) parseResponse(responseText string, difficulty domain.Difficulty, category string) (*domain.Question, error) {
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
		domain.AIProviderGemini,
	)

	return question, nil
}

func (g *GeminiClient) Close() error {
	if g.client != nil {
		return g.client.Close()
	}
	return nil
}