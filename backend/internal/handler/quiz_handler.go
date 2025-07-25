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

type QuizHandler struct {
	quizUseCase    usecase.QuizUseCase
	sessionUseCase usecase.SessionUseCase
}

func NewQuizHandler(quizUseCase usecase.QuizUseCase, sessionUseCase usecase.SessionUseCase) *QuizHandler {
	return &QuizHandler{
		quizUseCase:    quizUseCase,
		sessionUseCase: sessionUseCase,
	}
}

type SubmitAnswerRequest struct {
	QuestionID     string `json:"questionId" binding:"required"`
	SelectedOption int    `json:"selectedOption" binding:"required,min=0,max=3"`
	ResponseTime   int    `json:"responseTime" binding:"required,min=0"`
}

// GET /api/v1/sessions/:id/current-question
func (h *QuizHandler) GetCurrentQuestion(c *gin.Context) {
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

	// 参加者確認
	participants, err := h.sessionUseCase.GetParticipants(c.Request.Context(), sessionID)
	if err != nil {
		utils.InternalServerError(c, "Failed to verify participation")
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

	question, err := h.quizUseCase.GetCurrentQuestion(c.Request.Context(), sessionID)
	if err != nil {
		if err == domain.ErrQuestionNotFound {
			utils.NotFoundError(c, "No current question available")
		} else {
			utils.InternalServerError(c, "Failed to get current question")
		}
		return
	}

	response := map[string]interface{}{
		"id":       question.ID,
		"text":     question.Text,
		"options":  question.Options,
		"round":    question.Round,
		"category": question.Category,
		"difficulty": string(question.Difficulty),
		"createdAt": question.CreatedAt,
	}

	utils.SuccessResponse(c, http.StatusOK, response)
}

// POST /api/v1/sessions/:id/answers
func (h *QuizHandler) SubmitAnswer(c *gin.Context) {
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

	var req SubmitAnswerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestError(c, "Invalid request body", err.Error())
		return
	}

	answer, err := h.quizUseCase.SubmitAnswer(
		c.Request.Context(),
		sessionID,
		userID,
		req.QuestionID,
		req.SelectedOption,
		req.ResponseTime,
	)

	if err != nil {
		switch err {
		case domain.ErrSessionNotFound:
			utils.NotFoundError(c, "Session not found")
		case domain.ErrSessionNotActive:
			utils.ConflictError(c, "Session is not active")
		case domain.ErrParticipantNotFound:
			utils.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "Not a participant of this session")
		case domain.ErrParticipantEliminated:
			utils.ConflictError(c, "Participant is eliminated")
		case domain.ErrQuestionNotFound:
			utils.NotFoundError(c, "Question not found")
		case domain.ErrAnswerExists:
			utils.ConflictError(c, "Answer already submitted")
		default:
			utils.InternalServerError(c, "Failed to submit answer")
		}
		return
	}

	response := map[string]interface{}{
		"answerId":       answer.ID,
		"questionId":     answer.QuestionID,
		"selectedOption": answer.SelectedOption,
		"isCorrect":      answer.IsCorrect,
		"responseTime":   answer.ResponseTime,
		"answeredAt":     answer.AnsweredAt,
	}

	utils.SuccessResponse(c, http.StatusCreated, response)
}

// POST /api/v1/sessions/:id/generate-question
func (h *QuizHandler) GenerateQuestion(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		utils.BadRequestError(c, "Session ID is required")
		return
	}

	// 管理者権限確認
	claims, exists := middleware.GetUserClaims(c)
	if !exists {
		utils.UnauthorizedError(c, "Authentication required")
		return
	}

	if role, ok := claims["role"].(string); !ok || role != "admin" {
		utils.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "Admin access required")
		return
	}

	// セッション取得
	session, err := h.sessionUseCase.GetSession(c.Request.Context(), sessionID)
	if err != nil {
		utils.NotFoundError(c, "Session not found")
		return
	}

	if !session.IsActive() {
		utils.ConflictError(c, "Session is not active")
		return
	}

	// クエリパラメータから設定取得
	roundStr := c.DefaultQuery("round", strconv.Itoa(session.CurrentRound))
	round, err := strconv.Atoi(roundStr)
	if err != nil {
		round = session.CurrentRound
	}

	difficulty := domain.Difficulty(c.DefaultQuery("difficulty", ""))
	category := c.DefaultQuery("category", "")

	question, err := h.quizUseCase.GenerateQuestion(c.Request.Context(), sessionID, round, difficulty, category)
	if err != nil {
		utils.InternalServerError(c, "Failed to generate question", err.Error())
		return
	}

	response := map[string]interface{}{
		"id":         question.ID,
		"text":       question.Text,
		"options":    question.Options,
		"round":      question.Round,
		"category":   question.Category,
		"difficulty": string(question.Difficulty),
		"aiProvider": string(question.AIProvider),
		"createdAt":  question.CreatedAt,
	}

	utils.SuccessResponse(c, http.StatusCreated, response)
}

// POST /api/v1/sessions/:id/process-results
func (h *QuizHandler) ProcessRoundResults(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		utils.BadRequestError(c, "Session ID is required")
		return
	}

	questionID := c.Query("questionId")
	if questionID == "" {
		utils.BadRequestError(c, "Question ID is required")
		return
	}

	// 管理者権限確認
	claims, exists := middleware.GetUserClaims(c)
	if !exists {
		utils.UnauthorizedError(c, "Authentication required")
		return
	}

	if role, ok := claims["role"].(string); !ok || role != "admin" {
		utils.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "Admin access required")
		return
	}

	survivors, eliminated, err := h.quizUseCase.ProcessRoundResults(c.Request.Context(), sessionID, questionID)
	if err != nil {
		utils.InternalServerError(c, "Failed to process round results", err.Error())
		return
	}

	survivorData := make([]map[string]interface{}, len(survivors))
	for i, p := range survivors {
		survivorData[i] = map[string]interface{}{
			"userId":      p.UserID,
			"displayName": p.DisplayName,
			"score":       p.Score,
		}
	}

	eliminatedData := make([]map[string]interface{}, len(eliminated))
	for i, p := range eliminated {
		eliminatedData[i] = map[string]interface{}{
			"userId":      p.UserID,
			"displayName": p.DisplayName,
			"score":       p.Score,
		}
	}

	response := map[string]interface{}{
		"survivors":  survivorData,
		"eliminated": eliminatedData,
	}

	utils.SuccessResponse(c, http.StatusOK, response)
}

// POST /api/v1/sessions/:id/next-round
func (h *QuizHandler) NextRound(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		utils.BadRequestError(c, "Session ID is required")
		return
	}

	// 管理者権限確認
	claims, exists := middleware.GetUserClaims(c)
	if !exists {
		utils.UnauthorizedError(c, "Authentication required")
		return
	}

	if role, ok := claims["role"].(string); !ok || role != "admin" {
		utils.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "Admin access required")
		return
	}

	err := h.quizUseCase.NextRound(c.Request.Context(), sessionID)
	if err != nil {
		switch err {
		case domain.ErrSessionNotFound:
			utils.NotFoundError(c, "Session not found")
		case domain.ErrSessionNotActive:
			utils.ConflictError(c, "Session is not active")
		default:
			utils.InternalServerError(c, "Failed to proceed to next round")
		}
		return
	}

	utils.SuccessResponse(c, http.StatusOK, map[string]string{
		"message": "Proceeded to next round",
	})
}