package repository

import (
	"bufio"
	"context"
	"os"
	"strings"
	"sync"
	"time"

	// "quiz-app/internal/domain" // 一時的にコメントアウト
)

// AccessCodeRepository アクセスコードリポジトリインターフェース
type AccessCodeRepository interface {
	LoadAccessCodes(ctx context.Context) ([]string, error)
	IsValidAccessCode(ctx context.Context, code string) (bool, error)
	ReloadAccessCodes(ctx context.Context) error
	GetValidCodes(ctx context.Context) ([]string, error)
}

// FileAccessCodeRepository ファイルベースのアクセスコードリポジトリ
type FileAccessCodeRepository struct {
	filePath string
	codes    map[string]bool
	lastMod  time.Time
	mu       sync.RWMutex
}

// NewFileAccessCodeRepository 新しいファイルアクセスコードリポジトリを作成
func NewFileAccessCodeRepository(filePath string) *FileAccessCodeRepository {
	return &FileAccessCodeRepository{
		filePath: filePath,
		codes:    make(map[string]bool),
	}
}

// LoadAccessCodes アクセスコードをファイルから読み込み
func (r *FileAccessCodeRepository) LoadAccessCodes(ctx context.Context) ([]string, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	file, err := os.Open(r.filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	// ファイルの更新時刻を取得
	if stat, err := file.Stat(); err == nil {
		r.lastMod = stat.ModTime()
	}

	var codes []string
	r.codes = make(map[string]bool)
	
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		// 空行やコメント行をスキップ
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		codes = append(codes, line)
		r.codes[line] = true
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return codes, nil
}

// IsValidAccessCode アクセスコードが有効かどうかをチェック
func (r *FileAccessCodeRepository) IsValidAccessCode(ctx context.Context, code string) (bool, error) {
	// ファイルの更新をチェック
	if err := r.checkAndReload(ctx); err != nil {
		return false, err
	}

	r.mu.RLock()
	defer r.mu.RUnlock()
	
	return r.codes[code], nil
}

// ReloadAccessCodes アクセスコードを再読み込み
func (r *FileAccessCodeRepository) ReloadAccessCodes(ctx context.Context) error {
	_, err := r.LoadAccessCodes(ctx)
	return err
}

// GetValidCodes 有効なアクセスコード一覧を取得
func (r *FileAccessCodeRepository) GetValidCodes(ctx context.Context) ([]string, error) {
	if err := r.checkAndReload(ctx); err != nil {
		return nil, err
	}

	r.mu.RLock()
	defer r.mu.RUnlock()
	
	var codes []string
	for code := range r.codes {
		codes = append(codes, code)
	}
	return codes, nil
}

// checkAndReload ファイルの更新をチェックして必要に応じて再読み込み
func (r *FileAccessCodeRepository) checkAndReload(ctx context.Context) error {
	stat, err := os.Stat(r.filePath)
	if err != nil {
		return err
	}

	// ファイルが更新されているかチェック
	if stat.ModTime().After(r.lastMod) {
		_, err := r.LoadAccessCodes(ctx)
		return err
	}
	
	return nil
}
