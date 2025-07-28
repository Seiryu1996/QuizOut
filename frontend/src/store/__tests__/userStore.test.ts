import { renderHook, act } from '@testing-library/react';
import { useUserStore } from '../userStore';

// Mock zustand persist
jest.mock('zustand/middleware', () => ({
  persist: (fn: any, options: any) => fn,
}));

describe('useUserStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useUserStore.getState().logout();
    });
  });

  test('初期状態が正しく設定されていること', () => {
    const { result } = renderHook(() => useUserStore());

    expect(result.current.user).toBeNull();
    expect(result.current.displayName).toBe('');
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAnonymous).toBe(true);
    expect(result.current.authToken).toBeNull();
  });

  test('setUserが正しく動作すること', () => {
    const { result } = renderHook(() => useUserStore());
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
      isAdmin: false,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    };

    act(() => {
      result.current.setUser(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
  });

  test('setUserでnullを設定できること', () => {
    const { result } = renderHook(() => useUserStore());
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
      isAdmin: false,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    };

    act(() => {
      result.current.setUser(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);

    act(() => {
      result.current.setUser(null);
    });

    expect(result.current.user).toBeNull();
  });

  test('setDisplayNameが正しく動作すること', () => {
    const { result } = renderHook(() => useUserStore());

    act(() => {
      result.current.setDisplayName('テストユーザー');
    });

    expect(result.current.displayName).toBe('テストユーザー');
  });

  test('setAuthTokenが正しく動作すること', () => {
    const { result } = renderHook(() => useUserStore());

    act(() => {
      result.current.setAuthToken('test-token-123');
    });

    expect(result.current.authToken).toBe('test-token-123');
    expect(result.current.isAuthenticated).toBe(true);
  });

  test('setAuthTokenでnullを設定すると認証状態がfalseになること', () => {
    const { result } = renderHook(() => useUserStore());

    // 最初にトークンを設定
    act(() => {
      result.current.setAuthToken('test-token');
    });

    expect(result.current.isAuthenticated).toBe(true);

    // nullを設定
    act(() => {
      result.current.setAuthToken(null);
    });

    expect(result.current.authToken).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  test('setAuthTokenで空文字を設定すると認証状態がfalseになること', () => {
    const { result } = renderHook(() => useUserStore());

    act(() => {
      result.current.setAuthToken('');
    });

    expect(result.current.authToken).toBe('');
    expect(result.current.isAuthenticated).toBe(false);
  });

  test('setIsAuthenticatedが正しく動作すること', () => {
    const { result } = renderHook(() => useUserStore());

    act(() => {
      result.current.setIsAuthenticated(true);
    });

    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.setIsAuthenticated(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  test('setIsAnonymousが正しく動作すること', () => {
    const { result } = renderHook(() => useUserStore());

    act(() => {
      result.current.setIsAnonymous(false);
    });

    expect(result.current.isAnonymous).toBe(false);

    act(() => {
      result.current.setIsAnonymous(true);
    });

    expect(result.current.isAnonymous).toBe(true);
  });

  test('logoutが正しく動作すること', () => {
    const { result } = renderHook(() => useUserStore());
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
      isAdmin: false,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    };

    // まず各種状態を設定
    act(() => {
      result.current.setUser(mockUser);
      result.current.setDisplayName('テストユーザー');
      result.current.setAuthToken('test-token');
      result.current.setIsAuthenticated(true);
    });

    // ログアウト前の状態確認
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.displayName).toBe('テストユーザー');
    expect(result.current.authToken).toBe('test-token');
    expect(result.current.isAuthenticated).toBe(true);

    // ログアウト実行
    act(() => {
      result.current.logout();
    });

    // ログアウト後の状態確認
    expect(result.current.user).toBeNull();
    expect(result.current.displayName).toBe('');
    expect(result.current.authToken).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  test('複数の状態を順次変更できること', () => {
    const { result } = renderHook(() => useUserStore());

    act(() => {
      result.current.setDisplayName('ユーザー1');
      result.current.setAuthToken('token1');
      result.current.setIsAnonymous(false);
    });

    expect(result.current.displayName).toBe('ユーザー1');
    expect(result.current.authToken).toBe('token1');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isAnonymous).toBe(false);

    act(() => {
      result.current.setDisplayName('ユーザー2');
      result.current.setAuthToken('token2');
    });

    expect(result.current.displayName).toBe('ユーザー2');
    expect(result.current.authToken).toBe('token2');
    expect(result.current.isAuthenticated).toBe(true);
  });

  test('storeの状態が独立して管理されること', () => {
    const { result: result1 } = renderHook(() => useUserStore());
    const { result: result2 } = renderHook(() => useUserStore());

    act(() => {
      result1.current.setDisplayName('ユーザー1');
    });

    // 両方のhookが同じstoreを参照するため、同じ値が返される
    expect(result1.current.displayName).toBe('ユーザー1');
    expect(result2.current.displayName).toBe('ユーザー1');

    act(() => {
      result2.current.setDisplayName('ユーザー2');
    });

    // 状態が更新される
    expect(result1.current.displayName).toBe('ユーザー2');
    expect(result2.current.displayName).toBe('ユーザー2');
  });

  test('authTokenとisAuthenticatedの連動が正しく動作すること', () => {
    const { result } = renderHook(() => useUserStore());

    // トークンを設定すると認証状態もtrueになる
    act(() => {
      result.current.setAuthToken('valid-token');
    });

    expect(result.current.authToken).toBe('valid-token');
    expect(result.current.isAuthenticated).toBe(true);

    // 認証状態を直接falseに設定してもトークンは残る
    act(() => {
      result.current.setIsAuthenticated(false);
    });

    expect(result.current.authToken).toBe('valid-token');
    expect(result.current.isAuthenticated).toBe(false);

    // 再度トークンを設定すると認証状態がtrueになる
    act(() => {
      result.current.setAuthToken('another-token');
    });

    expect(result.current.authToken).toBe('another-token');
    expect(result.current.isAuthenticated).toBe(true);
  });
});