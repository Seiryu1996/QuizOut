import { render, screen } from '@testing-library/react';
import { SessionHeader } from '../SessionHeader';
import { Session } from '@/types/quiz';

const mockSession: Session = {
  id: 'session-1',
  title: 'テストクイズセッション',
  status: 'active',
  currentRound: 3,
  maxRounds: 10,
  settings: {
    timeLimit: 30,
    revivalEnabled: true,
    revivalCount: 2,
    minParticipants: 2,
    maxParticipants: 20,
    autoStart: false,
    shuffleQuestions: true,
    showCorrectAnswer: true,
    allowSpectators: false
  },
  createdBy: 'admin-1',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01')
};

describe('SessionHeader Component', () => {
  const defaultProps = {
    session: mockSession,
    participantCount: 15,
    connectionStatus: 'connected' as const,
  };

  test('セッション情報が正しく表示されること', () => {
    render(<SessionHeader {...defaultProps} />);
    
    expect(screen.getByText('テストクイズセッション')).toBeInTheDocument();
    expect(screen.getByText('ラウンド 3')).toBeInTheDocument();
    expect(screen.getByText('参加者 15人')).toBeInTheDocument();
    expect(screen.getByText('制限時間 30秒')).toBeInTheDocument();
  });

  test('ステータスバッジが表示されること', () => {
    render(<SessionHeader {...defaultProps} />);
    
    // StatusBadgeコンポーネントが使用されている
    expect(screen.getByText('参加中')).toBeInTheDocument();
  });

  test('接続状態が「接続中」で正しく表示されること', () => {
    render(<SessionHeader {...defaultProps} connectionStatus="connected" />);
    
    expect(screen.getByText('🟢')).toBeInTheDocument();
    expect(screen.getByText('接続中')).toBeInTheDocument();
  });

  test('接続状態が「切断」で正しく表示されること', () => {
    render(<SessionHeader {...defaultProps} connectionStatus="disconnected" />);
    
    expect(screen.getByText('🔴')).toBeInTheDocument();
    expect(screen.getByText('切断')).toBeInTheDocument();
  });

  test('接続状態が「接続中...」で正しく表示されること', () => {
    render(<SessionHeader {...defaultProps} connectionStatus="connecting" />);
    
    expect(screen.getByText('🟡')).toBeInTheDocument();
    expect(screen.getByText('接続中...')).toBeInTheDocument();
  });

  test('敗者復活戦が有効な場合の表示', () => {
    render(<SessionHeader {...defaultProps} />);
    
    expect(screen.getByText('💫 敗者復活戦あり（最大2人復活可能）')).toBeInTheDocument();
  });

  test('敗者復活戦が無効な場合は表示されないこと', () => {
    const sessionWithoutRevival = {
      ...mockSession,
      settings: {
        ...mockSession.settings,
        revivalEnabled: false,
      },
    };
    
    render(
      <SessionHeader 
        {...defaultProps} 
        session={sessionWithoutRevival} 
      />
    );
    
    expect(screen.queryByText(/敗者復活戦あり/)).not.toBeInTheDocument();
  });

  test('カスタムクラス名が適用されること', () => {
    const { container } = render(
      <SessionHeader {...defaultProps} className="custom-header" />
    );
    
    expect(container.firstChild).toHaveClass('custom-header');
  });

  test('セッションタイトルが長い場合のトランケート', () => {
    const longTitleSession = {
      ...mockSession,
      title: 'とても長いタイトルのクイズセッションでテキストがオーバーフローする可能性があります',
    };
    
    render(
      <SessionHeader 
        {...defaultProps} 
        session={longTitleSession} 
      />
    );
    
    const titleElement = screen.getByText(longTitleSession.title);
    expect(titleElement).toHaveClass('truncate');
  });

  test('異なるセッションステータスでの表示', () => {
    const eliminatedSession = {
      ...mockSession,
      status: 'eliminated' as const,
    };
    
    render(
      <SessionHeader 
        {...defaultProps} 
        session={eliminatedSession} 
      />
    );
    
    expect(screen.getByText('脱落')).toBeInTheDocument();
  });

  test('参加者数が0の場合も正しく表示されること', () => {
    render(<SessionHeader {...defaultProps} participantCount={0} />);
    
    expect(screen.getByText('参加者 0人')).toBeInTheDocument();
  });

  test('参加者数が大きい場合も正しく表示されること', () => {
    render(<SessionHeader {...defaultProps} participantCount={999} />);
    
    expect(screen.getByText('参加者 999人')).toBeInTheDocument();
  });

  test('レスポンシブレイアウトのクラスが適用されること', () => {
    const { container } = render(<SessionHeader {...defaultProps} />);
    
    const flexContainer = container.querySelector('.flex.flex-col.sm\\:flex-row');
    expect(flexContainer).toBeInTheDocument();
    expect(flexContainer).toHaveClass('sm:items-center', 'sm:justify-between');
  });

  test('セッション情報とステータスが同じ行に配置されること', () => {
    render(<SessionHeader {...defaultProps} />);
    
    const titleElement = screen.getByText('テストクイズセッション');
    const statusElement = screen.getByText('参加中');
    
    // 両方の要素が存在することを確認
    expect(titleElement).toBeInTheDocument();
    expect(statusElement).toBeInTheDocument();
    
    // 同じコンテナ内にあることを確認
    const container = titleElement.closest('.flex.items-center.space-x-3');
    expect(container).toContainElement(statusElement);
  });

  test('すべての接続状態の設定が正しく動作すること', () => {
    const connectionStates = [
      { status: 'connected' as const, icon: '🟢', text: '接続中', className: 'text-success-600' },
      { status: 'disconnected' as const, icon: '🔴', text: '切断', className: 'text-danger-600' },
      { status: 'connecting' as const, icon: '🟡', text: '接続中...', className: 'text-warning-600' },
    ];

    connectionStates.forEach(({ status, icon, text, className }) => {
      const { unmount } = render(
        <SessionHeader {...defaultProps} connectionStatus={status} />
      );
      
      expect(screen.getByText(icon)).toBeInTheDocument();
      expect(screen.getByText(text)).toBeInTheDocument();
      
      const textElement = screen.getByText(text);
      expect(textElement).toHaveClass(className);
      
      unmount();
    });
  });
});