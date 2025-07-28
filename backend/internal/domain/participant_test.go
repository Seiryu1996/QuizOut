package domain

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestParticipant(t *testing.T) {
	t.Run("参加者エンティティが正常に作成できること", func(t *testing.T) {
		// 参加者作成
		participant := NewParticipant("user123", "session456", "テストユーザー")

		// 必須フィールドが設定されていること
		assert.Equal(t, "user123", participant.UserID)
		assert.Equal(t, "session456", participant.SessionID)
		assert.Equal(t, "テストユーザー", participant.DisplayName)

		// 初期状態がActiveであること
		assert.Equal(t, ParticipantStatusActive, participant.Status)
		assert.True(t, participant.IsActive())
		assert.False(t, participant.IsEliminated())

		// スコアが0で初期化されること
		assert.Equal(t, 0, participant.Score)
		assert.Equal(t, 0, participant.CorrectAnswers)

		// 日時フィールドが正しく設定されること
		assert.False(t, participant.JoinedAt.IsZero())
		assert.Nil(t, participant.EliminatedAt)
		assert.Nil(t, participant.RevivedAt)
	})

	t.Run("参加者状態の変更が正常に動作すること", func(t *testing.T) {
		participant := NewParticipant("user123", "session456", "テストユーザー")

		// Active -> Eliminated への変更
		beforeEliminate := time.Now()
		participant.Eliminate()
		afterEliminate := time.Now()

		assert.Equal(t, ParticipantStatusEliminated, participant.Status)
		assert.False(t, participant.IsActive())
		assert.True(t, participant.IsEliminated())
		assert.NotNil(t, participant.EliminatedAt)
		assert.True(t, participant.EliminatedAt.After(beforeEliminate))
		assert.True(t, participant.EliminatedAt.Before(afterEliminate))

		// Eliminated -> Revived への変更
		beforeRevive := time.Now()
		participant.Revive()
		afterRevive := time.Now()

		assert.Equal(t, ParticipantStatusRevived, participant.Status)
		assert.True(t, participant.IsActive()) // RevivedもActiveとして扱う
		assert.False(t, participant.IsEliminated())
		assert.NotNil(t, participant.RevivedAt)
		assert.True(t, participant.RevivedAt.After(beforeRevive))
		assert.True(t, participant.RevivedAt.Before(afterRevive))
	})

	t.Run("スコア計算が正常に動作すること", func(t *testing.T) {
		participant := NewParticipant("user123", "session456", "テストユーザー")

		// 初期状態の確認
		assert.Equal(t, 0, participant.Score)
		assert.Equal(t, 0, participant.CorrectAnswers)

		// 正解時のスコア加算
		participant.AddCorrectAnswer(10)
		assert.Equal(t, 10, participant.Score)
		assert.Equal(t, 1, participant.CorrectAnswers)

		// 追加の正解
		participant.AddCorrectAnswer(20)
		assert.Equal(t, 30, participant.Score)
		assert.Equal(t, 2, participant.CorrectAnswers)

		// さらに正解を重ねる
		participant.AddCorrectAnswer(30)
		assert.Equal(t, 60, participant.Score)
		assert.Equal(t, 3, participant.CorrectAnswers)
	})

	t.Run("参加者状態の判定が正常に動作すること", func(t *testing.T) {
		participant := NewParticipant("user123", "session456", "テストユーザー")

		// Active状態の確認
		assert.True(t, participant.IsActive())
		assert.False(t, participant.IsEliminated())

		// Eliminated状態の確認
		participant.Eliminate()
		assert.False(t, participant.IsActive())
		assert.True(t, participant.IsEliminated())

		// Revived状態の確認（ActiveとしてもEliminatedとしても扱われない）
		participant.Revive()
		assert.True(t, participant.IsActive())
		assert.False(t, participant.IsEliminated())
	})

	t.Run("複数回の状態変更が正常に動作すること", func(t *testing.T) {
		participant := NewParticipant("user123", "session456", "テストユーザー")

		// 最初の脱落
		participant.Eliminate()
		firstEliminatedAt := participant.EliminatedAt

		// 復活
		participant.Revive()
		firstRevivedAt := participant.RevivedAt

		// 再度脱落
		time.Sleep(1 * time.Millisecond) // 時間差を作るため
		participant.Eliminate()
		secondEliminatedAt := participant.EliminatedAt

		// 脱落時間が更新されていることを確認
		assert.True(t, secondEliminatedAt.After(*firstEliminatedAt))
		// 復活時間は保持されていることを確認
		assert.Equal(t, firstRevivedAt, participant.RevivedAt)

		// 最終状態の確認
		assert.Equal(t, ParticipantStatusEliminated, participant.Status)
		assert.False(t, participant.IsActive())
		assert.True(t, participant.IsEliminated())
	})
}