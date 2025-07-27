import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import QuizContainer from '@/containers/QuizContainer';

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
jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(),
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
  useParams: () => ({ id: 'test-session' }),
}));

const mockUseWebSocket = useWebSocket as jest.MockedFunction<typeof useWebSocket>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('Revival Flow Integration', () => {
  const mockWebSocketActions = {
    isConnected: true,
    submitAnswer: jest.fn(),
    connectionError: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user1',
        displayName: 'テストユーザー',
        email: 'test@example.com',
        isAnonymous: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastLoginAt: '2024-01-01T00:00:00Z',
      },
      loading: false,
      isAuthenticated: true,
      isAnonymous: false,
      authToken: 'valid-token',
      signInAnonymous: jest.fn(),
      signOut: jest.fn(),
      refreshToken: jest.fn(),
    });

    mockUseWebSocket.mockReturnValue(mockWebSocketActions as any);
  });

  test('脱落から復活戦までのフローが動作すること', async () => {
    let mockOnMessage: ((message: any) => void) | undefined;
    let mockOnEliminated: ((data: any) => void) | undefined;

    // WebSocketのコールバック関数を取得
    mockUseWebSocket.mockImplementation(({ onMessage, onEliminated }: any) => {
      mockOnMessage = onMessage;
      mockOnEliminated = onEliminated;
      return mockWebSocketActions as any;
    });

    render(
      <TestProviders>
        <QuizContainer />
      </TestProviders>
    );

    // 1. 通常のクイズ画面が表示されることを確認
    await waitFor(() => {
      expect(screen.getByTestId('quiz-container')).toBeInTheDocument();
    });

    // 2. 問題を受信
    const mockQuestion = {
      id: 'question-1',
      text: 'テスト問題',
      options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
      correctAnswer: 0,
    };

    if (mockOnMessage) {
      mockOnMessage({
        type: 'question',
        data: mockQuestion,
      });
    }

    await waitFor(() => {
      expect(screen.getByText('テスト問題')).toBeInTheDocument();
    });

    // 3. 不正解を選択して送信
    const wrongOption = screen.getByLabelText('選択肢2');
    fireEvent.click(wrongOption);

    const submitButton = screen.getByText('回答する');
    fireEvent.click(submitButton);

    // 4. 不正解による脱落通知を受信
    if (mockOnEliminated) {
      mockOnEliminated({
        userId: 'user1',
        reason: 'wrong_answer',
        questionId: 'question-1',
      });
    }

    // 5. 脱落画面の表示確認
    await waitFor(() => {
      expect(screen.getByText('残念！脱落しました')).toBeInTheDocument();
      expect(screen.getByText('復活戦の開始をお待ちください')).toBeInTheDocument();
    });

    // 6. 復活戦の通知受信
    if (mockOnMessage) {
      mockOnMessage({
        type: 'revival_started',
        data: {
          revivalQuestionId: 'revival-question-1',
          eligibleUsers: ['user1', 'user2', 'user3'],
          timeLimit: 30,
        },
      });
    }

    // 7. 復活戦参加ボタンの表示
    await waitFor(() => {
      expect(screen.getByText('復活戦に参加')).toBeInTheDocument();
    });

    const joinRevivalButton = screen.getByText('復活戦に参加');
    fireEvent.click(joinRevivalButton);

    // 8. 復活戦問題の表示
    const revivalQuestion = {
      id: 'revival-question-1',
      text: '復活戦問題',
      options: ['復活選択肢1', '復活選択肢2', '復活選択肢3', '復活選択肢4'],
      correctAnswer: 1,
    };

    if (mockOnMessage) {
      mockOnMessage({
        type: 'revival_question',
        data: revivalQuestion,
      });
    }

    await waitFor(() => {
      expect(screen.getByText('復活戦問題')).toBeInTheDocument();
      expect(screen.getByText('復活戦')).toBeInTheDocument();
    });

    // 9. 復活戦で正解を選択
    const correctRevivalOption = screen.getByLabelText('復活選択肢2');
    fireEvent.click(correctRevivalOption);

    const revivalSubmitButton = screen.getByText('回答する');
    fireEvent.click(revivalSubmitButton);

    // 10. 復活成功の通知
    if (mockOnMessage) {
      mockOnMessage({
        type: 'revival_result',
        data: {
          userId: 'user1',
          revived: true,
          message: '復活しました！',
        },
      });
    }

    // 11. メインゲームへの復帰確認
    await waitFor(() => {
      expect(screen.getByText('復活しました！')).toBeInTheDocument();
      expect(screen.getByText('メインゲームに戻る')).toBeInTheDocument();
    });

    const returnButton = screen.getByText('メインゲームに戻る');
    fireEvent.click(returnButton);

    // 12. メインゲーム画面への復帰確認
    await waitFor(() => {
      expect(screen.getByTestId('main-quiz-container')).toBeInTheDocument();
    });
  });

  test('復活戦参加資格がない場合の処理が正しいこと', async () => {
    let mockOnMessage: ((message: any) => void) | undefined;

    mockUseWebSocket.mockImplementation(({ onMessage }: any) => {
      mockOnMessage = onMessage;
      return mockWebSocketActions as any;
    });

    render(
      <TestProviders>
        <QuizContainer />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('quiz-container')).toBeInTheDocument();
    });

    // 勝者（ゲームクリア済み）のユーザーとして復活戦通知を受信
    if (mockOnMessage) {
      mockOnMessage({
        type: 'revival_started',
        data: {
          revivalQuestionId: 'revival-question-1',
          eligibleUsers: ['user2', 'user3'], // 現在のユーザー（user1）は含まれない
          timeLimit: 30,
        },
      });
    }

    // 復活戦参加ボタンが表示されないことを確認
    await waitFor(() => {
      expect(screen.queryByText('復活戦に参加')).not.toBeInTheDocument();
    });

    // 代わりに観戦モードの表示
    expect(screen.getByText('復活戦を観戦中')).toBeInTheDocument();
  });

  test('復活戦で不正解した場合の処理が正しいこと', async () => {
    let mockOnMessage: ((message: any) => void) | undefined;

    mockUseWebSocket.mockImplementation(({ onMessage }: any) => {
      mockOnMessage = onMessage;
      return mockWebSocketActions as any;
    });

    render(
      <TestProviders>
        <QuizContainer />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('quiz-container')).toBeInTheDocument();
    });

    // 復活戦に参加
    if (mockOnMessage) {
      mockOnMessage({
        type: 'revival_started',
        data: {
          revivalQuestionId: 'revival-question-1',
          eligibleUsers: ['user1'],
          timeLimit: 30,
        },
      });
    }

    await waitFor(() => {
      expect(screen.getByText('復活戦に参加')).toBeInTheDocument();
    });

    const joinButton = screen.getByText('復活戦に参加');
    fireEvent.click(joinButton);

    // 復活戦問題表示
    const revivalQuestion = {
      id: 'revival-question-1',
      text: '復活戦問題',
      options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
      correctAnswer: 0,
    };

    if (mockOnMessage) {
      mockOnMessage({
        type: 'revival_question',
        data: revivalQuestion,
      });
    }

    await waitFor(() => {
      expect(screen.getByText('復活戦問題')).toBeInTheDocument();
    });

    // 不正解を選択
    const wrongOption = screen.getByLabelText('選択肢2');
    fireEvent.click(wrongOption);

    const submitButton = screen.getByText('回答する');
    fireEvent.click(submitButton);

    // 復活失敗の通知
    if (mockOnMessage) {
      mockOnMessage({
        type: 'revival_result',
        data: {
          userId: 'user1',
          revived: false,
          message: '復活できませんでした',
        },
      });
    }

    // 復活失敗画面の表示
    await waitFor(() => {
      expect(screen.getByText('復活できませんでした')).toBeInTheDocument();
      expect(screen.getByText('ゲーム終了')).toBeInTheDocument();
    });
  });

  test('復活戦のタイムアウト処理が正しいこと', async () => {
    let mockOnMessage: ((message: any) => void) | undefined;

    mockUseWebSocket.mockImplementation(({ onMessage }: any) => {
      mockOnMessage = onMessage;
      return mockWebSocketActions as any;
    });

    render(
      <TestProviders>
        <QuizContainer />
      </TestProviders>
    );

    // 復活戦開始
    if (mockOnMessage) {
      mockOnMessage({
        type: 'revival_started',
        data: {
          revivalQuestionId: 'revival-question-1',
          eligibleUsers: ['user1'],
          timeLimit: 30,
        },
      });
    }

    await waitFor(() => {
      expect(screen.getByText('復活戦に参加')).toBeInTheDocument();
    });

    const joinButton = screen.getByText('復活戦に参加');
    fireEvent.click(joinButton);

    // 復活戦問題表示
    if (mockOnMessage) {
      mockOnMessage({
        type: 'revival_question',
        data: {
          id: 'revival-question-1',
          text: '復活戦問題',
          options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
          correctAnswer: 0,
        },
      });
    }

    await waitFor(() => {
      expect(screen.getByText('復活戦問題')).toBeInTheDocument();
    });

    // タイムアウト通知
    if (mockOnMessage) {
      mockOnMessage({
        type: 'revival_timeout',
        data: {
          message: '時間切れです',
        },
      });
    }

    // タイムアウト画面の表示
    await waitFor(() => {
      expect(screen.getByText('時間切れです')).toBeInTheDocument();
      expect(screen.getByText('復活戦終了')).toBeInTheDocument();
    });
  });

  test('複数人での復活戦が正常に動作すること', async () => {
    let mockOnMessage: ((message: any) => void) | undefined;

    mockUseWebSocket.mockImplementation(({ onMessage }: any) => {
      mockOnMessage = onMessage;
      return mockWebSocketActions as any;
    });

    render(
      <TestProviders>
        <QuizContainer />
      </TestProviders>
    );

    // 複数人が参加する復活戦
    if (mockOnMessage) {
      mockOnMessage({
        type: 'revival_started',
        data: {
          revivalQuestionId: 'revival-question-1',
          eligibleUsers: ['user1', 'user2', 'user3', 'user4'],
          timeLimit: 30,
        },
      });
    }

    await waitFor(() => {
      expect(screen.getByText('復活戦に参加')).toBeInTheDocument();
      expect(screen.getByText('参加者数: 4人')).toBeInTheDocument();
    });

    // 復活戦結果（先着順で復活者決定）
    if (mockOnMessage) {
      mockOnMessage({
        type: 'revival_results',
        data: {
          revivedUsers: ['user2', 'user1'], // 先着2名
          eliminatedUsers: ['user3', 'user4'],
          revivalCount: 2,
        },
      });
    }

    // 復活成功の表示
    await waitFor(() => {
      expect(screen.getByText('復活成功！')).toBeInTheDocument();
      expect(screen.getByText('2位で復活しました')).toBeInTheDocument();
    });
  });
});