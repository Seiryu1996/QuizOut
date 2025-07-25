package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
}

type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details,omitempty"`
}

func SuccessResponse(c *gin.Context, statusCode int, data interface{}) {
	c.JSON(statusCode, APIResponse{
		Success: true,
		Data:    data,
	})
}

func ErrorResponse(c *gin.Context, statusCode int, code, message string, details ...interface{}) {
	var detailsData interface{}
	if len(details) > 0 {
		detailsData = details[0]
	}

	c.JSON(statusCode, APIResponse{
		Success: false,
		Error: &APIError{
			Code:    code,
			Message: message,
			Details: detailsData,
		},
	})
}

func BadRequestError(c *gin.Context, message string, details ...interface{}) {
	ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", message, details...)
}

func UnauthorizedError(c *gin.Context, message string, details ...interface{}) {
	ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", message, details...)
}

func NotFoundError(c *gin.Context, message string, details ...interface{}) {
	ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", message, details...)
}

func InternalServerError(c *gin.Context, message string, details ...interface{}) {
	ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", message, details...)
}

func ConflictError(c *gin.Context, message string, details ...interface{}) {
	ErrorResponse(c, http.StatusConflict, "CONFLICT", message, details...)
}