package domain

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestUser(t *testing.T) {
	t.Run("Firebase認証用ユーザーが正常に作成できること", func(t *testing.T) {
		// Firebase認証用ユーザー作成
		user := NewUserWithEmail("テストユーザー", "test@example.com", false)

		// 必須フィールドが設定されていること
		assert.NotEmpty(t, user.ID)
		assert.Equal(t, "テストユーザー", user.DisplayName)
		assert.Equal(t, "test@example.com", user.Email)
		assert.False(t, user.IsAnonymous)

		// Firebase認証の場合はUsernameは空
		assert.Empty(t, user.Username)
		assert.Empty(t, user.AccessCode)

		// 日時フィールドが設定されていること
		assert.False(t, user.CreatedAt.IsZero())
		assert.False(t, user.LastLoginAt.IsZero())
	})

	t.Run("匿名ユーザーが正常に作成できること", func(t *testing.T) {
		// 匿名ユーザー作成
		user := NewUserWithEmail("匿名ユーザー", "", true)

		// 必須フィールドが設定されていること
		assert.NotEmpty(t, user.ID)
		assert.Equal(t, "匿名ユーザー", user.DisplayName)
		assert.True(t, user.IsAnonymous)

		// 匿名ユーザーの場合はEmailは空でも可
		assert.Empty(t, user.Email)
		assert.Empty(t, user.Username)
		assert.Empty(t, user.AccessCode)
	})

	t.Run("ユーザー名・パスワード認証用ユーザーが正常に作成できること", func(t *testing.T) {
		// ユーザー名・パスワード認証用ユーザー作成
		user, err := NewUserWithUsername("testuser", "テストユーザー")

		assert.NoError(t, err)
		assert.NotNil(t, user)

		// 必須フィールドが設定されていること
		assert.NotEmpty(t, user.ID)
		assert.Equal(t, "testuser", user.Username)
		assert.Equal(t, "テストユーザー", user.DisplayName)
		assert.False(t, user.IsAnonymous)

		// ユーザー名認証の場合はEmailは空
		assert.Empty(t, user.Email)
		assert.Empty(t, user.AccessCode)

		// 日時フィールドが設定されていること
		assert.False(t, user.CreatedAt.IsZero())
		assert.True(t, user.LastLoginAt.IsZero()) // ログインするまで空
	})

	t.Run("ユーザー名が空の場合にエラーになること", func(t *testing.T) {
		// 空のユーザー名でユーザー作成
		user, err := NewUserWithUsername("", "テストユーザー")

		assert.Error(t, err)
		assert.Nil(t, user)
		assert.Equal(t, "username cannot be empty", err.Error())
	})

	t.Run("表示名が空の場合にエラーになること", func(t *testing.T) {
		// 空の表示名でユーザー作成
		user, err := NewUserWithUsername("testuser", "")

		assert.Error(t, err)
		assert.Nil(t, user)
		assert.Equal(t, "display name cannot be empty", err.Error())
	})

	t.Run("アクセスコード認証用ユーザーが正常に作成できること", func(t *testing.T) {
		// アクセスコード認証用ユーザー作成
		user, err := NewUser("テストユーザー", "ACCESS_CODE_2024")

		assert.NoError(t, err)
		assert.NotNil(t, user)

		// 必須フィールドが設定されていること
		assert.NotEmpty(t, user.ID)
		assert.Equal(t, "テストユーザー", user.DisplayName)
		assert.Equal(t, "ACCESS_CODE_2024", user.AccessCode)
		assert.True(t, user.IsAnonymous) // アクセスコード認証は匿名として扱う

		// アクセスコード認証の場合はEmail、Usernameは空
		assert.Empty(t, user.Email)
		assert.Empty(t, user.Username)

		// 日時フィールドが設定されていること
		assert.False(t, user.CreatedAt.IsZero())
		assert.False(t, user.LastLoginAt.IsZero()) // アクセスコード認証は即座にログイン扱い
	})

	t.Run("アクセスコード認証で表示名が空の場合にエラーになること", func(t *testing.T) {
		// 空の表示名でユーザー作成
		user, err := NewUser("", "ACCESS_CODE_2024")

		assert.Error(t, err)
		assert.Nil(t, user)
		assert.Equal(t, "display name cannot be empty", err.Error())
	})

	t.Run("アクセスコード認証でアクセスコードが空の場合にエラーになること", func(t *testing.T) {
		// 空のアクセスコードでユーザー作成
		user, err := NewUser("テストユーザー", "")

		assert.Error(t, err)
		assert.Nil(t, user)
		assert.Equal(t, "access code cannot be empty", err.Error())
	})

	t.Run("異なる認証方式で作成されたユーザーのIDがユニークであること", func(t *testing.T) {
		// 各認証方式でユーザー作成
		firebaseUser := NewUserWithEmail("Firebase User", "firebase@example.com", false)
		usernameUser, _ := NewUserWithUsername("username_user", "Username User")
		accessCodeUser, _ := NewUser("Access Code User", "ACCESS_CODE")

		// IDがそれぞれ異なることを確認
		assert.NotEqual(t, firebaseUser.ID, usernameUser.ID)
		assert.NotEqual(t, firebaseUser.ID, accessCodeUser.ID)
		assert.NotEqual(t, usernameUser.ID, accessCodeUser.ID)

		// IDが空でないことを確認
		assert.NotEmpty(t, firebaseUser.ID)
		assert.NotEmpty(t, usernameUser.ID)
		assert.NotEmpty(t, accessCodeUser.ID)
	})
}