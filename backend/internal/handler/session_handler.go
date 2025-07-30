package handler

import (
	"net/http"
	"quiz-app/internal/domain"
	"quiz-app/internal/middleware"
	"quiz-app/internal/usecase"
	"quiz-app/pkg/utils"

	"github.com/gin-gonic/gin"
)

type SessionHandler struct {
	sessionUseCase usecase.SessionUseCase
	userUseCase    usecase.UserUseCase
}

func NewSessionHandler(sessionUseCase usecase.SessionUseCase, userUseCase usecase.UserUseCase) *SessionHandler {
	return &SessionHandler{
		sessionUseCase: sessionUseCase,
		userUseCase:    userUseCase,
	}
}

type JoinSessionRequest struct {
	DisplayName string `json:"displayName" binding:"required"`
}

// GET /api/v1/sessions
func (h *SessionHandler) ListAvailableSessions(c *gin.Context) {
	sessions, err := h.sessionUseCase.ListAvailableSessions(c.Request.Context())
	if err != nil {
		utils.InternalServerError(c, "Failed to get available sessions")
		return
	}

	response := make([]map[string]interface{}, len(sessions))
	for i, session := range sessions {
		// Get participant count for each session
		participants, err := h.sessionUseCase.GetParticipants(c.Request.Context(), session.ID)
		if err != nil {
			// Log error but continue with 0 count
			participants = []*domain.Participant{}
		}

		activeParticipants, err := h.sessionUseCase.GetActiveParticipants(c.Request.Context(), session.ID)
		if err != nil {
			activeParticipants = []*domain.Participant{}
		}

		response[i] = map[string]interface{}{
			"id":              session.ID,
			"title":           session.Title,
			"status":          string(session.Status),
			"currentRound":    session.CurrentRound,
			"maxParticipants": session.MaxParticipants,
			"createdAt":       session.CreatedAt,
			"settings": map[string]interface{}{
				"timeLimit":      session.Settings.TimeLimit,
				"revivalEnabled": session.Settings.RevivalEnabled,
				"revivalCount":   session.Settings.RevivalCount,
			},
			"participantCount": len(participants),
			"activeCount":      len(activeParticipants),
		}
	}

	utils.SuccessResponse(c, http.StatusOK, response)
}

// GET /api/v1/sessions/:id/info
func (h *SessionHandler) GetSessionInfo(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		utils.BadRequestError(c, "Session ID is required")
		return
	}

	session, err := h.sessionUseCase.GetSession(c.Request.Context(), sessionID)
	if err != nil {
		utils.NotFoundError(c, "Session not found")
		return
	}

	// 参加者数取得
	participants, err := h.sessionUseCase.GetParticipants(c.Request.Context(), sessionID)
	if err != nil {
		utils.InternalServerError(c, "Failed to get participants")
		return
	}

	activeParticipants, err := h.sessionUseCase.GetActiveParticipants(c.Request.Context(), sessionID)
	if err != nil {
		utils.InternalServerError(c, "Failed to get active participants")
		return
	}

	response := map[string]interface{}{
		"id":              session.ID,
		"title":           session.Title,
		"status":          string(session.Status),
		"currentRound":    session.CurrentRound,
		"maxParticipants": session.MaxParticipants,
		"createdAt":       session.CreatedAt,
		"settings": map[string]interface{}{
			"timeLimit":      session.Settings.TimeLimit,
			"revivalEnabled": session.Settings.RevivalEnabled,
			"revivalCount":   session.Settings.RevivalCount,
		},
		"participantCount": len(participants),
		"activeCount":      len(activeParticipants),
	}

	utils.SuccessResponse(c, http.StatusOK, response)
}

// POST /api/v1/sessions/:id/join
func (h *SessionHandler) JoinSession(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		utils.BadRequestError(c, "Session ID is required")
		return
	}

	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.UnauthorizedError(c, "Authentication required")
		return
	}

	var req JoinSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestError(c, "Invalid request body", err.Error())
		return
	}

	// ユーザー作成または取得
	_, err := h.userUseCase.GetUser(c.Request.Context(), userID)
	if err != nil {
		// ユーザーが存在しない場合は作成
		_, err = h.userUseCase.CreateUser(c.Request.Context(), req.DisplayName, "", true)
		if err != nil {
			utils.InternalServerError(c, "Failed to create user")
			return
		}
	}

	participant, err := h.sessionUseCase.JoinSession(c.Request.Context(), sessionID, userID, req.DisplayName)
	if err != nil {
		switch err.Error() {
		case "session not found":
			utils.NotFoundError(c, "Session not found")
		case "session is full":
			utils.ConflictError(c, "Session is full")
		case "session is not active":
			utils.ConflictError(c, "Session is not accepting new participants")
		default:
			utils.InternalServerError(c, "Failed to join session")
		}
		return
	}

	response := map[string]interface{}{
		"participantId": participant.ID,
		"userId":       participant.UserID,
		"sessionId":    participant.SessionID,
		"displayName":  participant.DisplayName,
		"status":       string(participant.Status),
		"joinedAt":     participant.JoinedAt,
	}

	utils.SuccessResponse(c, http.StatusCreated, response)
}

// POST /api/v1/admin/sessions/:id/join (管理者専用)
func (h *SessionHandler) AdminJoinSession(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		utils.BadRequestError(c, "Session ID is required")
		return
	}

	// セッションベース認証から管理者情報を取得
	user, exists := c.Get("user")
	if !exists {
		utils.UnauthorizedError(c, "Authentication required")
		return
	}

	domainUser, ok := user.(*domain.User)
	if !ok || !domainUser.IsAdmin() {
		utils.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "Admin access required")
		return
	}

	var req JoinSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestError(c, "Invalid request body", err.Error())
		return
	}

	// 管理者用のIDとして、User.IDを使用
	userID := domainUser.ID

	participant, err := h.sessionUseCase.JoinSession(c.Request.Context(), sessionID, userID, req.DisplayName)
	if err != nil {
		switch err.Error() {
		case "session not found":
			utils.NotFoundError(c, "Session not found")
		case "session is full":
			utils.ConflictError(c, "Session is full")
		case "session is not active":
			utils.ConflictError(c, "Session is not accepting new participants")
		default:
			utils.InternalServerError(c, "Failed to join session")
		}
		return
	}

	response := map[string]interface{}{
		"participantId": participant.ID,
		"userId":       participant.UserID,
		"sessionId":    participant.SessionID,
		"displayName":  participant.DisplayName,
		"status":       string(participant.Status),
		"joinedAt":     participant.JoinedAt,
	}

	utils.SuccessResponse(c, http.StatusCreated, response)
}

// GET /api/v1/sessions/:id/participants
func (h *SessionHandler) GetParticipants(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		utils.BadRequestError(c, "Session ID is required")
		return
	}

	// 参加者のみアクセス可能
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.UnauthorizedError(c, "Authentication required")
		return
	}

	// 参加者確認
	participants, err := h.sessionUseCase.GetParticipants(c.Request.Context(), sessionID)
	if err != nil {
		utils.InternalServerError(c, "Failed to get participants")
		return
	}

	isParticipant := false
	for _, p := range participants {
		if p.UserID == userID {
			isParticipant = true
			break
		}
	}

	if !isParticipant {
		utils.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "Not a participant of this session")
		return
	}

	// アクティブな参加者のみ返す
	activeParticipants, err := h.sessionUseCase.GetActiveParticipants(c.Request.Context(), sessionID)
	if err != nil {
		utils.InternalServerError(c, "Failed to get active participants")
		return
	}

	response := make([]map[string]interface{}, len(activeParticipants))
	for i, p := range activeParticipants {
		response[i] = map[string]interface{}{
			"userId":      p.UserID,
			"displayName": p.DisplayName,
			"status":      string(p.Status),
			"score":       p.Score,
			"joinedAt":    p.JoinedAt,
		}
	}

	utils.SuccessResponse(c, http.StatusOK, response)
}

// GET /api/v1/admin/sessions/:id/participants (管理者専用)
func (h *SessionHandler) GetAdminParticipants(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		utils.BadRequestError(c, "Session ID is required")
		return
	}

	// 全参加者を取得（管理者なので参加者チェック不要）
	participants, err := h.sessionUseCase.GetParticipants(c.Request.Context(), sessionID)
	if err != nil {
		utils.InternalServerError(c, "Failed to get participants")
		return
	}

	response := make([]map[string]interface{}, len(participants))
	for i, p := range participants {
		response[i] = map[string]interface{}{
			"userId":      p.UserID,
			"displayName": p.DisplayName,
			"status":      string(p.Status),
			"score":       p.Score,
			"joinedAt":    p.JoinedAt,
		}
	}

	utils.SuccessResponse(c, http.StatusOK, response)
}

// GET /api/v1/sessions/:id/status
func (h *SessionHandler) GetSessionStatus(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		utils.BadRequestError(c, "Session ID is required")
		return
	}

	session, err := h.sessionUseCase.GetSession(c.Request.Context(), sessionID)
	if err != nil {
		utils.NotFoundError(c, "Session not found")
		return
	}

	activeParticipants, err := h.sessionUseCase.GetActiveParticipants(c.Request.Context(), sessionID)
	if err != nil {
		utils.InternalServerError(c, "Failed to get active participants")
		return
	}

	response := map[string]interface{}{
		"sessionId":        session.ID,
		"status":           string(session.Status),
		"currentRound":     session.CurrentRound,
		"activeCount":      len(activeParticipants),
		"maxParticipants":  session.MaxParticipants,
		"timeLimit":        session.Settings.TimeLimit,
		"revivalEnabled":   session.Settings.RevivalEnabled,
	}

	utils.SuccessResponse(c, http.StatusOK, response)
}