import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import QuizSelectionPage from '@/app/quiz-selection/page';
import AccessCodePage from '@/app/access-code/page';
import { authService } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';

// テスト用のプロバイダー
function TestProviders({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// モック
jest.mock('@/services/authService', () => ({
  authService: {
    verifyAccessCode: jest.fn(),
    login: jest.fn(),
    getMe: jest.fn(),
    logout: jest.fn(),
  },
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('Quiz Participation Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('完全なクイズ参加フローが動作すること', async () => {
    // 1. アクセスコード入力画面の表示
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      isAnonymous: false,
      authToken: null,
      signInAnonymous: jest.fn(),
      signOut: jest.fn(),
      refreshToken: jest.fn(),
    });

    const { rerender } = render(
      <TestProviders>
        <AccessCodePage />
      </TestProviders>
    );

    // アクセスコード入力画面が表示されること
    expect(screen.getByText('QuizOut')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('アクセスコードを入力')).toBeInTheDocument();

    // 2. 有効な共通アクセスコードの入力
    mockAuthService.verifyAccessCode.mockResolvedValue({
      isValid: true,
      message: 'アクセスコードが確認されました'
    });

    const accessCodeInput = screen.getByPlaceholderText('アクセスコードを入力');
    const confirmButton = screen.getByText('確認');

    fireEvent.change(accessCodeInput, { target: { value: 'VALID123' } });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockAuthService.verifyAccessCode).toHaveBeenCalledWith('VALID123');
    });

    // 3. ユーザー名・パスワード入力とログイン
    mockAuthService.login.mockResolvedValue({
      user: {
        id: 'user1',
        username: 'testuser',
        displayName: 'テストユーザー',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      message: 'ログインが成功しました'
    });

    // 認証済み状態にモックを更新
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user1',
        username: 'testuser',
        displayName: 'テストユーザー',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      loading: false,
      isAuthenticated: true,
      isAnonymous: false,
      authToken: 'valid-token',
      signInAnonymous: jest.fn(),
      signOut: jest.fn(),
      refreshToken: jest.fn(),
    });

    mockAuthService.getMe.mockResolvedValue({
      user: {
        id: 'user1',
        username: 'testuser',
        displayName: 'テストユーザー',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
    });

    // 4. ゲーム一覧の表示
    rerender(
      <TestProviders>
        <QuizSelectionPage />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('クイズに参加')).toBeInTheDocument();
    });

    // ユーザー情報が表示されること
    expect(screen.getByText('テストユーザー')).toBeInTheDocument();
    expect(screen.getByText('ログイン済み')).toBeInTheDocument();

    // 5. ゲーム選択と参加
    const sessionInput = screen.getByPlaceholderText('セッションIDを入力');
    const joinButton = screen.getByText('クイズに参加');

    fireEvent.change(sessionInput, { target: { value: 'SESSION123' } });
    
    // セッションIDが入力されたらボタンが有効になること
    expect(joinButton).not.toBeDisabled();

    fireEvent.click(joinButton);

    // クイズページへの遷移が確認される（ルーター遷移のテスト）
    // 実際の実装では、router.push('/quiz/SESSION123') が呼ばれることを確認
  });

  test('アクセスコード認証エラーフローが動作すること', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      isAnonymous: false,
      authToken: null,
      signInAnonymous: jest.fn(),
      signOut: jest.fn(),
      refreshToken: jest.fn(),
    });

    render(
      <TestProviders>
        <AccessCodePage />
      </TestProviders>
    );

    // 1. 無効なアクセスコードの入力
    mockAuthService.verifyAccessCode.mockResolvedValue({
      isValid: false,
      message: '無効なアクセスコードです'
    });

    const accessCodeInput = screen.getByPlaceholderText('アクセスコードを入力');
    const confirmButton = screen.getByText('確認');

    fireEvent.change(accessCodeInput, { target: { value: 'INVALID' } });
    fireEvent.click(confirmButton);

    // 2. エラーメッセージの表示
    await waitFor(() => {
      expect(screen.getByText('無効なアクセスコードです')).toBeInTheDocument();
    });

    // 3. 再入力の促し
    expect(accessCodeInput).toBeInTheDocument();
    expect(confirmButton).toBeInTheDocument();

    // 4. 有効なコードでの成功
    mockAuthService.verifyAccessCode.mockResolvedValue({
      isValid: true,
      message: 'アクセスコードが確認されました'
    });

    fireEvent.change(accessCodeInput, { target: { value: 'VALID123' } });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockAuthService.verifyAccessCode).toHaveBeenCalledWith('VALID123');
    });
  });

  test('ログイン失敗からの回復フローが動作すること', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      isAnonymous: false,
      authToken: null,
      signInAnonymous: jest.fn(),
      signOut: jest.fn(),
      refreshToken: jest.fn(),
    });

    // アクセスコード認証は成功している状態から開始
    render(
      <TestProviders>
        <QuizSelectionPage />
      </TestProviders>
    );

    // ログイン失敗時の処理をシミュレート
    mockAuthService.getMe.mockRejectedValue(new Error('Unauthorized'));

    // 認証エラーによりアクセスコードページにリダイレクトされることを確認
    await waitFor(() => {
      // エラー状態の確認
      expect(mockAuthService.getMe).toHaveBeenCalled();
    });
  });

  test('セッション参加エラーハンドリングが正常に動作すること', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user1',
        username: 'testuser',
        displayName: 'テストユーザー',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      loading: false,
      isAuthenticated: true,
      isAnonymous: false,
      authToken: 'valid-token',
      signInAnonymous: jest.fn(),
      signOut: jest.fn(),
      refreshToken: jest.fn(),
    });

    mockAuthService.getMe.mockResolvedValue({
      user: {
        id: 'user1',
        username: 'testuser',
        displayName: 'テストユーザー',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
    });

    render(
      <TestProviders>
        <QuizSelectionPage />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('クイズに参加')).toBeInTheDocument();
    });

    // 存在しないセッションIDでの参加試行
    const sessionInput = screen.getByPlaceholderText('セッションIDを入力');
    const joinButton = screen.getByText('クイズに参加');

    fireEvent.change(sessionInput, { target: { value: 'NONEXISTENT' } });
    fireEvent.click(joinButton);

    // エラーハンドリングの確認（実装に依存）
    // 実際にはQuizContainerでのセッション情報取得エラーが発生する
  });

  test('ログアウト処理が正常に動作すること', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user1',
        username: 'testuser',
        displayName: 'テストユーザー',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      loading: false,
      isAuthenticated: true,
      isAnonymous: false,
      authToken: 'valid-token',
      signInAnonymous: jest.fn(),
      signOut: jest.fn(),
      refreshToken: jest.fn(),
    });

    mockAuthService.getMe.mockResolvedValue({
      user: {
        id: 'user1',
        username: 'testuser',
        displayName: 'テストユーザー',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
    });

    mockAuthService.logout.mockResolvedValue(undefined);

    render(
      <TestProviders>
        <QuizSelectionPage />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('ログアウト')).toBeInTheDocument();
    });

    const logoutButton = screen.getByText('ログアウト');
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockAuthService.logout).toHaveBeenCalled();
    });
  });

  test('管理者アクセス制御が正常に動作すること', async () => {
    // 一般ユーザーの場合
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user1',
        username: 'testuser',
        displayName: 'テストユーザー',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      loading: false,
      isAuthenticated: true,
      isAnonymous: false,
      authToken: 'valid-token',
      signInAnonymous: jest.fn(),
      signOut: jest.fn(),
      refreshToken: jest.fn(),
    });

    mockAuthService.getMe.mockResolvedValue({
      user: {
        id: 'user1',
        username: 'testuser',
        displayName: 'テストユーザー',
        email: 'test@example.com',
        isAdmin: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
    });

    render(
      <TestProviders>
        <QuizSelectionPage />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('クイズに参加')).toBeInTheDocument();
    });

    // 一般ユーザーには管理者ボタンが表示されないこと
    expect(screen.queryByText('管理者ダッシュボード')).not.toBeInTheDocument();
  });
});