import { renderHook, waitFor } from '@testing-library/react';
import { useAdminAuth } from '../useAdminAuth';
import { useAuth } from '../useAuth';
import { authService } from '@/services/authService';

// Mocks
jest.mock('../useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/services/authService', () => ({
  authService: {
    getMe: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('useAdminAuth Hook', () => {
  const mockAdminUser = {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    isAdmin: true,
  };

  const mockRegularUser = {
    id: '2',
    username: 'user',
    email: 'user@example.com',
    isAdmin: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('認証されていない場合の初期状態', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
    });

    const { result } = renderHook(() => useAdminAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('管理者ユーザーでのログイン成功', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    mockAuthService.getMe.mockResolvedValue({ user: mockAdminUser });

    const { result } = renderHook(() => useAdminAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockAdminUser);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
  });

  test('一般ユーザーでのログイン成功', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    mockAuthService.getMe.mockResolvedValue({ user: mockRegularUser });

    const { result } = renderHook(() => useAdminAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockRegularUser);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
  });

  test('ユーザー情報取得エラーの処理', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    const errorMessage = 'Network error';
    mockAuthService.getMe.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useAdminAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBe('ユーザー情報の取得に失敗しました');
  });

  test('認証ローディング中は全体のローディングがtrueになること', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true,
    });

    const { result } = renderHook(() => useAdminAuth());

    expect(result.current.loading).toBe(true);
    expect(mockAuthService.getMe).not.toHaveBeenCalled();
  });

  test('認証状態が変更された時に再チェックされること', async () => {
    // 最初は未認証
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
    });

    const { result, rerender } = renderHook(() => useAdminAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
    expect(mockAuthService.getMe).not.toHaveBeenCalled();

    // 認証状態に変更
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    mockAuthService.getMe.mockResolvedValue({ user: mockAdminUser });

    rerender();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(mockAuthService.getMe).toHaveBeenCalledTimes(1);
  });

  test('isAdminプロパティがundefinedの場合はfalseになること', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    const userWithoutIsAdmin = {
      id: '3',
      username: 'user',
      email: 'user@example.com',
      // isAdmin プロパティなし
    };

    mockAuthService.getMe.mockResolvedValue({ user: userWithoutIsAdmin });

    const { result } = renderHook(() => useAdminAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(userWithoutIsAdmin);
    expect(result.current.isAdmin).toBe(false);
  });

  test('認証ローディングから認証済みに変わった時の処理', async () => {
    // 最初は認証ローディング中
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true,
    });

    const { result, rerender } = renderHook(() => useAdminAuth());

    expect(result.current.loading).toBe(true);

    // 認証完了
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    mockAuthService.getMe.mockResolvedValue({ user: mockAdminUser });

    rerender();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(mockAuthService.getMe).toHaveBeenCalledTimes(1);
  });

  test('エラー後の再試行でエラーがクリアされること', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    // 最初はエラー
    mockAuthService.getMe.mockRejectedValueOnce(new Error('Network error'));

    const { result, rerender } = renderHook(() => useAdminAuth());

    await waitFor(() => {
      expect(result.current.error).toBe('ユーザー情報の取得に失敗しました');
    });

    // 再試行で成功
    mockAuthService.getMe.mockResolvedValue({ user: mockAdminUser });

    // useAuthの値を変更して再レンダリングをトリガー
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    rerender();

    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.isAdmin).toBe(true);
    });
  });

  test('コンソールエラーが出力されること', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    const error = new Error('Test error');
    mockAuthService.getMe.mockRejectedValue(error);

    renderHook(() => useAdminAuth());

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get user info:', error);
    });

    consoleSpy.mockRestore();
  });
});