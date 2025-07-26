package domain

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

type ParticipantStatus string

const (
	ParticipantStatusActive     ParticipantStatus = "active"
	ParticipantStatusEliminated ParticipantStatus = "eliminated"
	ParticipantStatusRevived    ParticipantStatus = "revived"
)

type User struct {
	ID          string    `json:"id" firestore:"id"`
	Username    string    `json:"username" firestore:"username"`
	DisplayName string    `json:"displayName" firestore:"displayName"`
	Email       string    `json:"email" firestore:"email"`
	IsAnonymous bool      `json:"isAnonymous" firestore:"isAnonymous"`
	AccessCode  string    `json:"accessCode" firestore:"accessCode"`
	CreatedAt   time.Time `json:"createdAt" firestore:"createdAt"`
	LastLoginAt time.Time `json:"lastLoginAt" firestore:"lastLoginAt"`
}

type Participant struct {
	ID             string            `json:"id" firestore:"id"`
	UserID         string            `json:"userId" firestore:"userId"`
	SessionID      string            `json:"sessionId" firestore:"sessionId"`
	DisplayName    string            `json:"displayName" firestore:"displayName"`
	Status         ParticipantStatus `json:"status" firestore:"status"`
	JoinedAt       time.Time         `json:"joinedAt" firestore:"joinedAt"`
	EliminatedAt   *time.Time        `json:"eliminatedAt,omitempty" firestore:"eliminatedAt,omitempty"`
	RevivedAt      *time.Time        `json:"revivedAt,omitempty" firestore:"revivedAt,omitempty"`
	Score          int               `json:"score" firestore:"score"`
	CorrectAnswers int               `json:"correctAnswers" firestore:"correctAnswers"`
}

// NewUserWithEmail Firebase認証用のユーザー作成
func NewUserWithEmail(displayName, email string, isAnonymous bool) *User {
	now := time.Now()
	return &User{
		ID:          uuid.New().String(),
		Username:    "",
		DisplayName: displayName,
		Email:       email,
		IsAnonymous: isAnonymous,
		CreatedAt:   now,
		LastLoginAt: now,
	}
}

// NewUserWithUsername ユーザー名・パスワード認証用のユーザー作成
func NewUserWithUsername(username, displayName string) (*User, error) {
	if username == "" {
		return nil, errors.New("username cannot be empty")
	}
	if displayName == "" {
		return nil, errors.New("display name cannot be empty")
	}

	now := time.Now()
	return &User{
		ID:          uuid.New().String(),
		Username:    username,
		DisplayName: displayName,
		Email:       "",
		IsAnonymous: false,
		AccessCode:  "",
		CreatedAt:   now,
		LastLoginAt: time.Time{}, // ログインするまで空
	}, nil
}

// NewUser アクセスコード認証によるユーザー作成
func NewUser(displayName, accessCode string) (*User, error) {
	if displayName == "" {
		return nil, errors.New("display name cannot be empty")
	}
	if accessCode == "" {
		return nil, errors.New("access code cannot be empty")
	}

	now := time.Now()
	return &User{
		ID:          uuid.New().String(),
		DisplayName: displayName,
		Email:       "", // アクセスコード認証の場合はメールアドレスなし
		IsAnonymous: true, // アクセスコード認証は匿名ユーザーとして扱う
		AccessCode:  accessCode,
		CreatedAt:   now,
		LastLoginAt: now,
	}, nil
}

func NewParticipant(userID, sessionID, displayName string) *Participant {
	return &Participant{
		UserID:         userID,
		SessionID:      sessionID,
		DisplayName:    displayName,
		Status:         ParticipantStatusActive,
		JoinedAt:       time.Now(),
		Score:          0,
		CorrectAnswers: 0,
	}
}

func (p *Participant) Eliminate() {
	now := time.Now()
	p.Status = ParticipantStatusEliminated
	p.EliminatedAt = &now
}

func (p *Participant) Revive() {
	now := time.Now()
	p.Status = ParticipantStatusRevived
	p.RevivedAt = &now
}

func (p *Participant) AddCorrectAnswer(points int) {
	p.CorrectAnswers++
	p.Score += points
}

func (p *Participant) IsActive() bool {
	return p.Status == ParticipantStatusActive || p.Status == ParticipantStatusRevived
}

func (p *Participant) IsEliminated() bool {
	return p.Status == ParticipantStatusEliminated
}