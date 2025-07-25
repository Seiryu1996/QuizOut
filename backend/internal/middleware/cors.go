package middleware

import (
	"quiz-app/pkg/config"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORS(cfg *config.Config) gin.HandlerFunc {
	config := cors.Config{
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}

	if cfg.Server.Environment == "development" {
		config.AllowAllOrigins = true
	} else {
		config.AllowOrigins = cfg.Server.AllowedOrigins
	}

	return cors.New(config)
}