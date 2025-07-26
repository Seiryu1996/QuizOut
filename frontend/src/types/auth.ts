// 認証関連の型定義

// アクセスコード認証状態
export interface AccessCodeState {
  isAccessCodeVerified: boolean;
  isLoggedIn: boolean;
  user: User | null;
  accessCode: string | null;
}

// ユーザー情報
export interface User {
  id: string;
  displayName: string;
  email?: string;
  isAnonymous: boolean;
  accessCode: string;
  createdAt: string;
  lastLoginAt: string;
}

// アクセスコード検証リクエスト
export interface VerifyAccessCodeRequest {
  accessCode: string;
}

// アクセスコード検証レスポンス
export interface VerifyAccessCodeResponse {
  isValid: boolean;
  message: string;
}

// ログインリクエスト
export interface LoginRequest {
  name: string;
  accessCode: string;
}

// ログインレスポンス
export interface LoginResponse {
  user: User;
  message: string;
}

// ユーザー情報取得レスポンス
export interface GetMeResponse {
  user: User;
}

// 認証エラー
export interface AuthError {
  code: string;
  message: string;
  details?: any;
}
