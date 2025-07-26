package domain

import (
	"errors"
	"time"
)

// AccessCode アクセスコードエンティティ
type AccessCode struct {
	Code      string    `json:"code"`
	IsValid   bool      `json:"isValid"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// AccessCodeConfig アクセスコード設定
type AccessCodeConfig struct {
	ValidCodes  []string  `json:"validCodes"`
	LastUpdated time.Time `json:"lastUpdated"`
}

// NewAccessCode 新しいアクセスコードを作成
func NewAccessCode(code string) (*AccessCode, error) {
	if code == "" {
		return nil, errors.New("access code cannot be empty")
	}
	
	now := time.Now()
	return &AccessCode{
		Code:      code,
		IsValid:   true,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

// Validate アクセスコードの有効性をチェック
func (ac *AccessCode) Validate() error {
	if ac.Code == "" {
		return errors.New("access code cannot be empty")
	}
	if !ac.IsValid {
		return errors.New("access code is not valid")
	}
	return nil
}

// IsExpired アクセスコードの有効期限をチェック（現在は無期限）
func (ac *AccessCode) IsExpired() bool {
	// 現在の実装では有効期限なし
	return false
}
