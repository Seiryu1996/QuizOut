package domain

import (
	"time"
)

type GameStatus string

const (
	GameStatusWaiting  GameStatus = "waiting"
	GameStatusActive   GameStatus = "active" 
	GameStatusFinished GameStatus = "finished"
)

// Legacy aliases for backward compatibility
type SessionStatus = GameStatus
const (
	SessionStatusWaiting  = GameStatusWaiting
	SessionStatusActive   = GameStatusActive
	SessionStatusFinished = GameStatusFinished
)

type Game struct {
	ID              string     `json:"id" firestore:"id"`
	Title           string     `json:"title" firestore:"title"`
	Status          GameStatus `json:"status" firestore:"status"`
	CurrentRound    int        `json:"currentRound" firestore:"currentRound"`
	MaxParticipants int        `json:"maxParticipants" firestore:"maxParticipants"`
	CreatedAt       time.Time  `json:"createdAt" firestore:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt" firestore:"updatedAt"`
	Settings        Settings   `json:"settings" firestore:"settings"`
}

// Legacy alias for backward compatibility
type Session = Game

type Settings struct {
	TimeLimit      int  `json:"timeLimit" firestore:"timeLimit"`           // 秒
	RevivalEnabled bool `json:"revivalEnabled" firestore:"revivalEnabled"` // 敗者復活戦有効フラグ
	RevivalCount   int  `json:"revivalCount" firestore:"revivalCount"`     // 復活可能人数
}

func NewGame(title string, maxParticipants int, settings Settings) *Game {
	now := time.Now()
	return &Game{
		Title:           title,
		Status:          GameStatusWaiting,
		CurrentRound:    0,
		MaxParticipants: maxParticipants,
		CreatedAt:       now,
		UpdatedAt:       now,
		Settings:        settings,
	}
}

// Legacy function for backward compatibility
func NewSession(title string, maxParticipants int, settings Settings) *Session {
	return NewGame(title, maxParticipants, settings)
}

func (g *Game) Start() error {
	if g.Status != GameStatusWaiting {
		return ErrInvalidGameStatus
	}
	g.Status = GameStatusActive
	g.CurrentRound = 1
	g.UpdatedAt = time.Now()
	return nil
}

func (g *Game) Finish() error {
	if g.Status != GameStatusActive {
		return ErrInvalidGameStatus
	}
	g.Status = GameStatusFinished
	g.UpdatedAt = time.Now()
	return nil
}

func (g *Game) NextRound() error {
	if g.Status != GameStatusActive {
		return ErrInvalidGameStatus
	}
	g.CurrentRound++
	g.UpdatedAt = time.Now()
	return nil
}

func (g *Game) IsActive() bool {
	return g.Status == GameStatusActive
}

func (g *Game) IsWaiting() bool {
	return g.Status == GameStatusWaiting
}

func (g *Game) IsFinished() bool {
	return g.Status == GameStatusFinished
}