package domain

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestNewAccessCode(t *testing.T) {
	t.Run("正常なアクセスコードが作成できること", func(t *testing.T) {
		code := "TEST123"
		accessCode, err := NewAccessCode(code)
		
		assert.NoError(t, err)
		assert.NotNil(t, accessCode)
		assert.Equal(t, code, accessCode.Code)
		assert.True(t, accessCode.IsValid)
		assert.False(t, accessCode.CreatedAt.IsZero())
		assert.False(t, accessCode.UpdatedAt.IsZero())
	})
	
	t.Run("空のアクセスコードでエラーになること", func(t *testing.T) {
		accessCode, err := NewAccessCode("")
		
		assert.Error(t, err)
		assert.Nil(t, accessCode)
		assert.Contains(t, err.Error(), "access code cannot be empty")
	})
}

func TestAccessCode_Validate(t *testing.T) {
	t.Run("正常なアクセスコードのバリデーション", func(t *testing.T) {
		accessCode := &AccessCode{
			Code:      "VALID123",
			IsValid:   true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		
		err := accessCode.Validate()
		assert.NoError(t, err)
	})
	
	t.Run("空のコードでエラーになること", func(t *testing.T) {
		accessCode := &AccessCode{
			Code:    "",
			IsValid: true,
		}
		
		err := accessCode.Validate()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "access code cannot be empty")
	})
	
	t.Run("無効なアクセスコードでエラーになること", func(t *testing.T) {
		accessCode := &AccessCode{
			Code:    "INVALID123",
			IsValid: false,
		}
		
		err := accessCode.Validate()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "access code is not valid")
	})
}

func TestAccessCode_IsExpired(t *testing.T) {
	t.Run("現在の実装では有効期限なし", func(t *testing.T) {
		accessCode := &AccessCode{
			Code:      "TEST123",
			IsValid:   true,
			CreatedAt: time.Now().Add(-24 * time.Hour), // 24時間前
			UpdatedAt: time.Now(),
		}
		
		isExpired := accessCode.IsExpired()
		assert.False(t, isExpired)
	})
}
