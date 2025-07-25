package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Server   ServerConfig
	Firebase FirebaseConfig
	AI       AIConfig
}

type ServerConfig struct {
	Port            string
	Environment     string
	AllowedOrigins  []string
	MaxConnections  int
	ReadTimeout     int
	WriteTimeout    int
	ShutdownTimeout int
}

type FirebaseConfig struct {
	ProjectID     string
	PrivateKey    string
	ClientEmail   string
	DatabaseURL   string
	StorageBucket string
}

type AIConfig struct {
	GeminiAPIKey string
	OpenAIAPIKey string
	ClaudeAPIKey string
}

func Load() (*Config, error) {
	if err := godotenv.Load(); err != nil {
		// .envファイルが存在しない場合は無視（環境変数から読み取り）
	}

	config := &Config{
		Server: ServerConfig{
			Port:            getEnv("PORT", "8080"),
			Environment:     getEnv("ENVIRONMENT", "development"),
			AllowedOrigins:  []string{getEnv("ALLOWED_ORIGINS", "http://localhost:3000")},
			MaxConnections:  getEnvAsInt("MAX_CONNECTIONS", 1000),
			ReadTimeout:     getEnvAsInt("READ_TIMEOUT", 30),
			WriteTimeout:    getEnvAsInt("WRITE_TIMEOUT", 30),
			ShutdownTimeout: getEnvAsInt("SHUTDOWN_TIMEOUT", 10),
		},
		Firebase: FirebaseConfig{
			ProjectID:     getEnv("FIREBASE_PROJECT_ID", ""),
			PrivateKey:    getEnv("FIREBASE_PRIVATE_KEY", ""),
			ClientEmail:   getEnv("FIREBASE_CLIENT_EMAIL", ""),
			DatabaseURL:   getEnv("FIREBASE_DATABASE_URL", ""),
			StorageBucket: getEnv("FIREBASE_STORAGE_BUCKET", ""),
		},
		AI: AIConfig{
			GeminiAPIKey: getEnv("GEMINI_API_KEY", ""),
			OpenAIAPIKey: getEnv("OPENAI_API_KEY", ""),
			ClaudeAPIKey: getEnv("CLAUDE_API_KEY", ""),
		},
	}

	return config, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}