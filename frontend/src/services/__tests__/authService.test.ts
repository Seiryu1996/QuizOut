import { authService } from '../authService';

// Mock fetch globally
global.fetch = jest.fn();

// Mock window and storage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

describe('AuthService', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    sessionStorageMock.getItem.mockClear();
    sessionStorageMock.setItem.mockClear();
    sessionStorageMock.removeItem.mockClear();
  });

  describe('verifyAccessCode', () => {
    test('アクセスコード検証成功', async () => {
      const mockResponse = { valid: true, message: 'アクセスコードが有効です' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authService.verifyAccessCode('test-code');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/verify-access-code'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accessCode: 'test-code' }),
          credentials: 'include',
        }
      );

      expect(result).toEqual(mockResponse);
    });

    test('アクセスコード検証失敗時のエラーハンドリング', async () => {
      const errorMessage = 'アクセスコードが無効です';
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: errorMessage }),
      } as Response);

      await expect(authService.verifyAccessCode('invalid-code'))
        .rejects
        .toThrow(errorMessage);
    });

    test('ネットワークエラー時のデフォルトエラーメッセージ', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => { throw new Error('Parse error'); },
      } as Response);

      await expect(authService.verifyAccessCode('test-code'))
        .rejects
        .toThrow('Network error');
    });
  });

  describe('login', () => {
    test('ログイン成功', async () => {
      const mockUser = { id: '1', username: 'testuser', email: 'test@example.com' };
      const mockResponse = { user: mockUser, token: 'test-token' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authService.login('testuser', 'password');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/login'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: 'testuser', password: 'password' }),
          credentials: 'include',
        }
      );

      expect(result).toEqual(mockResponse);
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
    });

    test('ログイン失敗時のエラーハンドリング', async () => {
      const errorMessage = 'ユーザー名またはパスワードが間違っています';
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: errorMessage }),
      } as Response);

      await expect(authService.login('testuser', 'wrongpassword'))
        .rejects
        .toThrow(errorMessage);
    });

    test('ユーザー情報がない場合はストレージに保存されないこと', async () => {
      const mockResponse = { token: 'test-token' }; // userプロパティなし
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await authService.login('testuser', 'password');

      expect(sessionStorageMock.setItem).not.toHaveBeenCalledWith('user', expect.anything());
    });
  });

  describe('getMe', () => {
    test('ローカルストレージからユーザー情報を取得', async () => {
      const mockUser = { id: '1', username: 'testuser' };
      sessionStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));

      const result = await authService.getMe();

      expect(result).toEqual({ user: mockUser });
      expect(sessionStorageMock.getItem).toHaveBeenCalledWith('user');
    });

    test('ユーザー情報がない場合はエラーをスロー', async () => {
      sessionStorageMock.getItem.mockReturnValue(null);

      await expect(authService.getMe())
        .rejects
        .toThrow('ユーザー情報が見つかりません。再ログインが必要です。');
    });
  });

  describe('logout', () => {
    test('ローカルストレージからデータをクリア', async () => {
      await authService.logout();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessCode');
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('accessCode');
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('user');
    });
  });

  describe('saveAccessCodeToStorage', () => {
    test('アクセスコードをセッションストレージに保存', () => {
      authService.saveAccessCodeToStorage('test-code');

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('accessCode', 'test-code');
    });
  });

  describe('getAccessCodeFromStorage', () => {
    test('セッションストレージからアクセスコードを取得', () => {
      sessionStorageMock.getItem.mockReturnValue('stored-code');

      const result = authService.getAccessCodeFromStorage();

      expect(result).toBe('stored-code');
      expect(sessionStorageMock.getItem).toHaveBeenCalledWith('accessCode');
    });

    test('アクセスコードがない場合はnullを返す', () => {
      sessionStorageMock.getItem.mockReturnValue(null);

      const result = authService.getAccessCodeFromStorage();

      expect(result).toBeNull();
    });
  });

  describe('saveUserToStorage', () => {
    test('ユーザー情報をセッションストレージに保存', () => {
      const mockUser = { id: '1', username: 'testuser' };

      authService.saveUserToStorage(mockUser);

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
    });
  });

  describe('getUserFromStorage', () => {
    test('セッションストレージからユーザー情報を取得', () => {
      const mockUser = { id: '1', username: 'testuser' };
      sessionStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));

      const result = authService.getUserFromStorage();

      expect(result).toEqual(mockUser);
      expect(sessionStorageMock.getItem).toHaveBeenCalledWith('user');
    });

    test('ユーザー情報がない場合はnullを返す', () => {
      sessionStorageMock.getItem.mockReturnValue(null);

      const result = authService.getUserFromStorage();

      expect(result).toBeNull();
    });

    test('不正なJSONの場合はパースエラーを処理', () => {
      sessionStorageMock.getItem.mockReturnValue('invalid-json');

      expect(() => authService.getUserFromStorage()).toThrow();
    });
  });

  describe('isAuthenticated', () => {
    test('アクセスコードとユーザー情報が両方ある場合はtrue', () => {
      sessionStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'accessCode') return 'test-code';
        if (key === 'user') return JSON.stringify({ id: '1' });
        return null;
      });

      const result = authService.isAuthenticated();

      expect(result).toBe(true);
    });

    test('アクセスコードがない場合はfalse', () => {
      sessionStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'accessCode') return null;
        if (key === 'user') return JSON.stringify({ id: '1' });
        return null;
      });

      const result = authService.isAuthenticated();

      expect(result).toBe(false);
    });

    test('ユーザー情報がない場合はfalse', () => {
      sessionStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'accessCode') return 'test-code';
        if (key === 'user') return null;
        return null;
      });

      const result = authService.isAuthenticated();

      expect(result).toBe(false);
    });

    test('両方ない場合はfalse', () => {
      sessionStorageMock.getItem.mockReturnValue(null);

      const result = authService.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('Server-side rendering対応', () => {
    test('windowが未定義の場合の処理', () => {
      // windowを一時的に未定義にする
      const originalWindow = global.window;
      delete (global as any).window;

      const result = authService.getAccessCodeFromStorage();
      expect(result).toBeNull();

      authService.saveAccessCodeToStorage('test');
      // エラーが発生しないことを確認

      // windowを復元
      (global as any).window = originalWindow;
    });
  });
});