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
  async login(name: string, accessCode: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseURL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, accessCode } as LoginRequest),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || 'ログインに失敗しました');
    }

    return response.json();
  }

  // 現在のユーザー情報を取得
  async getMe(): Promise<GetMeResponse> {
    const response = await fetch(`${this.baseURL}/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || 'ユーザー情報の取得に失敗しました');
    }

    return response.json();
  }

  // ログアウト（セッションクリア）
  async logout(): Promise<void> {
    // フロントエンドでローカルストレージをクリア
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessCode');
      sessionStorage.removeItem('accessCode');
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
}

// シングルトンインスタンス
export const authService = new AuthService();
export default authService;
