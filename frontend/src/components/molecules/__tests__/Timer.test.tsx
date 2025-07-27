import { render, screen, act } from '@testing-library/react';
import { Timer } from '../Timer';

// タイマーのテストでsetIntervalをモック化
jest.useFakeTimers();

describe('Timer Component', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  test('制限時間が正常にカウントダウンされること', () => {
    const mockOnTimeUp = jest.fn();
    render(<Timer initialTime={30} onTimeUp={mockOnTimeUp} />);
    
    // 初期値確認
    expect(screen.getByText('00:30')).toBeInTheDocument();
    
    // 1秒経過
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('00:29')).toBeInTheDocument();
    
    // 5秒経過
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(screen.getByText('00:25')).toBeInTheDocument();
  });

  test('0になったらonTimeUpが呼ばれること', () => {
    const mockOnTimeUp = jest.fn();
    render(<Timer initialTime={3} onTimeUp={mockOnTimeUp} />);
    
    // 3秒経過させる
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(mockOnTimeUp).toHaveBeenCalledTimes(1);
  });

  test('時間フォーマットが正しいこと', () => {
    const { rerender } = render(<Timer initialTime={65} />);
    
    // 1分5秒
    expect(screen.getByText('01:05')).toBeInTheDocument();
    
    // 10分30秒をテスト
    rerender(<Timer initialTime={630} />);
    expect(screen.getByText('10:30')).toBeInTheDocument();
    
    // 1分未満をテスト
    rerender(<Timer initialTime={45} />);
    expect(screen.getByText('00:45')).toBeInTheDocument();
  });

  test('10秒未満で警告色になること', () => {
    render(<Timer initialTime={15} />);
    
    let timer = screen.getByTestId('timer');
    expect(timer).not.toHaveClass('text-red-600');
    
    // 6秒経過させて9秒にする
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    
    timer = screen.getByTestId('timer');
    expect(timer).toHaveClass('text-red-600');
    expect(screen.getByText('00:09')).toBeInTheDocument();
  });

  test('一時停止機能が正常に動作すること', () => {
    const { rerender } = render(<Timer initialTime={30} isPaused={false} />);
    
    // 2秒経過
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByText('00:28')).toBeInTheDocument();
    
    // 一時停止
    rerender(<Timer initialTime={30} isPaused={true} />);
    
    // さらに2秒経過しても時間は進まない
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByText('00:28')).toBeInTheDocument();
  });

  test('リセット機能が正常に動作すること', () => {
    const { rerender } = render(<Timer initialTime={30} key="timer1" />);
    
    // 5秒経過
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByText('00:25')).toBeInTheDocument();
    
    // キーを変更してリセット
    rerender(<Timer initialTime={30} key="timer2" />);
    expect(screen.getByText('00:30')).toBeInTheDocument();
  });

  test('0秒で開始した場合即座にonTimeUpが呼ばれること', () => {
    const mockOnTimeUp = jest.fn();
    render(<Timer initialTime={0} onTimeUp={mockOnTimeUp} />);
    
    expect(screen.getByText('00:00')).toBeInTheDocument();
    
    // 次のティックで呼ばれることを確認
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    expect(mockOnTimeUp).toHaveBeenCalledTimes(1);
  });

  test('コンポーネントのアンマウント時にタイマーがクリアされること', () => {
    const { unmount } = render(<Timer initialTime={30} />);
    
    // タイマーが動作中であることを確認
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('00:29')).toBeInTheDocument();
    
    // コンポーネントをアンマウント
    unmount();
    
    // タイマーがクリアされていることを確認（エラーが発生しないこと）
    act(() => {
      jest.advanceTimersByTime(5000);
    });
  });

  test('カスタムクラス名が適用されること', () => {
    render(<Timer initialTime={30} className="custom-timer" />);
    
    const timer = screen.getByTestId('timer');
    expect(timer).toHaveClass('custom-timer');
  });

  test('アクセシビリティ属性が正しく設定されること', () => {
    render(<Timer initialTime={30} />);
    
    const timer = screen.getByTestId('timer');
    expect(timer).toHaveAttribute('role', 'timer');
    expect(timer).toHaveAttribute('aria-label', '残り時間');
  });
});