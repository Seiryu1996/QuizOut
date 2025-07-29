package domain

import "errors"

var (
	// Game関連エラー (Session関連エラーも互換性のため残す)
	ErrGameNotFound      = errors.New("game not found")
	ErrInvalidGameStatus = errors.New("invalid game status")
	ErrGameFull          = errors.New("game is full")
	ErrGameNotActive     = errors.New("game is not active")
	
	// Session関連エラー (Legacy - 互換性のため残す)
	ErrSessionNotFound      = ErrGameNotFound
	ErrInvalidSessionStatus = ErrInvalidGameStatus
	ErrSessionFull          = ErrGameFull
	ErrSessionNotActive     = ErrGameNotActive

	// User関連エラー
	ErrUserNotFound         = errors.New("user not found")
	ErrParticipantNotFound  = errors.New("participant not found")
	ErrParticipantExists    = errors.New("participant already exists")
	ErrParticipantEliminated = errors.New("participant is eliminated")

	// Question関連エラー
	ErrQuestionNotFound  = errors.New("question not found")
	ErrInvalidAnswer     = errors.New("invalid answer")
	ErrAnswerExists      = errors.New("answer already exists")
	ErrTimeExpired       = errors.New("answer time expired")

	// AI関連エラー
	ErrAIServiceUnavailable = errors.New("AI service is unavailable")
	ErrInvalidPrompt        = errors.New("invalid prompt")

	// 一般的なエラー
	ErrInvalidInput = errors.New("invalid input")
	ErrUnauthorized = errors.New("unauthorized")
	ErrForbidden    = errors.New("forbidden")
)