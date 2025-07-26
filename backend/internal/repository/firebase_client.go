package repository

import (
	"context"
	"fmt"
	"os"
	"quiz-app/internal/domain"
	"quiz-app/pkg/config"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

type FirebaseClient struct {
	App             *firebase.App
	Firestore       *firestore.Client
	Auth            *auth.Client
	SessionRepo     SessionRepository
	UserRepo        UserRepository
	ParticipantRepo ParticipantRepository
	QuestionRepo    QuestionRepository
	AnswerRepo      AnswerRepository
}

func NewFirebaseClient(ctx context.Context, cfg *config.Config) (*FirebaseClient, error) {
	var app *firebase.App
	var err error

	// 開発環境でエミュレータを使用する場合の設定
	if os.Getenv("FIREBASE_AUTH_EMULATOR_HOST") != "" {
		// Firebase Auth Emulator用の設定
		firebaseConfig := &firebase.Config{
			ProjectID: cfg.Firebase.ProjectID,
		}
		// エミュレータを使用する場合は認証不要
		app, err = firebase.NewApp(ctx, firebaseConfig)
	} else if cfg.Firebase.PrivateKey != "" {
		// 本番環境：サービスアカウントキーを使用
		opt := option.WithCredentialsJSON([]byte(cfg.Firebase.PrivateKey))
		firebaseConfig := &firebase.Config{
			ProjectID: cfg.Firebase.ProjectID,
		}
		app, err = firebase.NewApp(ctx, firebaseConfig, opt)
	} else {
		// 開発環境：デフォルト認証
		firebaseConfig := &firebase.Config{
			ProjectID: cfg.Firebase.ProjectID,
		}
		app, err = firebase.NewApp(ctx, firebaseConfig)
	}

	if err != nil {
		return nil, err
	}

	// Firestore クライアント初期化
	firestoreClient, err := app.Firestore(ctx)
	if err != nil {
		return nil, err
	}

	// Auth クライアント初期化
	authClient, err := app.Auth(ctx)
	if err != nil {
		return nil, err
	}

	// Repository初期化
	firebaseRepo := NewFirebaseRepository(firestoreClient)

	return &FirebaseClient{
		App:             app,
		Firestore:       firestoreClient,
		Auth:            authClient,
		SessionRepo:     &SessionRepositoryImpl{firebaseRepo},
		UserRepo:        NewFirebaseUserRepository(firestoreClient),
		ParticipantRepo: &ParticipantRepositoryImpl{firebaseRepo},
		QuestionRepo:    &QuestionRepositoryImpl{firebaseRepo},
		AnswerRepo:      &AnswerRepositoryImpl{firebaseRepo},
	}, nil
}

func (fc *FirebaseClient) Close() error {
	if fc.Firestore != nil {
		return fc.Firestore.Close()
	}
	return nil
}

// Repository Implementation Wrappers
type SessionRepositoryImpl struct {
	*FirebaseRepository
}

func (r *SessionRepositoryImpl) Create(ctx context.Context, session *domain.Session) error {
	return r.CreateSession(ctx, session)
}

func (r *SessionRepositoryImpl) GetByID(ctx context.Context, id string) (*domain.Session, error) {
	return r.GetSessionByID(ctx, id)
}

func (r *SessionRepositoryImpl) Update(ctx context.Context, session *domain.Session) error {
	return r.UpdateSession(ctx, session)
}

func (r *SessionRepositoryImpl) Delete(ctx context.Context, id string) error {
	return r.DeleteSession(ctx, id)
}

func (r *SessionRepositoryImpl) List(ctx context.Context, limit int, offset int) ([]*domain.Session, error) {
	return r.ListSessions(ctx, limit, offset)
}


type ParticipantRepositoryImpl struct {
	*FirebaseRepository
}

func (r *ParticipantRepositoryImpl) Create(ctx context.Context, participant *domain.Participant) error {
	return r.CreateParticipant(ctx, participant)
}

func (r *ParticipantRepositoryImpl) GetByID(ctx context.Context, id string) (*domain.Participant, error) {
	// Note: 実際の実装ではsessionIDも必要
	return nil, fmt.Errorf("not implemented")
}

func (r *ParticipantRepositoryImpl) GetByUserAndSession(ctx context.Context, userID, sessionID string) (*domain.Participant, error) {
	return r.GetParticipantByUserAndSession(ctx, userID, sessionID)
}

func (r *ParticipantRepositoryImpl) GetBySession(ctx context.Context, sessionID string) ([]*domain.Participant, error) {
	return r.GetParticipantsBySession(ctx, sessionID)
}

func (r *ParticipantRepositoryImpl) GetActiveBySession(ctx context.Context, sessionID string) ([]*domain.Participant, error) {
	return r.GetActiveParticipantsBySession(ctx, sessionID)
}

func (r *ParticipantRepositoryImpl) GetEliminatedBySession(ctx context.Context, sessionID string) ([]*domain.Participant, error) {
	return r.GetEliminatedParticipantsBySession(ctx, sessionID)
}

func (r *ParticipantRepositoryImpl) Update(ctx context.Context, participant *domain.Participant) error {
	return r.UpdateParticipant(ctx, participant)
}

func (r *ParticipantRepositoryImpl) Delete(ctx context.Context, id string) error {
	// Note: 実際の実装ではsessionIDも必要
	return fmt.Errorf("not implemented")
}

func (r *ParticipantRepositoryImpl) CountBySession(ctx context.Context, sessionID string) (int, error) {
	return r.CountParticipantsBySession(ctx, sessionID)
}

type QuestionRepositoryImpl struct {
	*FirebaseRepository
}

func (r *QuestionRepositoryImpl) Create(ctx context.Context, question *domain.Question) error {
	return r.CreateQuestion(ctx, question)
}

func (r *QuestionRepositoryImpl) GetByID(ctx context.Context, id string) (*domain.Question, error) {
	// Note: 実際の実装ではsessionIDも必要
	return nil, fmt.Errorf("not implemented")
}

func (r *QuestionRepositoryImpl) GetBySessionAndRound(ctx context.Context, sessionID string, round int) (*domain.Question, error) {
	return r.GetQuestionBySessionAndRound(ctx, sessionID, round)
}

func (r *QuestionRepositoryImpl) GetBySession(ctx context.Context, sessionID string) ([]*domain.Question, error) {
	return r.GetQuestionsBySession(ctx, sessionID)
}

func (r *QuestionRepositoryImpl) Update(ctx context.Context, question *domain.Question) error {
	return r.UpdateQuestion(ctx, question)
}

func (r *QuestionRepositoryImpl) Delete(ctx context.Context, id string) error {
	// Note: 実際の実装ではsessionIDも必要
	return fmt.Errorf("not implemented")
}

type AnswerRepositoryImpl struct {
	*FirebaseRepository
}

func (r *AnswerRepositoryImpl) Create(ctx context.Context, answer *domain.Answer) error {
	return r.CreateAnswer(ctx, answer)
}

func (r *AnswerRepositoryImpl) GetByID(ctx context.Context, id string) (*domain.Answer, error) {
	// Note: 実際の実装ではsessionIDも必要
	return nil, fmt.Errorf("not implemented")
}

func (r *AnswerRepositoryImpl) GetByUserAndQuestion(ctx context.Context, userID, questionID string) (*domain.Answer, error) {
	// Note: 実際の実装ではsessionIDも必要
	return nil, fmt.Errorf("not implemented")
}

func (r *AnswerRepositoryImpl) GetByQuestion(ctx context.Context, questionID string) ([]*domain.Answer, error) {
	// Note: 実際の実装ではsessionIDも必要
	return nil, fmt.Errorf("not implemented")
}

func (r *AnswerRepositoryImpl) GetBySession(ctx context.Context, sessionID string) ([]*domain.Answer, error) {
	return r.GetAnswersBySession(ctx, sessionID)
}

func (r *AnswerRepositoryImpl) GetByUserAndSession(ctx context.Context, userID, sessionID string) ([]*domain.Answer, error) {
	return r.GetAnswersByUserAndSession(ctx, sessionID, userID)
}

func (r *AnswerRepositoryImpl) Update(ctx context.Context, answer *domain.Answer) error {
	return r.UpdateAnswer(ctx, answer)
}

func (r *AnswerRepositoryImpl) Delete(ctx context.Context, id string) error {
	// Note: 実際の実装ではsessionIDも必要
	return fmt.Errorf("not implemented")
}

func (r *AnswerRepositoryImpl) CountCorrectByUserAndSession(ctx context.Context, userID, sessionID string) (int, error) {
	return r.CountCorrectAnswersByUserAndSession(ctx, sessionID, userID)
}