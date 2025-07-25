package domain

import (
	"testing"
	"time"
)

func TestQuestion(t *testing.T) {
	question := &Question{
		ID:        "test-1",
		SessionID: "session-1",
		Text:      "Test question?",
		Options:   []string{"A", "B", "C", "D"},
		CorrectAnswer: 0,
		Round:     1,
		Category:  "Test",
		Difficulty: DifficultyMedium,
		CreatedAt: time.Now(),
	}

	if question.ID != "test-1" {
		t.Errorf("Expected ID to be 'test-1', got %s", question.ID)
	}

	if question.SessionID != "session-1" {
		t.Errorf("Expected SessionID to be 'session-1', got %s", question.SessionID)
	}

	if len(question.Options) != 4 {
		t.Errorf("Expected 4 options, got %d", len(question.Options))
	}

	if question.CorrectAnswer != 0 {
		t.Errorf("Expected CorrectAnswer to be 0, got %d", question.CorrectAnswer)
	}

	if question.Difficulty != DifficultyMedium {
		t.Errorf("Expected difficulty to be Medium, got %s", question.Difficulty)
	}
}