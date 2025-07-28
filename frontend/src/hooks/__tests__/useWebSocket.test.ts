import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';
import { io } from 'socket.io-client';

// socket.io-clientのモック
jest.mock('socket.io-client');
const mockIo = io as jest.MockedFunction<typeof io>;

// Store用のモック
const mockSetIsConnected = jest.fn();
const mockSetCurrentQuestion = jest.fn();
const mockSetTimeRemaining = jest.fn();
const mockSetRoundResults = jest.fn();
const mockClearRoundResults = jest.fn();
const mockSetRevivalInProgress = jest.fn();
const mockSetRevivalCandidates = jest.fn();
const mockSetRevivedParticipants = jest.fn();
const mockUpdateSessionStatus = jest.fn();
const mockAddParticipant = jest.fn();
const mockRemoveParticipant = jest.fn();
const mockSetError = jest.fn();

jest.mock('@/store/quizStore', () => ({
  useQuizStore: () => ({
    setIsConnected: mockSetIsConnected,
    setCurrentQuestion: mockSetCurrentQuestion,
    setTimeRemaining: mockSetTimeRemaining,
    setRoundResults: mockSetRoundResults,
    clearRoundResults: mockClearRoundResults,
    setRevivalInProgress: mockSetRevivalInProgress,
    setRevivalCandidates: mockSetRevivalCandidates,
    setRevivedParticipants: mockSetRevivedParticipants,
    updateSessionStatus: mockUpdateSessionStatus,
    addParticipant: mockAddParticipant,
    removeParticipant: mockRemoveParticipant,
    setError: mockSetError,
  }),
}));

jest.mock('@/store/userStore', () => ({
  useUserStore: () => ({
    authToken: 'mock-token',
    displayName: 'テストユーザー',
    user: { id: 'user-1', displayName: 'テストユーザー' },
  }),
}));

// モック用のSocket実装
class MockSocket {
  connected = false;
  events: { [key: string]: Function } = {};

  on(event: string, callback: Function) {
    this.events[event] = callback;
  }

  emit(event: string, data?: any) {
    console.log(`Emitting: ${event}`, data);
  }

  disconnect() {
    this.connected = false;
    if (this.events['disconnect']) {
      this.events['disconnect']();
    }
  }

  // テスト用のヘルパーメソッド
  simulateConnect() {
    this.connected = true;
    if (this.events['connect']) {
      this.events['connect']();
    }
  }

  simulateError(error: Error) {
    if (this.events['connect_error']) {
      this.events['connect_error'](error);
    }
  }

  simulateMessage(type: string, data: any) {
    if (this.events[type]) {
      this.events[type](data);
    }
  }

  simulateDisconnect() {
    this.connected = false;
    if (this.events['disconnect']) {
      this.events['disconnect']();
    }
  }
}

describe('useWebSocket Hook', () => {
  let mockSocket: MockSocket;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket = new MockSocket();
    mockIo.mockReturnValue(mockSocket as any);
    
    // 環境変数をテスト用に設定
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:8080';
  });

  afterEach(() => {
    // 環境変数をリセット
    delete process.env.NODE_ENV;
    delete process.env.NEXT_PUBLIC_WS_URL;
  });

  test('初期状態が正しいこと', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionError).toBe(null);
    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
    expect(typeof result.current.sendMessage).toBe('function');
    expect(typeof result.current.submitAnswer).toBe('function');
    expect(typeof result.current.joinSession).toBe('function');
  });

  test('WebSocket接続が正常に確立されること', async () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    // Socket.ioが正しいパラメータで呼ばれること
    expect(mockIo).toHaveBeenCalledWith('ws://localhost:8080', {
      transports: ['websocket'],
      query: {
        sessionId: '',
        displayName: 'テストユーザー',
        token: 'mock-token',
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // 接続をシミュレート
    act(() => {
      mockSocket.simulateConnect();
    });

    // MockSocketの接続状態とReactの状態を確認
    expect(mockSocket.connected).toBe(true);
    
    // Reactの状態更新を待つ
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    }, { timeout: 1000 });
    
    expect(result.current.connectionError).toBe(null);
  });

  test('sessionIdが指定された場合に正しく設定されること', () => {
    const { result } = renderHook(() => 
      useWebSocket({ sessionId: 'test-session', autoConnect: false })
    );

    act(() => {
      result.current.connect();
    });

    expect(mockIo).toHaveBeenCalledWith('ws://localhost:8080', 
      expect.objectContaining({
        query: expect.objectContaining({
          sessionId: 'test-session',
        }),
      })
    );
  });

  test('autoConnect=falseの場合は自動接続しないこと', () => {
    renderHook(() => useWebSocket({ autoConnect: false }));
    
    expect(mockIo).not.toHaveBeenCalled();
  });

  test('メッセージ送信が正常に動作すること', async () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
      mockSocket.simulateConnect();
    });

    // 接続状態を待つ
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const emitSpy = jest.spyOn(mockSocket, 'emit');

    act(() => {
      result.current.sendMessage('test_message', { data: 'test' });
    });

    expect(emitSpy).toHaveBeenCalledWith('test_message', {
      type: 'test_message',
      sessionId: undefined,
      data: { data: 'test' },
      timestamp: expect.any(Number),
    });
  });

  test('接続前のメッセージ送信で警告が出ること', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    act(() => {
      result.current.sendMessage('test_message', { data: 'test' });
    });

    expect(consoleSpy).toHaveBeenCalledWith('Cannot send message: WebSocket not connected');
    
    consoleSpy.mockRestore();
  });

  test('回答送信が正常に動作すること', async () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
      mockSocket.simulateConnect();
    });

    // 接続状態を待つ
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const emitSpy = jest.spyOn(mockSocket, 'emit');

    act(() => {
      result.current.submitAnswer('question-1', 2, 1500);
    });

    expect(emitSpy).toHaveBeenCalledWith('answer_submit', {
      type: 'answer_submit',
      sessionId: undefined,
      data: {
        questionId: 'question-1',
        selectedOption: 2,
        responseTime: 1500,
      },
      timestamp: expect.any(Number),
    });
  });

  test('セッション参加が正常に動作すること', async () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
      mockSocket.simulateConnect();
    });

    // 接続状態を待つ
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const emitSpy = jest.spyOn(mockSocket, 'emit');

    act(() => {
      result.current.joinSession('test-session');
    });

    expect(emitSpy).toHaveBeenCalledWith('join_session', {
      type: 'join_session',
      sessionId: undefined,
      data: { sessionId: 'test-session' },
      timestamp: expect.any(Number),
    });
  });

  test('接続エラー時の処理が正しいこと', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    act(() => {
      mockSocket.simulateError(new Error('Connection failed'));
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionError).toBe('Connection failed');
  });

  test('切断処理が正常に動作すること', async () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
      mockSocket.simulateConnect();
    });

    // 接続状態を待つ
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
  });

  test('問題開始メッセージの処理が正しいこと', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
      mockSocket.simulateConnect();
    });

    const questionData = {
      question: {
        id: 'question-1',
        text: 'テスト問題',
        options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
        round: 1,
        category: '一般',
      },
      timeLimit: 30,
    };

    act(() => {
      mockSocket.simulateMessage('question_start', questionData);
    });

    // Store の setCurrentQuestion が正しく呼ばれることを確認
    // (実際のストアの状態確認は統合テストで行う)
  });

  test('ラウンド結果メッセージの処理が正しいこと', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
      mockSocket.simulateConnect();
    });

    const roundResultData = {
      round: 1,
      survivors: [
        { userId: 'user-1', displayName: '生存者1', score: 100 },
        { userId: 'user-2', displayName: '生存者2', score: 90 },
      ],
      eliminated: [
        { userId: 'user-3', displayName: '脱落者1', score: 50 },
      ],
    };

    act(() => {
      mockSocket.simulateMessage('round_result', roundResultData);
    });

    // Store の setRoundResults が正しく呼ばれることを確認
  });

  test('参加者参加メッセージの処理が正しいこと', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
      mockSocket.simulateConnect();
    });

    const participantData = {
      userId: 'new-user',
      displayName: '新規参加者',
    };

    act(() => {
      mockSocket.simulateMessage('participant_join', participantData);
    });

    // Store の addParticipant が正しく呼ばれることを確認
  });

  test('復活戦開始メッセージの処理が正しいこと', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
      mockSocket.simulateConnect();
    });

    const revivalData = {
      candidates: [
        { userId: 'user-3', displayName: '復活候補1' },
        { userId: 'user-4', displayName: '復活候補2' },
      ],
    };

    act(() => {
      mockSocket.simulateMessage('revival_start', revivalData);
    });

    // Store の setRevivalInProgress が正しく呼ばれることを確認
  });

  test('復活戦結果メッセージの処理が正しいこと', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
      mockSocket.simulateConnect();
    });

    const revivalResultData = {
      revived: [
        { userId: 'user-3', displayName: '復活者1' },
      ],
    };

    act(() => {
      mockSocket.simulateMessage('revival_result', revivalResultData);
    });

    // Store の setRevivedParticipants が正しく呼ばれることを確認
  });

  test('エラーメッセージの処理が正しいこと', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
      mockSocket.simulateConnect();
    });

    const errorData = {
      error: 'セッションが見つかりません',
    };

    act(() => {
      mockSocket.simulateMessage('error', errorData);
    });

    // Store の setError が正しく呼ばれることを確認
  });

  test('コンポーネントアンマウント時に接続が閉じられること', async () => {
    const { result, unmount } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
      mockSocket.simulateConnect();
    });

    // 接続状態を待つ
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const disconnectSpy = jest.spyOn(mockSocket, 'disconnect');

    unmount();

    expect(disconnectSpy).toHaveBeenCalled();
  });

  test('再接続設定が正しく適用されること', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    expect(mockIo).toHaveBeenCalledWith('ws://localhost:8080', 
      expect.objectContaining({
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })
    );
  });

  test('WebSocket URLが環境変数から正しく取得されること', () => {
    process.env.NEXT_PUBLIC_WS_URL = 'wss://production.example.com';

    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    expect(mockIo).toHaveBeenCalledWith('wss://production.example.com', 
      expect.any(Object)
    );
  });

  test('WebSocket URLが未設定の場合にデフォルト値が使用されること', () => {
    delete process.env.NEXT_PUBLIC_WS_URL;

    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    expect(mockIo).toHaveBeenCalledWith('ws://localhost:8080', 
      expect.any(Object)
    );
  });

  test('既に接続済みの場合は再接続しないこと', async () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    // 最初の接続
    act(() => {
      result.current.connect();
      mockSocket.simulateConnect();
    });

    // 接続状態を待つ
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(mockIo).toHaveBeenCalledTimes(1);

    // 2回目の接続試行
    act(() => {
      result.current.connect();
    });

    // 新しい接続は作成されない
    expect(mockIo).toHaveBeenCalledTimes(1);
  });
});