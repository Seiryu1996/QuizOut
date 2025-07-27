import { render, screen } from '@testing-library/react';
import { ParticipantsList } from '../ParticipantsList';
import { Participant } from '@/types/quiz';

describe('ParticipantsList Component', () => {
  const mockParticipants: Participant[] = [
    {
      id: '1',
      userId: 'user1',
      displayName: '参加者1',
      status: 'active',
      score: 100,
      correctAnswers: 5,
      joinedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '2', 
      userId: 'user2',
      displayName: '参加者2',
      status: 'eliminated',
      score: 60,
      correctAnswers: 3,
      joinedAt: '2024-01-01T00:00:00Z',
      eliminatedAt: '2024-01-01T01:00:00Z'
    },
    {
      id: '3',
      userId: 'user3', 
      displayName: '参加者3',
      status: 'revived',
      score: 40,
      correctAnswers: 2,
      joinedAt: '2024-01-01T00:00:00Z',
      eliminatedAt: '2024-01-01T01:00:00Z',
      revivedAt: '2024-01-01T02:00:00Z'
    }
  ];

  test('参加者一覧が正常に表示されること', () => {
    render(<ParticipantsList participants={mockParticipants} />);
    
    // 全参加者が表示されること
    expect(screen.getByText('参加者1')).toBeInTheDocument();
    expect(screen.getByText('参加者2')).toBeInTheDocument();
    expect(screen.getByText('参加者3')).toBeInTheDocument();
  });

  test('各参加者の名前が表示されること', () => {
    render(<ParticipantsList participants={mockParticipants} />);
    
    mockParticipants.forEach(participant => {
      expect(screen.getByText(participant.displayName)).toBeInTheDocument();
    });
  });

  test('ステータスに応じたアイコンが表示されること', () => {
    render(<ParticipantsList participants={mockParticipants} />);
    
    // アクティブ参加者のアイコン
    const activeIcon = screen.getByTestId('status-active-1');
    expect(activeIcon).toBeInTheDocument();
    expect(activeIcon).toHaveClass('text-green-500');
    
    // 脱落者のアイコン
    const eliminatedIcon = screen.getByTestId('status-eliminated-2');
    expect(eliminatedIcon).toBeInTheDocument();
    expect(eliminatedIcon).toHaveClass('text-red-500');
    
    // 復活者のアイコン
    const revivedIcon = screen.getByTestId('status-revived-3');
    expect(revivedIcon).toBeInTheDocument();
    expect(revivedIcon).toHaveClass('text-blue-500');
  });

  test('参加者数が正しく表示されること', () => {
    render(<ParticipantsList participants={mockParticipants} showStats={true} />);
    
    // 総参加者数
    expect(screen.getByText('総参加者: 3人')).toBeInTheDocument();
    
    // アクティブ参加者数
    expect(screen.getByText('アクティブ: 1人')).toBeInTheDocument();
    
    // 脱落者数  
    expect(screen.getByText('脱落: 1人')).toBeInTheDocument();
    
    // 復活者数
    expect(screen.getByText('復活: 1人')).toBeInTheDocument();
  });

  test('スコア情報が表示されること', () => {
    render(<ParticipantsList participants={mockParticipants} showScore={true} />);
    
    expect(screen.getByText('100pt')).toBeInTheDocument();
    expect(screen.getByText('60pt')).toBeInTheDocument();
    expect(screen.getByText('40pt')).toBeInTheDocument();
  });

  test('正解数が表示されること', () => {
    render(<ParticipantsList participants={mockParticipants} showCorrectAnswers={true} />);
    
    expect(screen.getByText('5問正解')).toBeInTheDocument();
    expect(screen.getByText('3問正解')).toBeInTheDocument();
    expect(screen.getByText('2問正解')).toBeInTheDocument();
  });

  test('空の参加者リストが適切に処理されること', () => {
    render(<ParticipantsList participants={[]} showStats={true} />);
    
    expect(screen.getByText('参加者はいません')).toBeInTheDocument();
    expect(screen.getByText('総参加者: 0人')).toBeInTheDocument();
    expect(screen.getByText('アクティブ: 0人')).toBeInTheDocument();
  });

  test('参加者の並び順が正しいこと', () => {
    // スコア降順でソート
    render(<ParticipantsList participants={mockParticipants} sortBy="score" />);
    
    const participantNames = screen.getAllByTestId(/participant-name/);
    expect(participantNames[0]).toHaveTextContent('参加者1'); // 100pt
    expect(participantNames[1]).toHaveTextContent('参加者2'); // 60pt
    expect(participantNames[2]).toHaveTextContent('参加者3'); // 40pt
  });

  test('フィルタリング機能が正常に動作すること', () => {
    // アクティブ参加者のみ表示
    render(<ParticipantsList participants={mockParticipants} filterBy="active" />);
    
    expect(screen.getByText('参加者1')).toBeInTheDocument();
    expect(screen.queryByText('参加者2')).not.toBeInTheDocument();
    expect(screen.queryByText('参加者3')).not.toBeInTheDocument();
  });

  test('現在のユーザーがハイライトされること', () => {
    render(<ParticipantsList participants={mockParticipants} currentUserId="user1" />);
    
    const currentUserElement = screen.getByTestId('participant-1');
    expect(currentUserElement).toHaveClass('bg-blue-50', 'border-blue-200');
  });

  test('ランキング表示が正常に動作すること', () => {
    render(<ParticipantsList participants={mockParticipants} showRanking={true} />);
    
    expect(screen.getByText('1位')).toBeInTheDocument();
    expect(screen.getByText('2位')).toBeInTheDocument();
    expect(screen.getByText('3位')).toBeInTheDocument();
  });

  test('リアルタイム更新インジケーターが表示されること', () => {
    render(<ParticipantsList participants={mockParticipants} isUpdating={true} />);
    
    const updateIndicator = screen.getByTestId('update-indicator');
    expect(updateIndicator).toBeInTheDocument();
    expect(updateIndicator).toHaveClass('animate-pulse');
  });

  test('アクセシビリティ属性が正しく設定されること', () => {
    render(<ParticipantsList participants={mockParticipants} />);
    
    // リスト要素にrole属性
    const participantList = screen.getByRole('list');
    expect(participantList).toBeInTheDocument();
    expect(participantList).toHaveAttribute('aria-label', '参加者一覧');
    
    // 各参加者要素にlistitem role
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);
  });

  test('大量の参加者でも適切に表示されること', () => {
    const manyParticipants = Array.from({ length: 200 }, (_, i) => ({
      id: `${i + 1}`,
      userId: `user${i + 1}`,
      displayName: `参加者${i + 1}`,
      status: 'active' as const,
      score: Math.floor(Math.random() * 100),
      correctAnswers: Math.floor(Math.random() * 10),
      joinedAt: '2024-01-01T00:00:00Z'
    }));

    render(<ParticipantsList participants={manyParticipants} />);
    
    // 仮想化が適用されていることを確認（実装に依存）
    const participantList = screen.getByTestId('participants-list');
    expect(participantList).toBeInTheDocument();
  });

  test('検索機能が正常に動作すること', () => {
    render(<ParticipantsList participants={mockParticipants} searchQuery="参加者1" />);
    
    expect(screen.getByText('参加者1')).toBeInTheDocument();
    expect(screen.queryByText('参加者2')).not.toBeInTheDocument();
    expect(screen.queryByText('参加者3')).not.toBeInTheDocument();
  });

  test('ステータス変更アニメーションが表示されること', () => {
    const { rerender } = render(<ParticipantsList participants={mockParticipants} />);
    
    // ステータス変更
    const updatedParticipants = mockParticipants.map(p => 
      p.id === '1' ? { ...p, status: 'eliminated' as const } : p
    );
    
    rerender(<ParticipantsList participants={updatedParticipants} animateChanges={true} />);
    
    const changedParticipant = screen.getByTestId('participant-1');
    expect(changedParticipant).toHaveClass('animate-bounce');
  });
});