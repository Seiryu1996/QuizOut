package repository

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createTestAccessCodeFile(t *testing.T, codes []string) string {
	tempDir := t.TempDir()
	filePath := filepath.Join(tempDir, "test_access_codes.txt")
	
	file, err := os.Create(filePath)
	require.NoError(t, err)
	defer file.Close()
	
	// コメントや空行を含むテストデータを作成
	_, err = file.WriteString("# Test access codes\n")
	require.NoError(t, err)
	_, err = file.WriteString("\n") // 空行
	require.NoError(t, err)
	
	for _, code := range codes {
		_, err = file.WriteString(code + "\n")
		require.NoError(t, err)
	}
	
	_, err = file.WriteString("\n") // 空行
	require.NoError(t, err)
	_, err = file.WriteString("# End of file\n")
	require.NoError(t, err)
	
	return filePath
}

func TestFileAccessCodeRepository_LoadAccessCodes(t *testing.T) {
	t.Run("アクセスコードファイルの読み込みが正常に動作すること", func(t *testing.T) {
		codes := []string{"CODE1", "CODE2", "CODE3"}
		filePath := createTestAccessCodeFile(t, codes)
		
		repo := NewFileAccessCodeRepository(filePath)
		loadedCodes, err := repo.LoadAccessCodes(context.Background())
		
		assert.NoError(t, err)
		assert.Len(t, loadedCodes, 3)
		assert.Contains(t, loadedCodes, "CODE1")
		assert.Contains(t, loadedCodes, "CODE2")
		assert.Contains(t, loadedCodes, "CODE3")
	})
	
	t.Run("ファイルが存在しない場合はエラーになること", func(t *testing.T) {
		repo := NewFileAccessCodeRepository("/nonexistent/path/access_codes.txt")
		codes, err := repo.LoadAccessCodes(context.Background())
		
		assert.Error(t, err)
		assert.Nil(t, codes)
	})
	
	t.Run("コメント行と空行の処理が正しいこと", func(t *testing.T) {
		// コメントや空行を含むファイルを作成
		tempDir := t.TempDir()
		filePath := filepath.Join(tempDir, "test_comments.txt")
		
		file, err := os.Create(filePath)
		require.NoError(t, err)
		defer file.Close()
		
		_, err = file.WriteString("# This is a comment\n")
		require.NoError(t, err)
		_, err = file.WriteString("VALID_CODE1\n")
		require.NoError(t, err)
		_, err = file.WriteString("\n") // 空行
		require.NoError(t, err)
		_, err = file.WriteString("  VALID_CODE2  \n") // 前後にスペース
		require.NoError(t, err)
		_, err = file.WriteString("# Another comment\n")
		require.NoError(t, err)
		_, err = file.WriteString("VALID_CODE3\n")
		require.NoError(t, err)
		
		repo := NewFileAccessCodeRepository(filePath)
		codes, err := repo.LoadAccessCodes(context.Background())
		
		assert.NoError(t, err)
		assert.Len(t, codes, 3)
		assert.Contains(t, codes, "VALID_CODE1")
		assert.Contains(t, codes, "VALID_CODE2")
		assert.Contains(t, codes, "VALID_CODE3")
	})
}

func TestFileAccessCodeRepository_IsValidAccessCode(t *testing.T) {
	t.Run("有効なアクセスコードの検証が正常に動作すること", func(t *testing.T) {
		codes := []string{"VALID1", "VALID2", "VALID3"}
		filePath := createTestAccessCodeFile(t, codes)
		
		repo := NewFileAccessCodeRepository(filePath)
		_, err := repo.LoadAccessCodes(context.Background())
		require.NoError(t, err)
		
		// 有効なコードでtrueが返ること
		isValid, err := repo.IsValidAccessCode(context.Background(), "VALID1")
		assert.NoError(t, err)
		assert.True(t, isValid)
		
		// 無効なコードでfalseが返ること
		isValid, err = repo.IsValidAccessCode(context.Background(), "INVALID")
		assert.NoError(t, err)
		assert.False(t, isValid)
	})
	
	t.Run("ファイル更新の自動検知が動作すること", func(t *testing.T) {
		codes := []string{"INITIAL"}
		filePath := createTestAccessCodeFile(t, codes)
		
		repo := NewFileAccessCodeRepository(filePath)
		_, err := repo.LoadAccessCodes(context.Background())
		require.NoError(t, err)
		
		// 初期コードの確認
		isValid, err := repo.IsValidAccessCode(context.Background(), "INITIAL")
		assert.NoError(t, err)
		assert.True(t, isValid)
		
		// ファイルを更新
		time.Sleep(10 * time.Millisecond) // ファイルタイムスタンプが変わるように少し待つ
		file, err := os.OpenFile(filePath, os.O_WRONLY|os.O_TRUNC, 0644)
		require.NoError(t, err)
		_, err = file.WriteString("# Updated file\n")
		require.NoError(t, err)
		_, err = file.WriteString("UPDATED\n")
		require.NoError(t, err)
		file.Close()
		
		// 更新後のコードの確認
		isValid, err = repo.IsValidAccessCode(context.Background(), "UPDATED")
		assert.NoError(t, err)
		assert.True(t, isValid)
		
		// 古いコードは無効になる
		isValid, err = repo.IsValidAccessCode(context.Background(), "INITIAL")
		assert.NoError(t, err)
		assert.False(t, isValid)
	})
}

func TestFileAccessCodeRepository_GetValidCodes(t *testing.T) {
	t.Run("有効なアクセスコード一覧を取得できること", func(t *testing.T) {
		codes := []string{"CODE1", "CODE2", "CODE3"}
		filePath := createTestAccessCodeFile(t, codes)
		
		repo := NewFileAccessCodeRepository(filePath)
		_, err := repo.LoadAccessCodes(context.Background())
		require.NoError(t, err)
		
		validCodes, err := repo.GetValidCodes(context.Background())
		assert.NoError(t, err)
		assert.Len(t, validCodes, 3)
		
		// 順序は保証されないのでContainsでチェック
		for _, code := range codes {
			assert.Contains(t, validCodes, code)
		}
	})
}
