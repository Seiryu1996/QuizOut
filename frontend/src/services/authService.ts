import {
  VerifyAccessCodeRequest,
  VerifyAccessCodeResponse,
  LoginRequest,
  LoginResponse,
  GetMeResponse,
} from '@/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// アクセスコード認証サービス
class AuthService {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/api/v1/auth`;
  }

  // アクセスコードの検証
  async verifyAccessCode(accessCode: string): Promise<VerifyAccessCodeResponse> {
    const response = await fetch(`${this.baseURL}/verify-access-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accessCode } as VerifyAccessCodeRequest),
      credentials: 'include', // セッションクッキーを含める
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || 'アクセスコードの検証に失敗しました');
    }

    return response.json();
  }

  // ユーザーログイン（アクセスコード検証後）
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseURL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password } as LoginRequest),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || 'ログインに失敗しました');
    }

    const result = await response.json();
    
    // ログイン成功時にユーザー情報をローカルストレージに保存
    if (result.user) {
      this.saveUserToStorage(result.user);
    }

    return result;
  }

  // 現在のユーザー情報を取得（ローカルストレージから）
  async getMe(): Promise<GetMeResponse> {
    // ローカルストレージからユーザー情報を取得
    const user = this.getUserFromStorage();
    if (user) {
      return { user };
    }

    // ローカルストレージにユーザー情報がない場合はエラー
    throw new Error('ユーザー情報が見つかりません。再ログインが必要です。');
  }

  // ログアウト（セッションクリア）
  async logout(): Promise<void> {
    // フロントエンドでローカルストレージをクリア
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessCode');
      sessionStorage.removeItem('accessCode');
      sessionStorage.removeItem('user');
    }
  }

  // アクセスコードをローカルストレージに保存
  saveAccessCodeToStorage(accessCode: string): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('accessCode', accessCode);
    }
  }

  // ローカルストレージからアクセスコードを取得
  getAccessCodeFromStorage(): string | null {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('accessCode');
    }
    return null;
  }

  // ユーザー情報をローカルストレージに保存
  saveUserToStorage(user: any): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('user', JSON.stringify(user));
    }
  }

  // ローカルストレージからユーザー情報を取得
  getUserFromStorage(): any | null {
    if (typeof window !== 'undefined') {
      const userStr = sessionStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  }

  // 認証状態をチェック
  isAuthenticated(): boolean {
    return this.getAccessCodeFromStorage() !== null && this.getUserFromStorage() !== null;
  }
}

// シングルトンインスタンス
export const authService = new AuthService();
export default authService;
