import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import AdminPage from '@/app/admin/page';
import AdminSessionPage from '@/app/admin/session/[id]/page';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAPI } from '@/hooks/useAPI';

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
jest.mock('@/hooks/useAdminAuth', () => ({
  useAdminAuth: jest.fn(),
}));

jest.mock('@/hooks/useAPI', () => ({
  useAPI: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/admin',
  useParams: () => ({ id: 'test-session-id' }),
}));

const mockPush = jest.fn();
const mockUseAdminAuth = useAdminAuth as jest.MockedFunction<typeof useAdminAuth>;
const mockUseAPI = useAPI as jest.MockedFunction<typeof useAPI>;

describe('Admin Management Flow Integration', () => {
  const mockAPI = {
    createSession: jest.fn(),
    controlSession: jest.fn(),
    generateQuestion: jest.fn(),
    getSessionInfo: jest.fn(),
    getSessionStats: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAPI.mockReturnValue(mockAPI as any);
  });

  test('ゲーム作成から終了までのフローが動作すること', async () => {
    // 1. 管理者ログイン状態
    mockUseAdminAuth.mockReturnValue({
      user: {
        id: 'admin1',
        username: 'admin',
        displayName: '管理者',
        email: 'admin@example.com',
        isAdmin: true,
        role: 'admin',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      isAdmin: true,
      loading: false,
      error: null,
      isAuthenticated: true,
    });

    render(
      <TestProviders>
        <AdminPage />
      </TestProviders>
    );

    // 管理画面が表示されること
    await waitFor(() => {
      expect(screen.getByText('管理者ダッシュボード')).toBeInTheDocument();
    });

    // 2. ゲーム作成
    mockAPI.createSession.mockResolvedValue({
      success: true,
      data: {
        id: 'new-session-id',
        title: 'テストセッション',
        status: 'waiting',
        maxParticipants: 200,
        createdAt: '2024-01-01T00:00:00Z',
        settings: {
          timeLimit: 30,
          revivalEnabled: true,
          revivalCount: 3,
        },
      },
    });

    // セッション作成フォームに入力
    const titleInput = screen.getByPlaceholderText('忘年会クイズ大会');
    fireEvent.change(titleInput, { target: { value: 'テストセッション' } });

    const createButton = screen.getByText('セッションを作成');
    fireEvent.click(createButton);

    // セッション作成APIが呼ばれること
    await waitFor(() => {
      expect(mockAPI.createSession).toHaveBeenCalledWith({
        title: 'テストセッション',
        maxParticipants: 200,
        timeLimit: 30,
        revivalEnabled: true,
        revivalCount: 3,
      });
    });

    // セッション管理画面へ遷移すること
    expect(mockPush).toHaveBeenCalledWith('/admin/session/new-session-id');
  });

  test('セッション管理画面の機能が正常に動作すること', async () => {
    // セッション管理画面の状態設定
    mockUseAdminAuth.mockReturnValue({
      user: {
        id: 'admin1',
        username: 'admin',
        displayName: '管理者',
        email: 'admin@example.com',
        isAdmin: true,
        role: 'admin',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      isAdmin: true,
      loading: false,
      error: null,
      isAuthenticated: true,
    });

    // セッション情報取得
    mockAPI.getSessionInfo.mockResolvedValue({
      success: true,
      data: {
        id: 'test-session-id',
        title: 'テストセッション',
        status: 'waiting',
        maxParticipants: 200,
        participantCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
        settings: {
          timeLimit: 30,
          revivalEnabled: true,
          revivalCount: 3,
        },
      },
    });

    render(
      <TestProviders>
        <AdminSessionPage />
      </TestProviders>
    );

    // 3. セッション情報の表示確認
    await waitFor(() => {
      expect(screen.getByText('テストセッション')).toBeInTheDocument();
      expect(screen.getByText('セッションID: test-session-id')).toBeInTheDocument();
      expect(screen.getByText('待機中')).toBeInTheDocument();
    });

    // セッション制御ボタンが表示されること
    expect(screen.getByText('セッション開始')).toBeInTheDocument();
    expect(screen.getByText('問題を生成')).toBeInTheDocument();

    // 4. ゲーム開始
    mockAPI.controlSession.mockResolvedValue({
      success: true,
      data: { message: 'Session started successfully' },
    });

    const startButton = screen.getByText('セッション開始');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockAPI.controlSession).toHaveBeenCalledWith('test-session-id', {
        action: 'start',
      });
    });

    // 5. 問題生成
    mockAPI.generateQuestion.mockResolvedValue({
      success: true,
      data: {
        id: 'question-1',
        text: 'テスト問題',
        options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
        correctAnswer: 0,
      },
    });

    const generateButton = screen.getByText('問題を生成');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockAPI.generateQuestion).toHaveBeenCalledWith('test-session-id');
    });
  });

  test('セッション終了フローが正常に動作すること', async () => {
    mockUseAdminAuth.mockReturnValue({
      user: {
        id: 'admin1',
        username: 'admin',
        displayName: '管理者',
        email: 'admin@example.com',
        isAdmin: true,
        role: 'admin',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      isAdmin: true,
      loading: false,
      error: null,
      isAuthenticated: true,
    });

    // アクティブセッションの状態
    mockAPI.getSessionInfo.mockResolvedValue({
      success: true,
      data: {
        id: 'active-session-id',
        title: 'アクティブセッション',
        status: 'active',
        maxParticipants: 200,
        participantCount: 50,
        createdAt: '2024-01-01T00:00:00Z',
        settings: {
          timeLimit: 30,
          revivalEnabled: true,
          revivalCount: 3,
        },
      },
    });

    render(
      <TestProviders>
        <AdminSessionPage />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('アクティブセッション')).toBeInTheDocument();
      expect(screen.getByText('進行中')).toBeInTheDocument();
    });

    // セッション終了
    mockAPI.controlSession.mockResolvedValue({
      success: true,
      data: { message: 'Session finished successfully' },
    });

    const finishButton = screen.getByText('セッション終了');
    fireEvent.click(finishButton);

    await waitFor(() => {
      expect(mockAPI.controlSession).toHaveBeenCalledWith('active-session-id', {
        action: 'finish',
      });
    });
  });

  test('管理者権限チェックが正常に動作すること', async () => {
    // 非管理者ユーザーの場合
    mockUseAdminAuth.mockReturnValue({
      user: {
        id: 'user1',
        username: 'user',
        displayName: 'ユーザー',
        email: 'user@example.com',
        isAdmin: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      isAdmin: false,
      loading: false,
      error: null,
      isAuthenticated: true,
    });

    render(
      <TestProviders>
        <AdminPage />
      </TestProviders>
    );

    // アクセス拒否メッセージが表示されること
    await waitFor(() => {
      expect(screen.getByText('アクセス権限がありません')).toBeInTheDocument();
      expect(screen.getByText('このページは管理者のみアクセス可能です。')).toBeInTheDocument();
    });

    // ホームに戻るボタンが表示されること
    expect(screen.getByText('ホームに戻る')).toBeInTheDocument();
  });

  test('未認証状態での管理画面アクセスが適切に処理されること', async () => {
    mockUseAdminAuth.mockReturnValue({
      user: null,
      isAdmin: false,
      loading: false,
      error: null,
      isAuthenticated: false,
    });

    render(
      <TestProviders>
        <AdminPage />
      </TestProviders>
    );

    // アクセスコードページへのリダイレクトが確認される
    // 実際の実装では router.push('/access-code') が呼ばれる
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/access-code');
    });
  });

  test('エラーハンドリングが正常に動作すること', async () => {
    mockUseAdminAuth.mockReturnValue({
      user: {
        id: 'admin1',
        username: 'admin',
        displayName: '管理者',
        email: 'admin@example.com',
        isAdmin: true,
        role: 'admin',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      isAdmin: true,
      loading: false,
      error: null,
      isAuthenticated: true,
    });

    // セッション作成エラー
    mockAPI.createSession.mockResolvedValue({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'セッション名が無効です',
      },
    });

    render(
      <TestProviders>
        <AdminPage />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('管理者ダッシュボード')).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText('忘年会クイズ大会');
    fireEvent.change(titleInput, { target: { value: 'テスト' } });

    const createButton = screen.getByText('セッションを作成');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockAPI.createSession).toHaveBeenCalled();
    });

    // エラーメッセージの表示確認（実装に依存）
    // アラートまたはトーストメッセージでエラーが表示される
  });

  test('セッション情報の更新が正常に動作すること', async () => {
    mockUseAdminAuth.mockReturnValue({
      user: {
        id: 'admin1',
        username: 'admin',
        displayName: '管理者',
        email: 'admin@example.com',
        isAdmin: true,
        role: 'admin',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      isAdmin: true,
      loading: false,
      error: null,
      isAuthenticated: true,
    });

    // 初期セッション情報
    mockAPI.getSessionInfo.mockResolvedValueOnce({
      success: true,
      data: {
        id: 'test-session-id',
        title: 'テストセッション',
        status: 'waiting',
        maxParticipants: 200,
        participantCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
        settings: {
          timeLimit: 30,
          revivalEnabled: true,
          revivalCount: 3,
        },
      },
    });

    render(
      <TestProviders>
        <AdminSessionPage />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('現在の参加者数: 0人')).toBeInTheDocument();
    });

    // 更新されたセッション情報
    mockAPI.getSessionInfo.mockResolvedValueOnce({
      success: true,
      data: {
        id: 'test-session-id',
        title: 'テストセッション',
        status: 'active',
        maxParticipants: 200,
        participantCount: 25,
        createdAt: '2024-01-01T00:00:00Z',
        settings: {
          timeLimit: 30,
          revivalEnabled: true,
          revivalCount: 3,
        },
      },
    });

    const updateButton = screen.getByText('情報を更新');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText('現在の参加者数: 25人')).toBeInTheDocument();
      expect(screen.getByText('進行中')).toBeInTheDocument();
    });
  });

  test('ローディング状態が正しく表示されること', async () => {
    mockUseAdminAuth.mockReturnValue({
      user: null,
      isAdmin: false,
      loading: true,
      error: null,
      isAuthenticated: false,
    });

    render(
      <TestProviders>
        <AdminPage />
      </TestProviders>
    );

    // ローディングスピナーが表示されること
    expect(screen.getByRole('progressbar') || screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});