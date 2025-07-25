package usecase

import (
	"context"
	"quiz-app/internal/domain"
)

type SessionUseCase interface {
	CreateSession(ctx context.Context, title string, maxParticipants int, settings domain.Settings) (*domain.Session, error)
	GetSession(ctx context.Context, sessionID string) (*domain.Session, error)
	StartSession(ctx context.Context, sessionID string) error
	FinishSession(ctx context.Context, sessionID string) error
	JoinSession(ctx context.Context, sessionID, userID, displayName string) (*domain.Participant, error)
	GetParticipants(ctx context.Context, sessionID string) ([]*domain.Participant, error)
	GetActiveParticipants(ctx context.Context, sessionID string) ([]*domain.Participant, error)
}

type QuizUseCase interface {
	GenerateQuestion(ctx context.Context, sessionID string, round int, difficulty domain.Difficulty, category string) (*domain.Question, error)
	GetCurrentQuestion(ctx context.Context, sessionID string) (*domain.Question, error)
	SubmitAnswer(ctx context.Context, sessionID, userID, questionID string, selectedOption, responseTime int) (*domain.Answer, error)
	ProcessRoundResults(ctx context.Context, sessionID string, questionID string) ([]*domain.Participant, []*domain.Participant, error)
	NextRound(ctx context.Context, sessionID string) error
}

type UserUseCase interface {
	CreateUser(ctx context.Context, displayName, email string, isAnonymous bool) (*domain.User, error)
	GetUser(ctx context.Context, userID string) (*domain.User, error)
	GetUserByEmail(ctx context.Context, email string) (*domain.User, error)
	UpdateUser(ctx context.Context, user *domain.User) error
}

type AdminUseCase interface {
	GetSessionStats(ctx context.Context, sessionID string) (map[string]interface{}, error)
	StartRevival(ctx context.Context, sessionID string, count int) ([]*domain.Participant, error)
	ExportResults(ctx context.Context, sessionID string) ([]byte, error)
	SkipQuestion(ctx context.Context, sessionID string) error
}