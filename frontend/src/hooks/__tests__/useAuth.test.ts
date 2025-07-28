import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { auth } from '@/lib/firebase';
import { useUserStore } from '@/store/userStore';

// Firebase auth をモック化
jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
    signOut: jest.fn(),
    signInAnonymously: jest.fn(),
  }
}));

// Firebase auth functions をモック化
const mockOnAuthStateChanged = jest.fn();
const mockSignInAnonymously = jest.fn();
const mockSignOut = jest.fn();

jest.mock('firebase/auth', () => ({
  signInAnonymously: mockSignInAnonymously,
  onAuthStateChanged: mockOnAuthStateChanged,
  signOut: mockSignOut,
}));

// Zustore をモック化
jest.mock('@/store/userStore', () => ({
  useUserStore: jest.fn(),
}));

const mockAuth = auth as jest.Mocked<typeof auth>;
const mockUseUserStore = useUserStore as jest.MockedFunction<typeof useUserStore>;

describe('useAuth Hook', () => {
  const mockSetUser = jest.fn();
  const mockSetAuthToken = jest.fn();
  const mockSetIsAuthenticated = jest.fn();
  const mockSetIsAnonymous = jest.fn();
  const mockLogout = jest.fn();

  const mockUserStore = {
    user: null,
    setUser: mockSetUser,
    setAuthToken: mockSetAuthToken,
    setIsAuthenticated: mockSetIsAuthenticated,
    setIsAnonymous: mockSetIsAnonymous,
    logout: mockLogout,
    isAuthenticated: false,
    isAnonymous: false,
    authToken: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトのモック設定
    mockUseUserStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(mockUserStore);
      }
      return mockUserStore;
    });
    
    // onAuthStateChangedのモック設定
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      // 即座にnullユーザーでコールバック実行
      setTimeout(() => callback(null), 0);
      // unsubscribe関数を返す
      return jest.fn();
    });
  });

  test('初期状態が正しいこと', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAnonymous).toBe(false);
    expect(result.current.authToken).toBe(null);
    expect(typeof result.current.signInAnonymous).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
    expect(typeof result.current.refreshToken).toBe('function');
  });

  test('匿名ログインが正常に動作すること', async () => {
    const mockFirebaseUser = {
      uid: 'test-uid',
      displayName: null,
      email: null,
      isAnonymous: true,
      metadata: {
        creationTime: '2024-01-01T00:00:00Z',
        lastSignInTime: '2024-01-01T00:00:00Z',
      },
      getIdToken: jest.fn().mockResolvedValue('test-token'),
    };

    const { signInAnonymously } = require('firebase/auth');
    signInAnonymously.mockResolvedValue({ user: mockFirebaseUser });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const success = await result.current.signInAnonymous();
      expect(success).toBe(true);
    });

    expect(signInAnonymously).toHaveBeenCalledWith(auth);
  });

  test('匿名ログインが失敗した場合の処理が正しいこと', async () => {
    const { signInAnonymously } = require('firebase/auth');
    signInAnonymously.mockRejectedValue(new Error('Login failed'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const success = await result.current.signInAnonymous();
      expect(success).toBe(false);
    });
  });

  test('ログアウトが正常に動作すること', async () => {
    const { signOut } = require('firebase/auth');
    signOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(signOut).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
  });

  test('トークンリフレッシュが正常に動作すること', async () => {
    const mockFirebaseUser = {
      getIdToken: jest.fn().mockResolvedValue('new-token'),
    };

    mockAuth.currentUser = mockFirebaseUser as any;

    const { result } = renderHook(() => useAuth());

    let refreshedToken: string | null = null;
    await act(async () => {
      refreshedToken = await result.current.refreshToken();
    });

    expect(refreshedToken).toBe('new-token');
    expect(mockSetAuthToken).toHaveBeenCalledWith('new-token');
    expect(mockFirebaseUser.getIdToken).toHaveBeenCalledWith(true);
  });

  test('認証状態の変化が正しく処理されること', async () => {
    const { onAuthStateChanged } = require('firebase/auth');
    let authStateCallback: (user: any) => void;

    onAuthStateChanged.mockImplementation((auth, callback) => {
      authStateCallback = callback;
      return jest.fn(); // unsubscribe function
    });

    renderHook(() => useAuth());

    const mockFirebaseUser = {
      uid: 'test-uid',
      displayName: 'Test User',
      email: 'test@example.com',
      isAnonymous: false,
      metadata: {
        creationTime: '2024-01-01T00:00:00Z',
        lastSignInTime: '2024-01-01T00:00:00Z',
      },
      getIdToken: jest.fn().mockResolvedValue('test-token'),
    };

    await act(async () => {
      authStateCallback(mockFirebaseUser);
    });

    expect(mockSetUser).toHaveBeenCalledWith({
      id: 'test-uid',
      displayName: 'Test User',
      email: 'test@example.com',
      isAnonymous: false,
      createdAt: '2024-01-01T00:00:00Z',
      lastLoginAt: '2024-01-01T00:00:00Z',
    });
    expect(mockSetAuthToken).toHaveBeenCalledWith('test-token');
    expect(mockSetIsAuthenticated).toHaveBeenCalledWith(true);
    expect(mockSetIsAnonymous).toHaveBeenCalledWith(false);
  });

  test('ログアウト状態の変化が正しく処理されること', async () => {
    const { onAuthStateChanged } = require('firebase/auth');
    let authStateCallback: (user: any) => void;

    onAuthStateChanged.mockImplementation((auth, callback) => {
      authStateCallback = callback;
      return jest.fn();
    });

    renderHook(() => useAuth());

    await act(async () => {
      authStateCallback(null);
    });

    expect(mockSetUser).toHaveBeenCalledWith(null);
    expect(mockSetAuthToken).toHaveBeenCalledWith(null);
    expect(mockSetIsAuthenticated).toHaveBeenCalledWith(false);
  });

  test('認証エラー時の処理が正しいこと', async () => {
    const { onAuthStateChanged } = require('firebase/auth');
    let authStateCallback: (user: any) => void;

    onAuthStateChanged.mockImplementation((auth, callback) => {
      authStateCallback = callback;
      return jest.fn();
    });

    const mockFirebaseUser = {
      uid: 'test-uid',
      displayName: 'Test User',
      email: 'test@example.com',
      isAnonymous: false,
      metadata: {
        creationTime: '2024-01-01T00:00:00Z',
        lastSignInTime: '2024-01-01T00:00:00Z',
      },
      getIdToken: jest.fn().mockRejectedValue(new Error('Token error')),
    };

    renderHook(() => useAuth());

    await act(async () => {
      authStateCallback(mockFirebaseUser);
    });

    expect(mockLogout).toHaveBeenCalled();
  });

  test('トークンリフレッシュがユーザーなしで失敗すること', async () => {
    mockAuth.currentUser = null;

    const { result } = renderHook(() => useAuth());

    let refreshedToken: string | null = null;
    await act(async () => {
      refreshedToken = await result.current.refreshToken();
    });

    expect(refreshedToken).toBe(null);
  });

  test('トークンリフレッシュエラー時の処理が正しいこと', async () => {
    const mockFirebaseUser = {
      getIdToken: jest.fn().mockRejectedValue(new Error('Token refresh failed')),
    };

    mockAuth.currentUser = mockFirebaseUser as any;

    const { result } = renderHook(() => useAuth());

    let refreshedToken: string | null = null;
    await act(async () => {
      refreshedToken = await result.current.refreshToken();
    });

    expect(refreshedToken).toBe(null);
  });

  test('匿名ユーザーのデフォルト表示名が設定されること', async () => {
    const { onAuthStateChanged } = require('firebase/auth');
    let authStateCallback: (user: any) => void;

    onAuthStateChanged.mockImplementation((auth, callback) => {
      authStateCallback = callback;
      return jest.fn();
    });

    renderHook(() => useAuth());

    const mockAnonymousUser = {
      uid: 'anonymous-uid',
      displayName: null,
      email: null,
      isAnonymous: true,
      metadata: {
        creationTime: '2024-01-01T00:00:00Z',
        lastSignInTime: '2024-01-01T00:00:00Z',
      },
      getIdToken: jest.fn().mockResolvedValue('anonymous-token'),
    };

    await act(async () => {
      authStateCallback(mockAnonymousUser);
    });

    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: '匿名ユーザー',
        email: '',
      })
    );
  });

  test('コンポーネントアンマウント時にリスナーが解除されること', () => {
    const { onAuthStateChanged } = require('firebase/auth');
    const mockUnsubscribe = jest.fn();

    onAuthStateChanged.mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() => useAuth());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});