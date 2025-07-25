package domain

import (
	"time"
)

type SessionStatus string

const (
	SessionStatusWaiting  SessionStatus = "waiting"
	SessionStatusActive   SessionStatus = "active"
	SessionStatusFinished SessionStatus = "finished"
)

type Session struct {
	ID              string        `json:"id" firestore:"id"`
	Title           string        `json:"title" firestore:"title"`
	Status          SessionStatus `json:"status" firestore:"status"`
	CurrentRound    int           `json:"currentRound" firestore:"currentRound"`
	MaxParticipants int           `json:"maxParticipants" firestore:"maxParticipants"`
	CreatedAt       time.Time     `json:"createdAt" firestore:"createdAt"`
	UpdatedAt       time.Time     `json:"updatedAt" firestore:"updatedAt"`
	Settings        Settings      `json:"settings" firestore:"settings"`
}

type Settings struct {
	TimeLimit      int  `json:"timeLimit" firestore:"timeLimit"`           // 秒
	RevivalEnabled bool `json:"revivalEnabled" firestore:"revivalEnabled"` // 敗者復活戦有効フラグ
	RevivalCount   int  `json:"revivalCount" firestore:"revivalCount"`     // 復活可能人数
}

func NewSession(title string, maxParticipants int, settings Settings) *Session {
	now := time.Now()
	return &Session{
		Title:           title,
		Status:          SessionStatusWaiting,
		CurrentRound:    0,
		MaxParticipants: maxParticipants,
		CreatedAt:       now,
		UpdatedAt:       now,
		Settings:        settings,
	}
}

func (s *Session) Start() error {
	if s.Status != SessionStatusWaiting {
		return ErrInvalidSessionStatus
	}
	s.Status = SessionStatusActive
	s.CurrentRound = 1
	s.UpdatedAt = time.Now()
	return nil
}

func (s *Session) Finish() error {
	if s.Status != SessionStatusActive {
		return ErrInvalidSessionStatus
	}
	s.Status = SessionStatusFinished
	s.UpdatedAt = time.Now()
	return nil
}

func (s *Session) NextRound() error {
	if s.Status != SessionStatusActive {
		return ErrInvalidSessionStatus
	}
	s.CurrentRound++
	s.UpdatedAt = time.Now()
	return nil
}

func (s *Session) IsActive() bool {
	return s.Status == SessionStatusActive
}

func (s *Session) IsWaiting() bool {
	return s.Status == SessionStatusWaiting
}

func (s *Session) IsFinished() bool {
	return s.Status == SessionStatusFinished
}