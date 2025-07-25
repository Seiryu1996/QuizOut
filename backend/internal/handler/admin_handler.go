package handler

import (
	"net/http"
	"quiz-app/internal/domain"
	"quiz-app/internal/middleware"
	"quiz-app/internal/usecase"
	"quiz-app/pkg/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

type AdminHandler struct {
	sessionUseCase usecase.SessionUseCase
	adminUseCase   usecase.AdminUseCase
}

func NewAdminHandler(sessionUseCase usecase.SessionUseCase, adminUseCase usecase.AdminUseCase) *AdminHandler {
	return &AdminHandler{
		sessionUseCase: sessionUseCase,
		adminUseCase:   adminUseCase,
	}
}

type CreateSessionRequest struct {
	Title           string `json:"title" binding:"required"`
	MaxParticipants int    `json:"maxParticipants"`
	TimeLimit       int    `json:"timeLimit"`
	RevivalEnabled  bool   `json:"revivalEnabled"`
	RevivalCount    int    `json:"revivalCount"`
}

type ControlSessionRequest struct {
	Action string `json:"action" binding:"required"` // "start", "finish", "pause"
}

type StartRevivalRequest struct {
	Count int `json:"count" binding:"required,min=1"`
}

// POST /api/v1/admin/sessions
func (h *AdminHandler) CreateSession(c *gin.Context) {
	var req CreateSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestError(c, "Invalid request body", err.Error())
		return
	}

	// デフォルト値設定
	if req.MaxParticipants <= 0 {
		req.MaxParticipants = 200
	}
	if req.TimeLimit <= 0 {
		req.TimeLimit = 30 // 30秒
	}
	if req.RevivalCount <= 0 {
		req.RevivalCount = 3
	}

	settings := domain.Settings{
		TimeLimit:      req.TimeLimit,
		RevivalEnabled: req.RevivalEnabled,
		RevivalCount:   req.RevivalCount,
	}

	session, err := h.sessionUseCase.CreateSession(c.Request.Context(), req.Title, req.MaxParticipants, settings)
	if err != nil {
		utils.InternalServerError(c, "Failed to create session")
		return
	}

	response := map[string]interface{}{
		"id":              session.ID,
		"title":           session.Title,
		"status":          string(session.Status),
		"maxParticipants": session.MaxParticipants,
		"createdAt":       session.CreatedAt,
		"settings": map[string]interface{}{
			"timeLimit":      session.Settings.TimeLimit,
			"revivalEnabled": session.Settings.RevivalEnabled,
			"revivalCount":   session.Settings.RevivalCount,
		},
	}

	utils.SuccessResponse(c, http.StatusCreated, response)
}

// PUT /api/v1/admin/sessions/:id/control
func (h *AdminHandler) ControlSession(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		utils.BadRequestError(c, "Session ID is required")
		return
	}

	var req ControlSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestError(c, "Invalid request body", err.Error())
		return
	}

	var err error
	var message string

	switch req.Action {
	case "start":
		err = h.sessionUseCase.StartSession(c.Request.Context(), sessionID)
		message = "Session started successfully"
	case "finish":
		err = h.sessionUseCase.FinishSession(c.Request.Context(), sessionID)
		message = "Session finished successfully"
	default:
		utils.BadRequestError(c, "Invalid action. Use 'start' or 'finish'")
		return
	}

	if err != nil {
		switch err {
		case domain.ErrSessionNotFound:
			utils.NotFoundError(c, "Session not found")
		case domain.ErrInvalidSessionStatus:
			utils.ConflictError(c, "Invalid session status for this action")
		default:
			utils.InternalServerError(c, "Failed to control session")
		}
		return
	}

	utils.SuccessResponse(c, http.StatusOK, map[string]string{
		"message": message,
	})
}

// GET /api/v1/admin/sessions/:id/stats
func (h *AdminHandler) GetSessionStats(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		utils.BadRequestError(c, "Session ID is required")
		return
	}

	stats, err := h.adminUseCase.GetSessionStats(c.Request.Context(), sessionID)
	if err != nil {
		if err == domain.ErrSessionNotFound {
			utils.NotFoundError(c, "Session not found")
		} else {
			utils.InternalServerError(c, "Failed to get session stats")
		}
		return
	}

	utils.SuccessResponse(c, http.StatusOK, stats)
}

// POST /api/v1/admin/sessions/:id/revival
func (h *AdminHandler) StartRevival(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		utils.BadRequestError(c, "Session ID is required")
		return
	}

	var req StartRevivalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestError(c, "Invalid request body", err.Error())
		return
	}

	revivedParticipants, err := h.adminUseCase.StartRevival(c.Request.Context(), sessionID, req.Count)
	if err != nil {
		switch err {
		case domain.ErrSessionNotFound:
			utils.NotFoundError(c, "Session not found")
		case domain.ErrSessionNotActive:
			utils.ConflictError(c, "Session is not active")
		default:
			utils.InternalServerError(c, "Failed to start revival", err.Error())
		}
		return
	}

	revivedData := make([]map[string]interface{}, len(revivedParticipants))
	for i, p := range revivedParticipants {
		revivedData[i] = map[string]interface{}{
			"userId":      p.UserID,
			"displayName": p.DisplayName,
			"revivedAt":   p.RevivedAt,
		}
	}

	response := map[string]interface{}{
		"revived": revivedData,
		"count":   len(revivedParticipants),
	}

	utils.SuccessResponse(c, http.StatusOK, response)
}

// GET /api/v1/admin/sessions/:id/results
func (h *AdminHandler) GetResults(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		utils.BadRequestError(c, "Session ID is required")
		return
	}

	// 参加者情報取得
	participants, err := h.sessionUseCase.GetParticipants(c.Request.Context(), sessionID)
	if err != nil {
		utils.InternalServerError(c, "Failed to get participants")
		return
	}

	// セッション情報取得
	session, err := h.sessionUseCase.GetSession(c.Request.Context(), sessionID)
	if err != nil {
		utils.NotFoundError(c, "Session not found")
		return
	}

	// 結果データ作成
	participantData := make([]map[string]interface{}, len(participants))
	for i, p := range participants {
		participantData[i] = map[string]interface{}{
			"userId":         p.UserID,
			"displayName":    p.DisplayName,
			"status":         string(p.Status),
			"score":          p.Score,
			"correctAnswers": p.CorrectAnswers,
			"joinedAt":       p.JoinedAt,
			"eliminatedAt":   p.EliminatedAt,
			"revivedAt":      p.RevivedAt,
		}
	}

	response := map[string]interface{}{
		"session": map[string]interface{}{
			"id":           session.ID,
			"title":        session.Title,
			"status":       string(session.Status),
			"currentRound": session.CurrentRound,
			"createdAt":    session.CreatedAt,
		},
		"participants": participantData,
	}

	utils.SuccessResponse(c, http.StatusOK, response)
}

// GET /api/v1/admin/sessions/:id/export
func (h *AdminHandler) ExportResults(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		utils.BadRequestError(c, "Session ID is required")
		return
	}

	csvData, err := h.adminUseCase.ExportResults(c.Request.Context(), sessionID)
	if err != nil {
		if err == domain.ErrSessionNotFound {
			utils.NotFoundError(c, "Session not found")
		} else {
			utils.InternalServerError(c, "Failed to export results")
		}
		return
	}

	// セッション情報取得してファイル名に使用
	session, err := h.sessionUseCase.GetSession(c.Request.Context(), sessionID)
	if err != nil {
		utils.NotFoundError(c, "Session not found")
		return
	}

	filename := session.Title + "_results.csv"
	
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Data(http.StatusOK, "text/csv", csvData)
}

// POST /api/v1/admin/sessions/:id/skip-question
func (h *AdminHandler) SkipQuestion(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		utils.BadRequestError(c, "Session ID is required")
		return
	}

	err := h.adminUseCase.SkipQuestion(c.Request.Context(), sessionID)
	if err != nil {
		switch err {
		case domain.ErrSessionNotFound:
			utils.NotFoundError(c, "Session not found")
		case domain.ErrSessionNotActive:
			utils.ConflictError(c, "Session is not active")
		case domain.ErrQuestionNotFound:
			utils.NotFoundError(c, "No current question to skip")
		default:
			utils.InternalServerError(c, "Failed to skip question")
		}
		return
	}

	utils.SuccessResponse(c, http.StatusOK, map[string]string{
		"message": "Question skipped successfully",
	})
}