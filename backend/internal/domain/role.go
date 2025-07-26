package domain

// UserRole ユーザーロール
type UserRole string

const (
	// RoleAdmin 管理者
	RoleAdmin UserRole = "admin"
	// RoleManager イベント管理者
	RoleManager UserRole = "manager"
	// RoleUser 一般ユーザー
	RoleUser UserRole = "user"
)

// AdminUsernames 管理者ユーザー名のリスト
var AdminUsernames = map[string]UserRole{
	"admin":   RoleAdmin,
	"manager": RoleManager,
}

// IsAdmin ユーザーが管理者かどうかを判定
func (u *User) IsAdmin() bool {
	role, exists := AdminUsernames[u.Username]
	return exists && (role == RoleAdmin || role == RoleManager)
}

// GetRole ユーザーのロールを取得
func (u *User) GetRole() UserRole {
	if role, exists := AdminUsernames[u.Username]; exists {
		return role
	}
	return RoleUser
}

// HasAdminAccess 管理者アクセス権限があるかチェック
func (u *User) HasAdminAccess() bool {
	return u.IsAdmin()
}

// HasManagerAccess マネージャーアクセス権限があるかチェック
func (u *User) HasManagerAccess() bool {
	role := u.GetRole()
	return role == RoleAdmin || role == RoleManager
}