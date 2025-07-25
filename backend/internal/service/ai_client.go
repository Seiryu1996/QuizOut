package service

import (
	"context"
	"quiz-app/internal/domain"
)

type AIClient interface {
	GenerateQuestion(ctx context.Context, difficulty domain.Difficulty, category string) (*domain.Question, error)
	IsAvailable() bool
	GetName() string
}

type QuestionGenerationRequest struct {
	Difficulty domain.Difficulty `json:"difficulty"`
	Category   string            `json:"category"`
	Round      int               `json:"round"`
	SessionID  string            `json:"sessionId"`
	Language   string            `json:"language"` // "ja" for Japanese
}

type QuestionGenerationResponse struct {
	Text          string   `json:"text"`
	Options       []string `json:"options"`
	CorrectAnswer int      `json:"correctAnswer"`
	Explanation   string   `json:"explanation,omitempty"`
}