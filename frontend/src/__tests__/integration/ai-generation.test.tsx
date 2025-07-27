import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
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
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useParams: () => ({ id: 'test-session-id' }),
}));

const mockUseAdminAuth = useAdminAuth as jest.MockedFunction<typeof useAdminAuth>;
const mockUseAPI = useAPI as jest.MockedFunction<typeof useAPI>;

describe('AI Question Generation Integration', () => {
  const mockAPI = {
    getSessionInfo: jest.fn(),
    generateQuestion: jest.fn(),
    generateQuestionBatch: jest.fn(),
    controlSession: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAPI.mockReturnValue(mockAPI as any);

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
  });

  test('AI問題生成が正常に動作すること', async () => {
    // セッション情報設定
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

    // Gemini APIでの問題生成成功
    mockAPI.generateQuestion.mockResolvedValue({
      success: true,
      data: {
        id: 'ai-question-1',
        text: 'AI生成問題: 日本の首都はどこですか？',
        options: ['東京', '大阪', '京都', '名古屋'],
        correctAnswer: 0,
        difficulty: 'easy',
        category: '地理',
        aiProvider: 'gemini',
        generatedAt: '2024-01-01T00:00:00Z',
      },
      metadata: {
        provider: 'gemini',
        responseTime: 1200,
        tokensUsed: 150,
      },
    });

    render(
      <TestProviders>
        <AdminSessionPage />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('テストセッション')).toBeInTheDocument();
    });

    // 問題生成ボタンをクリック
    const generateButton = screen.getByText('問題を生成');
    fireEvent.click(generateButton);

    // 生成中の表示確認
    expect(screen.getByText('問題を生成中...')).toBeInTheDocument();

    // API呼び出し確認
    await waitFor(() => {
      expect(mockAPI.generateQuestion).toHaveBeenCalledWith('test-session-id', {
        provider: 'gemini',
        difficulty: 'mixed',
        category: 'general',
        count: 1,
      });
    });

    // 生成成功メッセージの表示
    await waitFor(() => {
      expect(screen.getByText('問題を生成しました')).toBeInTheDocument();
    });

    // 生成された問題情報の表示
    expect(screen.getByText('生成元: Gemini')).toBeInTheDocument();
    expect(screen.getByText('レスポンス時間: 1.2秒')).toBeInTheDocument();
    expect(screen.getByText('使用トークン: 150')).toBeInTheDocument();
  });

  test('APIフォールバック機能が動作すること', async () => {
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

    // 最初のAPI呼び出し（Gemini）は失敗
    mockAPI.generateQuestion
      .mockResolvedValueOnce({
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'Gemini API is temporarily unavailable',
          provider: 'gemini',
        },
      })
      // 2回目のAPI呼び出し（OpenAI）は成功
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'ai-question-2',
          text: 'AI生成問題（OpenAI）: 世界で最も高い山は？',
          options: ['エベレスト', '富士山', 'キリマンジャロ', 'マッキンリー'],
          correctAnswer: 0,
          difficulty: 'easy',
          category: '地理',
          aiProvider: 'openai',
          generatedAt: '2024-01-01T00:00:00Z',
        },
        metadata: {
          provider: 'openai',
          responseTime: 800,
          tokensUsed: 120,
          fallbackUsed: true,
          failedProviders: ['gemini'],
        },
      });

    render(
      <TestProviders>
        <AdminSessionPage />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('テストセッション')).toBeInTheDocument();
    });

    const generateButton = screen.getByText('問題を生成');
    fireEvent.click(generateButton);

    // フォールバック処理の表示
    await waitFor(() => {
      expect(screen.getByText('Gemini APIでエラーが発生しました。OpenAIに切り替えています...')).toBeInTheDocument();
    });

    // 成功メッセージの表示
    await waitFor(() => {
      expect(screen.getByText('問題を生成しました（フォールバック使用）')).toBeInTheDocument();
    });

    // フォールバック情報の表示
    expect(screen.getByText('生成元: OpenAI (フォールバック)')).toBeInTheDocument();
    expect(screen.getByText('失敗したAPI: Gemini')).toBeInTheDocument();
  });

  test('API制限時のエラーハンドリングが動作すること', async () => {
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

    // 全てのAPIが制限に達している場合
    mockAPI.generateQuestion.mockResolvedValue({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: '全てのAI APIが制限に達しています',
        providers: ['gemini', 'openai', 'claude'],
        retryAfter: 3600, // 1時間後に再試行可能
      },
    });

    render(
      <TestProviders>
        <AdminSessionPage />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('テストセッション')).toBeInTheDocument();
    });

    const generateButton = screen.getByText('問題を生成');
    fireEvent.click(generateButton);

    // エラーメッセージの表示
    await waitFor(() => {
      expect(screen.getByText('AI APIの制限に達しています')).toBeInTheDocument();
      expect(screen.getByText('1時間後に再試行してください')).toBeInTheDocument();
    });

    // 代替手段の提示
    expect(screen.getByText('手動で問題を追加')).toBeInTheDocument();
    expect(screen.getByText('プリセット問題を使用')).toBeInTheDocument();
  });

  test('問題一括生成が正常に動作すること', async () => {
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

    // 10問一括生成成功
    mockAPI.generateQuestionBatch.mockResolvedValue({
      success: true,
      data: {
        questions: Array.from({ length: 10 }, (_, i) => ({
          id: `batch-question-${i + 1}`,
          text: `一括生成問題 ${i + 1}`,
          options: [`選択肢1`, `選択肢2`, `選択肢3`, `選択肢4`],
          correctAnswer: i % 4,
          difficulty: ['easy', 'medium', 'hard'][i % 3],
          category: ['一般', '歴史', '科学'][i % 3],
        })),
        totalGenerated: 10,
        provider: 'gemini',
        batchId: 'batch-001',
      },
      metadata: {
        provider: 'gemini',
        totalResponseTime: 5200,
        totalTokensUsed: 1500,
        averageResponseTime: 520,
      },
    });

    render(
      <TestProviders>
        <AdminSessionPage />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('テストセッション')).toBeInTheDocument();
    });

    // 一括生成ボタンをクリック
    const batchGenerateButton = screen.getByText('10問まとめて生成');
    fireEvent.click(batchGenerateButton);

    // 生成数の確認ダイアログ
    await waitFor(() => {
      expect(screen.getByText('10問の問題を生成しますか？')).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('生成する');
    fireEvent.click(confirmButton);

    // 進行状況の表示
    expect(screen.getByText('10問を生成中... (0/10)')).toBeInTheDocument();

    // 完了メッセージ
    await waitFor(() => {
      expect(screen.getByText('10問の生成が完了しました')).toBeInTheDocument();
      expect(screen.getByText('平均生成時間: 0.52秒/問')).toBeInTheDocument();
      expect(screen.getByText('総使用トークン: 1,500')).toBeInTheDocument();
    });
  });

  test('生成された問題の品質チェックが動作すること', async () => {
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

    // 品質チェック付きの問題生成レスポンス
    mockAPI.generateQuestion.mockResolvedValue({
      success: true,
      data: {
        id: 'quality-checked-question',
        text: '品質チェック済み問題: 日本の通貨単位は？',
        options: ['円', 'ドル', 'ユーロ', 'ウォン'],
        correctAnswer: 0,
        difficulty: 'easy',
        category: '一般常識',
        aiProvider: 'gemini',
        generatedAt: '2024-01-01T00:00:00Z',
      },
      qualityScore: {
        overall: 95,
        clarity: 98,
        accuracy: 100,
        difficulty: 85,
        uniqueness: 90,
        warnings: [],
        suggestions: ['選択肢の順序をランダム化することを推奨'],
      },
      metadata: {
        provider: 'gemini',
        responseTime: 1500,
        tokensUsed: 180,
        qualityCheckPerformed: true,
      },
    });

    render(
      <TestProviders>
        <AdminSessionPage />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('テストセッション')).toBeInTheDocument();
    });

    const generateButton = screen.getByText('問題を生成');
    fireEvent.click(generateButton);

    // 品質チェック結果の表示
    await waitFor(() => {
      expect(screen.getByText('問題を生成しました')).toBeInTheDocument();
      expect(screen.getByText('品質スコア: 95/100')).toBeInTheDocument();
    });

    // 詳細品質情報の表示
    const qualityDetailsButton = screen.getByText('品質詳細を表示');
    fireEvent.click(qualityDetailsButton);

    expect(screen.getByText('明瞭性: 98/100')).toBeInTheDocument();
    expect(screen.getByText('正確性: 100/100')).toBeInTheDocument();
    expect(screen.getByText('難易度適正性: 85/100')).toBeInTheDocument();
    expect(screen.getByText('独自性: 90/100')).toBeInTheDocument();

    // 改善提案の表示
    expect(screen.getByText('改善提案:')).toBeInTheDocument();
    expect(screen.getByText('選択肢の順序をランダム化することを推奨')).toBeInTheDocument();
  });

  test('問題生成履歴の管理が動作すること', async () => {
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
        generationHistory: [
          {
            id: 'gen-1',
            timestamp: '2024-01-01T10:00:00Z',
            provider: 'gemini',
            questionsGenerated: 5,
            totalTokens: 750,
            responseTime: 2100,
            status: 'success',
          },
          {
            id: 'gen-2',
            timestamp: '2024-01-01T10:30:00Z',
            provider: 'openai',
            questionsGenerated: 3,
            totalTokens: 450,
            responseTime: 1800,
            status: 'success',
            fallbackUsed: true,
          },
        ],
      },
    });

    render(
      <TestProviders>
        <AdminSessionPage />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('テストセッション')).toBeInTheDocument();
    });

    // 生成履歴タブをクリック
    const historyTab = screen.getByText('生成履歴');
    fireEvent.click(historyTab);

    // 生成履歴の表示確認
    expect(screen.getByText('Gemini - 5問生成 (2.1s, 750 tokens)')).toBeInTheDocument();
    expect(screen.getByText('OpenAI - 3問生成 (1.8s, 450 tokens) [フォールバック]')).toBeInTheDocument();

    // 統計情報の表示
    expect(screen.getByText('総生成問題数: 8問')).toBeInTheDocument();
    expect(screen.getByText('総使用トークン: 1,200')).toBeInTheDocument();
    expect(screen.getByText('平均レスポンス時間: 1.95秒')).toBeInTheDocument();
  });
});