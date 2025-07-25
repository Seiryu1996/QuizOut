package repository

import (
	"context"
	"fmt"
	"quiz-app/internal/domain"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
)

// ParticipantRepository Implementation
func (r *FirebaseRepository) CreateParticipant(ctx context.Context, participant *domain.Participant) error {
	if participant.ID == "" {
		docRef := r.client.Collection("sessions").Doc(participant.SessionID).Collection("participants").NewDoc()
		participant.ID = docRef.ID
	}

	_, err := r.client.Collection("sessions").Doc(participant.SessionID).Collection("participants").Doc(participant.ID).Set(ctx, participant)
	return err
}

func (r *FirebaseRepository) GetParticipantByID(ctx context.Context, sessionID, id string) (*domain.Participant, error) {
	doc, err := r.client.Collection("sessions").Doc(sessionID).Collection("participants").Doc(id).Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("participant not found: %w", err)
	}

	var participant domain.Participant
	if err := doc.DataTo(&participant); err != nil {
		return nil, fmt.Errorf("failed to unmarshal participant: %w", err)
	}

	return &participant, nil
}

func (r *FirebaseRepository) GetParticipantByUserAndSession(ctx context.Context, userID, sessionID string) (*domain.Participant, error) {
	iter := r.client.Collection("sessions").Doc(sessionID).Collection("participants").
		Where("userId", "==", userID).Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err == iterator.Done {
		return nil, domain.ErrParticipantNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query participant: %w", err)
	}

	var participant domain.Participant
	if err := doc.DataTo(&participant); err != nil {
		return nil, fmt.Errorf("failed to unmarshal participant: %w", err)
	}

	return &participant, nil
}

func (r *FirebaseRepository) GetParticipantsBySession(ctx context.Context, sessionID string) ([]*domain.Participant, error) {
	iter := r.client.Collection("sessions").Doc(sessionID).Collection("participants").Documents(ctx)
	defer iter.Stop()

	var participants []*domain.Participant
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to iterate participants: %w", err)
		}

		var participant domain.Participant
		if err := doc.DataTo(&participant); err != nil {
			return nil, fmt.Errorf("failed to unmarshal participant: %w", err)
		}
		participants = append(participants, &participant)
	}

	return participants, nil
}

func (r *FirebaseRepository) GetActiveParticipantsBySession(ctx context.Context, sessionID string) ([]*domain.Participant, error) {
	iter := r.client.Collection("sessions").Doc(sessionID).Collection("participants").
		Where("status", "in", []string{string(domain.ParticipantStatusActive), string(domain.ParticipantStatusRevived)}).
		Documents(ctx)
	defer iter.Stop()

	var participants []*domain.Participant
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to iterate active participants: %w", err)
		}

		var participant domain.Participant
		if err := doc.DataTo(&participant); err != nil {
			return nil, fmt.Errorf("failed to unmarshal participant: %w", err)
		}
		participants = append(participants, &participant)
	}

	return participants, nil
}

func (r *FirebaseRepository) GetEliminatedParticipantsBySession(ctx context.Context, sessionID string) ([]*domain.Participant, error) {
	iter := r.client.Collection("sessions").Doc(sessionID).Collection("participants").
		Where("status", "==", string(domain.ParticipantStatusEliminated)).
		Documents(ctx)
	defer iter.Stop()

	var participants []*domain.Participant
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to iterate eliminated participants: %w", err)
		}

		var participant domain.Participant
		if err := doc.DataTo(&participant); err != nil {
			return nil, fmt.Errorf("failed to unmarshal participant: %w", err)
		}
		participants = append(participants, &participant)
	}

	return participants, nil
}

func (r *FirebaseRepository) UpdateParticipant(ctx context.Context, participant *domain.Participant) error {
	_, err := r.client.Collection("sessions").Doc(participant.SessionID).Collection("participants").Doc(participant.ID).Set(ctx, participant)
	return err
}

func (r *FirebaseRepository) DeleteParticipant(ctx context.Context, sessionID, id string) error {
	_, err := r.client.Collection("sessions").Doc(sessionID).Collection("participants").Doc(id).Delete(ctx)
	return err
}

func (r *FirebaseRepository) CountParticipantsBySession(ctx context.Context, sessionID string) (int, error) {
	iter := r.client.Collection("sessions").Doc(sessionID).Collection("participants").Documents(ctx)
	defer iter.Stop()

	count := 0
	for {
		_, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return 0, fmt.Errorf("failed to count participants: %w", err)
		}
		count++
	}

	return count, nil
}