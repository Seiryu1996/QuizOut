package repository

import (
	"context"
	"quiz-app/internal/domain"
)

type SessionRepository interface {
	Create(ctx context.Context, session *domain.Session) error
	GetByID(ctx context.Context, id string) (*domain.Session, error)
	Update(ctx context.Context, session *domain.Session) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, limit int, offset int) ([]*domain.Session, error)
}

type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	GetByID(ctx context.Context, id string) (*domain.User, error)
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	Update(ctx context.Context, user *domain.User) error
	Delete(ctx context.Context, id string) error
}

type ParticipantRepository interface {
	Create(ctx context.Context, participant *domain.Participant) error
	GetByID(ctx context.Context, id string) (*domain.Participant, error)
	GetByUserAndSession(ctx context.Context, userID, sessionID string) (*domain.Participant, error)
	GetBySession(ctx context.Context, sessionID string) ([]*domain.Participant, error)
	GetActiveBySession(ctx context.Context, sessionID string) ([]*domain.Participant, error)
	GetEliminatedBySession(ctx context.Context, sessionID string) ([]*domain.Participant, error)
	Update(ctx context.Context, participant *domain.Participant) error
	Delete(ctx context.Context, id string) error
	CountBySession(ctx context.Context, sessionID string) (int, error)
}

type QuestionRepository interface {
	Create(ctx context.Context, question *domain.Question) error
	GetByID(ctx context.Context, id string) (*domain.Question, error)
	GetBySessionAndRound(ctx context.Context, sessionID string, round int) (*domain.Question, error)
	GetBySession(ctx context.Context, sessionID string) ([]*domain.Question, error)
	Update(ctx context.Context, question *domain.Question) error
	Delete(ctx context.Context, id string) error
}

type AnswerRepository interface {
	Create(ctx context.Context, answer *domain.Answer) error
	GetByID(ctx context.Context, id string) (*domain.Answer, error)
	GetByUserAndQuestion(ctx context.Context, userID, questionID string) (*domain.Answer, error)
	GetByQuestion(ctx context.Context, questionID string) ([]*domain.Answer, error)
	GetBySession(ctx context.Context, sessionID string) ([]*domain.Answer, error)
	GetByUserAndSession(ctx context.Context, userID, sessionID string) ([]*domain.Answer, error)
	Update(ctx context.Context, answer *domain.Answer) error
	Delete(ctx context.Context, id string) error
	CountCorrectByUserAndSession(ctx context.Context, userID, sessionID string) (int, error)
}