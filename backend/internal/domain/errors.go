package domain

import "errors"

var (
	// Session関連エラー
	ErrSessionNotFound      = errors.New("session not found")
	ErrInvalidSessionStatus = errors.New("invalid session status")
	ErrSessionFull          = errors.New("session is full")
	ErrSessionNotActive     = errors.New("session is not active")

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