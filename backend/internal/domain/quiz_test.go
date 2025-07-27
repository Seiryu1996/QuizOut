package domain

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestQuiz(t *testing.T) {
	t.Run("正常なクイズエンティティが作成できること", func(t *testing.T) {
		// テスト用の設定
		settings := Settings{
			TimeLimit:      30,
			RevivalEnabled: true,
			RevivalCount:   5,
		}

		// クイズセッション作成
		quiz := NewSession("テストクイズ", 100, settings)

		// 必須フィールドが設定されていること
		assert.NotEmpty(t, quiz.Title)
		assert.Equal(t, "テストクイズ", quiz.Title)
		assert.Equal(t, 100, quiz.MaxParticipants)
		assert.Equal(t, SessionStatusWaiting, quiz.Status)

		// デフォルト値が正しく設定されること
		assert.Equal(t, 0, quiz.CurrentRound)
		assert.False(t, quiz.CreatedAt.IsZero())
		assert.False(t, quiz.UpdatedAt.IsZero())

		// 設定値が正しく設定されること
		assert.Equal(t, 30, quiz.Settings.TimeLimit)
		assert.True(t, quiz.Settings.RevivalEnabled)
		assert.Equal(t, 5, quiz.Settings.RevivalCount)
	})

	t.Run("クイズ状態の遷移が正常に動作すること", func(t *testing.T) {
		settings := Settings{TimeLimit: 30}
		quiz := NewSession("テストクイズ", 100, settings)

		// 初期状態の確認
		assert.Equal(t, SessionStatusWaiting, quiz.Status)
		assert.True(t, quiz.IsWaiting())
		assert.False(t, quiz.IsActive())
		assert.False(t, quiz.IsFinished())

		// Waiting -> Active への遷移
		err := quiz.Start()
		assert.NoError(t, err)
		assert.Equal(t, SessionStatusActive, quiz.Status)
		assert.Equal(t, 1, quiz.CurrentRound)
		assert.False(t, quiz.IsWaiting())
		assert.True(t, quiz.IsActive())
		assert.False(t, quiz.IsFinished())

		// Active -> Finished への遷移
		err = quiz.Finish()
		assert.NoError(t, err)
		assert.Equal(t, SessionStatusFinished, quiz.Status)
		assert.False(t, quiz.IsWaiting())
		assert.False(t, quiz.IsActive())
		assert.True(t, quiz.IsFinished())
	})

	t.Run("不正な状態遷移が拒否されること", func(t *testing.T) {
		settings := Settings{TimeLimit: 30}
		quiz := NewSession("テストクイズ", 100, settings)

		// Active状態でない時のFinish呼び出し
		err := quiz.Finish()
		assert.Error(t, err)
		assert.Equal(t, ErrInvalidSessionStatus, err)

		// Active状態に遷移
		quiz.Start()

		// Active状態での再Start呼び出し
		err = quiz.Start()
		assert.Error(t, err)
		assert.Equal(t, ErrInvalidSessionStatus, err)

		// Finished状態に遷移
		quiz.Finish()

		// Finished状態でのStart呼び出し
		err = quiz.Start()
		assert.Error(t, err)
		assert.Equal(t, ErrInvalidSessionStatus, err)
	})

	t.Run("ラウンド進行が正常に動作すること", func(t *testing.T) {
		settings := Settings{TimeLimit: 30}
		quiz := NewSession("テストクイズ", 100, settings)

		// セッション開始前はNextRoundできない
		err := quiz.NextRound()
		assert.Error(t, err)
		assert.Equal(t, ErrInvalidSessionStatus, err)

		// セッション開始
		quiz.Start()
		assert.Equal(t, 1, quiz.CurrentRound)

		// ラウンド進行
		oldUpdatedAt := quiz.UpdatedAt
		time.Sleep(1 * time.Millisecond) // UpdatedAtの更新を確認するため少し待機

		err = quiz.NextRound()
		assert.NoError(t, err)
		assert.Equal(t, 2, quiz.CurrentRound)
		assert.True(t, quiz.UpdatedAt.After(oldUpdatedAt))

		// さらにラウンド進行
		err = quiz.NextRound()
		assert.NoError(t, err)
		assert.Equal(t, 3, quiz.CurrentRound)

		// セッション終了後はNextRoundできない
		quiz.Finish()
		err = quiz.NextRound()
		assert.Error(t, err)
		assert.Equal(t, ErrInvalidSessionStatus, err)
	})
}