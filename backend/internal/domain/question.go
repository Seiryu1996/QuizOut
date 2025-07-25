package domain

import (
	"time"
)

type Difficulty string

const (
	DifficultyEasy   Difficulty = "easy"
	DifficultyMedium Difficulty = "medium"
	DifficultyHard   Difficulty = "hard"
)

type AIProvider string

const (
	AIProviderGemini AIProvider = "gemini"
	AIProviderOpenAI AIProvider = "openai"
	AIProviderClaude AIProvider = "claude"
)

type Question struct {
	ID            string     `json:"id" firestore:"id"`
	SessionID     string     `json:"sessionId" firestore:"sessionId"`
	Round         int        `json:"round" firestore:"round"`
	Text          string     `json:"text" firestore:"text"`
	Options       []string   `json:"options" firestore:"options"`
	CorrectAnswer int        `json:"correctAnswer" firestore:"correctAnswer"`
	Difficulty    Difficulty `json:"difficulty" firestore:"difficulty"`
	Category      string     `json:"category" firestore:"category"`
	AIProvider    AIProvider `json:"aiProvider" firestore:"aiProvider"`
	CreatedAt     time.Time  `json:"createdAt" firestore:"createdAt"`
}

type Answer struct {
	ID             string    `json:"id" firestore:"id"`
	UserID         string    `json:"userId" firestore:"userId"`
	SessionID      string    `json:"sessionId" firestore:"sessionId"`
	QuestionID     string    `json:"questionId" firestore:"questionId"`
	SelectedOption int       `json:"selectedOption" firestore:"selectedOption"`
	IsCorrect      bool      `json:"isCorrect" firestore:"isCorrect"`
	AnsweredAt     time.Time `json:"answeredAt" firestore:"answeredAt"`
	ResponseTime   int       `json:"responseTime" firestore:"responseTime"` // ミリ秒
}

func NewQuestion(sessionID string, round int, text string, options []string, correctAnswer int, difficulty Difficulty, category string, aiProvider AIProvider) *Question {
	return &Question{
		SessionID:     sessionID,
		Round:         round,
		Text:          text,
		Options:       options,
		CorrectAnswer: correctAnswer,
		Difficulty:    difficulty,
		Category:      category,
		AIProvider:    aiProvider,
		CreatedAt:     time.Now(),
	}
}

func NewAnswer(userID, sessionID, questionID string, selectedOption int, responseTime int) *Answer {
	return &Answer{
		UserID:         userID,
		SessionID:      sessionID,
		QuestionID:     questionID,
		SelectedOption: selectedOption,
		AnsweredAt:     time.Now(),
		ResponseTime:   responseTime,
	}
}

func (a *Answer) SetCorrect(isCorrect bool) {
	a.IsCorrect = isCorrect
}

func (q *Question) ValidateAnswer(selectedOption int) bool {
	if selectedOption < 0 || selectedOption >= len(q.Options) {
		return false
	}
	return selectedOption == q.CorrectAnswer
}

func (q *Question) GetPoints() int {
	switch q.Difficulty {
	case DifficultyEasy:
		return 10
	case DifficultyMedium:
		return 20
	case DifficultyHard:
		return 30
	default:
		return 10
	}
}