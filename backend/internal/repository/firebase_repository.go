package repository

import (
	"context"
	"fmt"
	"quiz-app/internal/domain"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
)

type FirebaseRepository struct {
	client *firestore.Client
}

func NewFirebaseRepository(client *firestore.Client) *FirebaseRepository {
	return &FirebaseRepository{
		client: client,
	}
}

// SessionRepository Implementation
func (r *FirebaseRepository) CreateSession(ctx context.Context, session *domain.Session) error {
	if session.ID == "" {
		docRef := r.client.Collection("sessions").NewDoc()
		session.ID = docRef.ID
	}

	_, err := r.client.Collection("sessions").Doc(session.ID).Set(ctx, session)
	return err
}

func (r *FirebaseRepository) GetSessionByID(ctx context.Context, id string) (*domain.Session, error) {
	doc, err := r.client.Collection("sessions").Doc(id).Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	var session domain.Session
	if err := doc.DataTo(&session); err != nil {
		return nil, fmt.Errorf("failed to unmarshal session: %w", err)
	}

	return &session, nil
}

func (r *FirebaseRepository) UpdateSession(ctx context.Context, session *domain.Session) error {
	_, err := r.client.Collection("sessions").Doc(session.ID).Set(ctx, session)
	return err
}

func (r *FirebaseRepository) DeleteSession(ctx context.Context, id string) error {
	_, err := r.client.Collection("sessions").Doc(id).Delete(ctx)
	return err
}

func (r *FirebaseRepository) ListSessions(ctx context.Context, limit, offset int) ([]*domain.Session, error) {
	query := r.client.Collection("sessions").
		OrderBy("createdAt", firestore.Desc).
		Limit(limit).
		Offset(offset)

	iter := query.Documents(ctx)
	defer iter.Stop()

	var sessions []*domain.Session
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to iterate sessions: %w", err)
		}

		var session domain.Session
		if err := doc.DataTo(&session); err != nil {
			return nil, fmt.Errorf("failed to unmarshal session: %w", err)
		}
		sessions = append(sessions, &session)
	}

	return sessions, nil
}

// UserRepository Implementation
func (r *FirebaseRepository) CreateUser(ctx context.Context, user *domain.User) error {
	if user.ID == "" {
		docRef := r.client.Collection("users").NewDoc()
		user.ID = docRef.ID
	}

	_, err := r.client.Collection("users").Doc(user.ID).Set(ctx, user)
	return err
}

func (r *FirebaseRepository) GetUserByID(ctx context.Context, id string) (*domain.User, error) {
	doc, err := r.client.Collection("users").Doc(id).Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	var user domain.User
	if err := doc.DataTo(&user); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user: %w", err)
	}

	return &user, nil
}

func (r *FirebaseRepository) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	iter := r.client.Collection("users").Where("email", "==", email).Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err == iterator.Done {
		return nil, domain.ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query user by email: %w", err)
	}

	var user domain.User
	if err := doc.DataTo(&user); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user: %w", err)
	}

	return &user, nil
}

func (r *FirebaseRepository) UpdateUser(ctx context.Context, user *domain.User) error {
	_, err := r.client.Collection("users").Doc(user.ID).Set(ctx, user)
	return err
}

func (r *FirebaseRepository) DeleteUser(ctx context.Context, id string) error {
	_, err := r.client.Collection("users").Doc(id).Delete(ctx)
	return err
}