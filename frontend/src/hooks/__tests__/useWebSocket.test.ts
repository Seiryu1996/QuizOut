import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';

// WebSocket をモック化
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  public readyState = MockWebSocket.CONNECTING;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    // 非同期で接続状態をオープンに変更
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 100);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // テスト用のメソッド
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

(global as any).WebSocket = MockWebSocket;

describe('useWebSocket Hook', () => {
  const defaultProps = {
    sessionId: 'test-session',
    autoConnect: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('初期状態が正しいこと', () => {
    const { result } = renderHook(() => useWebSocket(defaultProps));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionError).toBe(null);
    expect(typeof result.current.sendMessage).toBe('function');
    expect(typeof result.current.submitAnswer).toBe('function');
  });

  test('WebSocket接続が正常に確立されること', async () => {
    const { result } = renderHook(() => useWebSocket(defaultProps));

    // 接続完了を待つ
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionError).toBe(null);
  });

  test('autoConnect=falseの場合は自動接続しないこと', () => {
    const { result } = renderHook(() => 
      useWebSocket({ ...defaultProps, autoConnect: false })
    );

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current.isConnected).toBe(false);
  });

  test('メッセージ送信が正常に動作すること', async () => {
    const { result } = renderHook(() => useWebSocket(defaultProps));

    // 接続完了を待つ
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    const testMessage = { type: 'test', data: 'hello' };

    act(() => {
      result.current.sendMessage(testMessage);
    });

    // エラーが発生しないことを確認
    expect(result.current.connectionError).toBe(null);
  });

  test('接続前のメッセージ送信でエラーが設定されること', () => {
    const { result } = renderHook(() => useWebSocket(defaultProps));

    const testMessage = { type: 'test', data: 'hello' };

    act(() => {
      result.current.sendMessage(testMessage);
    });

    expect(result.current.connectionError).toBe('WebSocket接続が確立されていません');
  });

  test('メッセージ受信時のコールバックが呼ばれること', async () => {
    const mockOnMessage = jest.fn();
    const { result } = renderHook(() => 
      useWebSocket({ ...defaultProps, onMessage: mockOnMessage })
    );

    let ws: MockWebSocket;
    await act(async () => {
      jest.advanceTimersByTime(200);
      ws = (global as any).lastWebSocket;
    });

    const testMessage = { type: 'question', data: { id: '1', text: 'Test?' } };

    act(() => {
      ws!.simulateMessage(testMessage);
    });

    expect(mockOnMessage).toHaveBeenCalledWith(testMessage);
  });

  test('回答送信が正常に動作すること', async () => {
    const { result } = renderHook(() => useWebSocket(defaultProps));

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    act(() => {
      result.current.submitAnswer('question-1', 2, 1500);
    });

    expect(result.current.connectionError).toBe(null);
  });

  test('接続エラー時の処理が正しいこと', async () => {
    const { result } = renderHook(() => useWebSocket(defaultProps));

    let ws: MockWebSocket;
    await act(async () => {
      jest.advanceTimersByTime(100);
      ws = (global as any).lastWebSocket;
    });

    act(() => {
      ws!.simulateError();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionError).toBe('WebSocket接続エラーが発生しました');
  });

  test('再接続処理が正常に動作すること', async () => {
    const { result } = renderHook(() => useWebSocket(defaultProps));

    let ws: MockWebSocket;
    await act(async () => {
      jest.advanceTimersByTime(200);
      ws = (global as any).lastWebSocket;
    });

    expect(result.current.isConnected).toBe(true);

    // 接続を切断
    act(() => {
      ws!.simulateClose();
    });

    expect(result.current.isConnected).toBe(false);

    // 再接続タイマーを進める
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    // 新しい接続が確立される
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current.isConnected).toBe(true);
  });

  test('再接続回数の制限が正しいこと', async () => {
    const { result } = renderHook(() => useWebSocket(defaultProps));

    // 最初の接続
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    // 5回接続を切断して再接続を試行
    for (let i = 0; i < 5; i++) {
      let ws: MockWebSocket = (global as any).lastWebSocket;
      
      act(() => {
        ws.simulateClose();
      });

      await act(async () => {
        jest.advanceTimersByTime(3000);
        jest.advanceTimersByTime(200);
      });
    }

    // 6回目の切断
    let ws: MockWebSocket = (global as any).lastWebSocket;
    act(() => {
      ws.simulateClose();
    });

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.connectionError).toBe('再接続の試行回数が上限に達しました');
  });

  test('カスタムイベントハンドラーが正常に動作すること', async () => {
    const mockOnQuestion = jest.fn();
    const mockOnResult = jest.fn();
    const mockOnEliminated = jest.fn();

    const { result } = renderHook(() => 
      useWebSocket({
        ...defaultProps,
        onQuestion: mockOnQuestion,
        onResult: mockOnResult,
        onEliminated: mockOnEliminated,
      })
    );

    let ws: MockWebSocket;
    await act(async () => {
      jest.advanceTimersByTime(200);
      ws = (global as any).lastWebSocket;
    });

    // 問題受信
    act(() => {
      ws!.simulateMessage({ type: 'question', data: { id: '1', text: 'Test?' } });
    });
    expect(mockOnQuestion).toHaveBeenCalled();

    // 結果受信
    act(() => {
      ws!.simulateMessage({ type: 'result', data: { correct: true } });
    });
    expect(mockOnResult).toHaveBeenCalled();

    // 脱落通知受信
    act(() => {
      ws!.simulateMessage({ type: 'eliminated', data: { userId: 'user1' } });
    });
    expect(mockOnEliminated).toHaveBeenCalled();
  });

  test('sessionIdの変更で再接続されること', async () => {
    const { result, rerender } = renderHook(
      ({ sessionId }) => useWebSocket({ sessionId, autoConnect: true }),
      { initialProps: { sessionId: 'session1' } }
    );

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current.isConnected).toBe(true);

    // sessionIdを変更
    rerender({ sessionId: 'session2' });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current.isConnected).toBe(true);
  });

  test('コンポーネントアンマウント時に接続が閉じられること', async () => {
    const { unmount } = renderHook(() => useWebSocket(defaultProps));

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    const ws: MockWebSocket = (global as any).lastWebSocket;
    const closeSpy = jest.spyOn(ws, 'close');

    unmount();

    expect(closeSpy).toHaveBeenCalled();
  });

  test('無効なJSONメッセージの処理が正しいこと', async () => {
    const mockOnMessage = jest.fn();
    const { result } = renderHook(() => 
      useWebSocket({ ...defaultProps, onMessage: mockOnMessage })
    );

    let ws: MockWebSocket;
    await act(async () => {
      jest.advanceTimersByTime(200);
      ws = (global as any).lastWebSocket;
    });

    // 無効なJSONを送信
    act(() => {
      if (ws!.onmessage) {
        ws!.onmessage(new MessageEvent('message', { data: 'invalid json' }));
      }
    });

    expect(mockOnMessage).not.toHaveBeenCalled();
    expect(result.current.connectionError).toBe('メッセージの解析に失敗しました');
  });

  test('接続状態の変化が正しく追跡されること', async () => {
    const { result } = renderHook(() => useWebSocket(defaultProps));

    // 初期状態
    expect(result.current.isConnected).toBe(false);

    // 接続中
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // 接続完了
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.isConnected).toBe(true);

    // 切断
    const ws: MockWebSocket = (global as any).lastWebSocket;
    act(() => {
      ws.simulateClose();
    });

    expect(result.current.isConnected).toBe(false);
  });
});

// グローバルなWebSocketの参照を保持するためのヘルパー
(global as any).lastWebSocket = null;
const OriginalWebSocket = (global as any).WebSocket;
(global as any).WebSocket = class extends OriginalWebSocket {
  constructor(...args: any[]) {
    super(...args);
    (global as any).lastWebSocket = this;
  }
};