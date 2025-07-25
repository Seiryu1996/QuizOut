package repository

import (
	"context"
	"fmt"
	"quiz-app/internal/domain"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
)

// QuestionRepository Implementation
func (r *FirebaseRepository) CreateQuestion(ctx context.Context, question *domain.Question) error {
	if question.ID == "" {
		docRef := r.client.Collection("sessions").Doc(question.SessionID).Collection("questions").NewDoc()
		question.ID = docRef.ID
	}

	_, err := r.client.Collection("sessions").Doc(question.SessionID).Collection("questions").Doc(question.ID).Set(ctx, question)
	return err
}

func (r *FirebaseRepository) GetQuestionByID(ctx context.Context, sessionID, id string) (*domain.Question, error) {
	doc, err := r.client.Collection("sessions").Doc(sessionID).Collection("questions").Doc(id).Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("question not found: %w", err)
	}

	var question domain.Question
	if err := doc.DataTo(&question); err != nil {
		return nil, fmt.Errorf("failed to unmarshal question: %w", err)
	}

	return &question, nil
}

func (r *FirebaseRepository) GetQuestionBySessionAndRound(ctx context.Context, sessionID string, round int) (*domain.Question, error) {
	iter := r.client.Collection("sessions").Doc(sessionID).Collection("questions").
		Where("round", "==", round).Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err == iterator.Done {
		return nil, domain.ErrQuestionNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query question: %w", err)
	}

	var question domain.Question
	if err := doc.DataTo(&question); err != nil {
		return nil, fmt.Errorf("failed to unmarshal question: %w", err)
	}

	return &question, nil
}

func (r *FirebaseRepository) GetQuestionsBySession(ctx context.Context, sessionID string) ([]*domain.Question, error) {
	iter := r.client.Collection("sessions").Doc(sessionID).Collection("questions").
		OrderBy("round", firestore.Asc).Documents(ctx)
	defer iter.Stop()

	var questions []*domain.Question
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to iterate questions: %w", err)
		}

		var question domain.Question
		if err := doc.DataTo(&question); err != nil {
			return nil, fmt.Errorf("failed to unmarshal question: %w", err)
		}
		questions = append(questions, &question)
	}

	return questions, nil
}

func (r *FirebaseRepository) UpdateQuestion(ctx context.Context, question *domain.Question) error {
	_, err := r.client.Collection("sessions").Doc(question.SessionID).Collection("questions").Doc(question.ID).Set(ctx, question)
	return err
}

func (r *FirebaseRepository) DeleteQuestion(ctx context.Context, sessionID, id string) error {
	_, err := r.client.Collection("sessions").Doc(sessionID).Collection("questions").Doc(id).Delete(ctx)
	return err
}

// AnswerRepository Implementation
func (r *FirebaseRepository) CreateAnswer(ctx context.Context, answer *domain.Answer) error {
	if answer.ID == "" {
		docRef := r.client.Collection("sessions").Doc(answer.SessionID).Collection("answers").NewDoc()
		answer.ID = docRef.ID
	}

	_, err := r.client.Collection("sessions").Doc(answer.SessionID).Collection("answers").Doc(answer.ID).Set(ctx, answer)
	return err
}

func (r *FirebaseRepository) GetAnswerByID(ctx context.Context, sessionID, id string) (*domain.Answer, error) {
	doc, err := r.client.Collection("sessions").Doc(sessionID).Collection("answers").Doc(id).Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("answer not found: %w", err)
	}

	var answer domain.Answer
	if err := doc.DataTo(&answer); err != nil {
		return nil, fmt.Errorf("failed to unmarshal answer: %w", err)
	}

	return &answer, nil
}

func (r *FirebaseRepository) GetAnswerByUserAndQuestion(ctx context.Context, sessionID, userID, questionID string) (*domain.Answer, error) {
	iter := r.client.Collection("sessions").Doc(sessionID).Collection("answers").
		Where("userId", "==", userID).
		Where("questionId", "==", questionID).
		Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err == iterator.Done {
		return nil, fmt.Errorf("answer not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query answer: %w", err)
	}

	var answer domain.Answer
	if err := doc.DataTo(&answer); err != nil {
		return nil, fmt.Errorf("failed to unmarshal answer: %w", err)
	}

	return &answer, nil
}

func (r *FirebaseRepository) GetAnswersByQuestion(ctx context.Context, sessionID, questionID string) ([]*domain.Answer, error) {
	iter := r.client.Collection("sessions").Doc(sessionID).Collection("answers").
		Where("questionId", "==", questionID).Documents(ctx)
	defer iter.Stop()

	var answers []*domain.Answer
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to iterate answers: %w", err)
		}

		var answer domain.Answer
		if err := doc.DataTo(&answer); err != nil {
			return nil, fmt.Errorf("failed to unmarshal answer: %w", err)
		}
		answers = append(answers, &answer)
	}

	return answers, nil
}

func (r *FirebaseRepository) GetAnswersBySession(ctx context.Context, sessionID string) ([]*domain.Answer, error) {
	iter := r.client.Collection("sessions").Doc(sessionID).Collection("answers").
		OrderBy("answeredAt", firestore.Desc).Documents(ctx)
	defer iter.Stop()

	var answers []*domain.Answer
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to iterate answers: %w", err)
		}

		var answer domain.Answer
		if err := doc.DataTo(&answer); err != nil {
			return nil, fmt.Errorf("failed to unmarshal answer: %w", err)
		}
		answers = append(answers, &answer)
	}

	return answers, nil
}

func (r *FirebaseRepository) GetAnswersByUserAndSession(ctx context.Context, sessionID, userID string) ([]*domain.Answer, error) {
	iter := r.client.Collection("sessions").Doc(sessionID).Collection("answers").
		Where("userId", "==", userID).
		OrderBy("answeredAt", firestore.Desc).Documents(ctx)
	defer iter.Stop()

	var answers []*domain.Answer
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to iterate answers: %w", err)
		}

		var answer domain.Answer
		if err := doc.DataTo(&answer); err != nil {
			return nil, fmt.Errorf("failed to unmarshal answer: %w", err)
		}
		answers = append(answers, &answer)
	}

	return answers, nil
}

func (r *FirebaseRepository) UpdateAnswer(ctx context.Context, answer *domain.Answer) error {
	_, err := r.client.Collection("sessions").Doc(answer.SessionID).Collection("answers").Doc(answer.ID).Set(ctx, answer)
	return err
}

func (r *FirebaseRepository) DeleteAnswer(ctx context.Context, sessionID, id string) error {
	_, err := r.client.Collection("sessions").Doc(sessionID).Collection("answers").Doc(id).Delete(ctx)
	return err
}

func (r *FirebaseRepository) CountCorrectAnswersByUserAndSession(ctx context.Context, sessionID, userID string) (int, error) {
	iter := r.client.Collection("sessions").Doc(sessionID).Collection("answers").
		Where("userId", "==", userID).
		Where("isCorrect", "==", true).
		Documents(ctx)
	defer iter.Stop()

	count := 0
	for {
		_, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return 0, fmt.Errorf("failed to count correct answers: %w", err)
		}
		count++
	}

	return count, nil
}