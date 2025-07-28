import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import { QuizContainer } from '../QuizContainer';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAPI } from '@/hooks/useAPI';
import { useQuizStore } from '@/store/quizStore';
import { useUserStore } from '@/store/userStore';

// Mocks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(),
}));

jest.mock('@/hooks/useAPI', () => ({
  useAPI: jest.fn(),
}));

jest.mock('@/store/quizStore', () => ({
  useQuizStore: jest.fn(),
}));

jest.mock('@/store/userStore', () => ({
  useUserStore: jest.fn(),
}));

jest.mock('../QuizPresenter', () => ({
  QuizPresenter: jest.fn(({ onAnswer, onClearResults, onGoHome }) => (
    <div data-testid="quiz-presenter">
      <button onClick={() => onAnswer(0, 1000)}>Answer</button>
      <button onClick={onClearResults}>Clear Results</button>
      <button onClick={onGoHome}>Go Home</button>
    </div>
  )),
}));

// Mock implementations
const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.Mock;
const mockUseParams = useParams as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockUseWebSocket = useWebSocket as jest.Mock;
const mockUseAPI = useAPI as jest.Mock;
const mockUseQuizStore = useQuizStore as jest.Mock;
const mockUseUserStore = useUserStore as jest.Mock;

const mockSession = {
  id: 'session-1',
  title: 'Test Session',
  status: 'active',
  currentRound: 1,
  maxRounds: 5,
  settings: {
    timeLimit: 30,
    revivalEnabled: false,
    revivalCount: 0,
    minParticipants: 2,
    maxParticipants: 10,
    autoStart: false,
    shuffleQuestions: true,
    showCorrectAnswer: true,
    allowSpectators: false
  },
  createdBy: 'admin-1',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01')
};

const mockQuestion = {
  id: 'q1',
  question: 'Test Question',
  options: ['A', 'B', 'C', 'D'],
  correctAnswer: 1,
  explanation: 'Test explanation',
  difficulty: 'medium',
  category: 'general',
  tags: ['test'],
  timeLimit: 30,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01')
};

describe('QuizContainer Component', () => {
  const defaultMocks = {
    useRouter: { push: mockPush },
    useParams: { id: 'session-1' },
    useAuth: {
      isAuthenticated: true,
      user: { id: 'user-1', username: 'testuser' },
      loading: false,
    },
    useWebSocket: {
      isConnected: true,
      submitAnswer: jest.fn(),
      connectionError: null,
    },
    useAPI: {
      getSessionInfo: jest.fn(),
      joinSession: jest.fn(),
      getParticipants: jest.fn(),
      submitAnswer: jest.fn(),
    },
    useQuizStore: {
      currentSession: mockSession,
      setCurrentSession: jest.fn(),
      participants: [],
      setParticipants: jest.fn(),
      currentQuestion: mockQuestion,
      timeRemaining: 15,
      hasAnswered: false,
      setHasAnswered: jest.fn(),
      roundResults: null,
      clearRoundResults: jest.fn(),
      revivalInProgress: false,
      revivalCandidates: [],
      revivedParticipants: [],
      isConnected: true,
      isLoading: false,
      error: null,
      setError: jest.fn(),
      addAnswer: jest.fn(),
    },
    useUserStore: {
      displayName: 'Test User',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(defaultMocks.useRouter);
    mockUseParams.mockReturnValue(defaultMocks.useParams);
    mockUseAuth.mockReturnValue(defaultMocks.useAuth);
    mockUseWebSocket.mockReturnValue(defaultMocks.useWebSocket);
    mockUseAPI.mockReturnValue(defaultMocks.useAPI);
    mockUseQuizStore.mockReturnValue(defaultMocks.useQuizStore);
    mockUseUserStore.mockReturnValue(defaultMocks.useUserStore);

    // API mocks success responses
    defaultMocks.useAPI.getSessionInfo.mockResolvedValue({
      success: true,
      data: mockSession,
    });
    defaultMocks.useAPI.joinSession.mockResolvedValue({
      success: true,
    });
    defaultMocks.useAPI.getParticipants.mockResolvedValue({
      success: true,
      data: [],
    });
    defaultMocks.useAPI.submitAnswer.mockResolvedValue({
      success: true,
      data: { id: 'answer-1' },
    });
  });

  test('認証済みユーザーでQuizPresenterが表示されること', async () => {
    render(<QuizContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('quiz-presenter')).toBeInTheDocument();
    });
  });

  test('未認証ユーザーはホームにリダイレクトされること', () => {
    mockUseAuth.mockReturnValue({
      ...defaultMocks.useAuth,
      isAuthenticated: false,
      loading: false,
    });

    render(<QuizContainer />);

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  test('ローディング中は読み込み画面が表示されること', () => {
    mockUseAuth.mockReturnValue({
      ...defaultMocks.useAuth,
      loading: true,
    });

    render(<QuizContainer />);

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  test('セッション情報がない場合は読み込み画面が表示されること', () => {
    mockUseQuizStore.mockReturnValue({
      ...defaultMocks.useQuizStore,
      currentSession: null,
    });

    render(<QuizContainer />);

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  test('セッション参加エラー時のエラー画面表示', async () => {
    defaultMocks.useAPI.joinSession.mockResolvedValue({
      success: false,
      error: { message: 'セッションが満員です' },
    });

    render(<QuizContainer />);

    await waitFor(() => {
      expect(screen.getByText('参加できませんでした')).toBeInTheDocument();
      expect(screen.getByText('セッションが満員です')).toBeInTheDocument();
    });
  });

  test('セッション情報の取得が行われること', async () => {
    render(<QuizContainer />);

    await waitFor(() => {
      expect(defaultMocks.useAPI.getSessionInfo).toHaveBeenCalledWith('session-1');
    });
  });

  test('セッションへの参加が行われること', async () => {
    render(<QuizContainer />);

    await waitFor(() => {
      expect(defaultMocks.useAPI.joinSession).toHaveBeenCalledWith('session-1', {
        displayName: 'Test User',
      });
    });
  });

  test('回答送信機能が動作すること', async () => {
    render(<QuizContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('quiz-presenter')).toBeInTheDocument();
    });

    // QuizPresenterの回答ボタンをクリック
    const answerButton = screen.getByText('Answer');
    answerButton.click();

    await waitFor(() => {
      expect(defaultMocks.useAPI.submitAnswer).toHaveBeenCalledWith('session-1', {
        questionId: 'q1',
        selectedOption: 0,
        responseTime: 1000,
      });
      expect(defaultMocks.useQuizStore.addAnswer).toHaveBeenCalled();
      expect(defaultMocks.useQuizStore.setHasAnswered).toHaveBeenCalledWith(true);
    });
  });

  test('結果クリア機能が動作すること', async () => {
    render(<QuizContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('quiz-presenter')).toBeInTheDocument();
    });

    const clearButton = screen.getByText('Clear Results');
    clearButton.click();

    expect(defaultMocks.useQuizStore.clearRoundResults).toHaveBeenCalled();
  });

  test('ホームに戻る機能が動作すること', async () => {
    render(<QuizContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('quiz-presenter')).toBeInTheDocument();
    });

    const homeButton = screen.getByText('Go Home');
    homeButton.click();

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  test('既に回答済みの場合は再回答できないこと', async () => {
    mockUseQuizStore.mockReturnValue({
      ...defaultMocks.useQuizStore,
      hasAnswered: true,
    });

    render(<QuizContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('quiz-presenter')).toBeInTheDocument();
    });

    const answerButton = screen.getByText('Answer');
    answerButton.click();

    // 回答送信が呼ばれないことを確認
    expect(defaultMocks.useAPI.submitAnswer).not.toHaveBeenCalled();
  });

  test('WebSocket接続が正しく設定されること', () => {
    render(<QuizContainer />);

    expect(mockUseWebSocket).toHaveBeenCalledWith({
      sessionId: 'session-1',
      autoConnect: true,
    });
  });

  test('セッションIDがない場合の処理', () => {
    mockUseParams.mockReturnValue({ id: undefined });

    render(<QuizContainer />);

    // セッション情報の取得が呼ばれないことを確認
    expect(defaultMocks.useAPI.getSessionInfo).not.toHaveBeenCalled();
  });

  test('displayNameがない場合はセッション参加が行われないこと', () => {
    mockUseUserStore.mockReturnValue({
      displayName: '',
    });

    render(<QuizContainer />);

    // セッション参加が呼ばれないことを確認
    expect(defaultMocks.useAPI.joinSession).not.toHaveBeenCalled();
  });

  test('回答送信エラー時のエラーハンドリング', async () => {
    defaultMocks.useAPI.submitAnswer.mockResolvedValue({
      success: false,
      error: { message: '回答送信に失敗しました' },
    });

    render(<QuizContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('quiz-presenter')).toBeInTheDocument();
    });

    const answerButton = screen.getByText('Answer');
    answerButton.click();

    await waitFor(() => {
      expect(defaultMocks.useQuizStore.setError).toHaveBeenCalledWith('回答送信に失敗しました');
    });
  });

  test('WebSocketとAPI両方で回答送信されること', async () => {
    render(<QuizContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('quiz-presenter')).toBeInTheDocument();
    });

    const answerButton = screen.getByText('Answer');
    answerButton.click();

    await waitFor(() => {
      expect(defaultMocks.useAPI.submitAnswer).toHaveBeenCalled();
      expect(defaultMocks.useWebSocket.submitAnswer).toHaveBeenCalledWith('q1', 0, 1000);
    });
  });
});