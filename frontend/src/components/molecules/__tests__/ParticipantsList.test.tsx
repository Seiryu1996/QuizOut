import { render, screen } from '@testing-library/react';
import { ParticipantsList } from '../ParticipantsList';
import { Participant } from '@/types/quiz';

// StatusBadgeコンポーネントのモック
jest.mock('@/components/atoms/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => (
    <span data-testid={`status-badge-${status}`} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${status === 'active' ? 'success' : status === 'eliminated' ? 'danger' : 'primary'}-100 text-${status === 'active' ? 'success' : status === 'eliminated' ? 'danger' : 'primary'}-800`}>
      {status === 'active' ? 'アクティブ' : status === 'eliminated' ? '脱落' : '復活'}
    </span>
  )
}));

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
      joinedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '3',
      userId: 'user3', 
      displayName: '参加者3',
      status: 'revived',
      score: 40,
      correctAnswers: 2,
      joinedAt: '2024-01-01T00:00:00Z'
    }
  ];

  test('参加者一覧が正常に表示されること', () => {
    render(<ParticipantsList participants={mockParticipants} />);
    
    // タイトルの確認
    expect(screen.getByText('参加者一覧')).toBeInTheDocument();
    expect(screen.getByText('3人参加中')).toBeInTheDocument();
    
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

  test('ステータスバッジが表示されること', () => {
    render(<ParticipantsList participants={mockParticipants} />);
    
    // ステータスバッジの確認
    expect(screen.getByTestId('status-badge-active')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-eliminated')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-revived')).toBeInTheDocument();
  });

  test('スコア情報が表示されること', () => {
    render(<ParticipantsList participants={mockParticipants} />);
    
    expect(screen.getByText('100pt (5問正解)')).toBeInTheDocument();
    expect(screen.getByText('60pt (3問正解)')).toBeInTheDocument();
    expect(screen.getByText('40pt (2問正解)')).toBeInTheDocument();
  });

  test('空の参加者リストが適切に処理されること', () => {
    render(<ParticipantsList participants={[]} />);
    
    expect(screen.getByText('参加者がいません')).toBeInTheDocument();
    expect(screen.getByText('0人参加中')).toBeInTheDocument();
  });

  test('参加者の並び順が正しいこと（ステータス＞スコア順）', () => {
    // 意図的に順序を変えた参加者リスト
    const unorderedParticipants: Participant[] = [
      {
        id: '2',
        userId: 'user2',
        displayName: '参加者2',
        status: 'eliminated',
        score: 60,
        correctAnswers: 3,
        joinedAt: '2024-01-01T00:00:00Z'
      },
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
        id: '3',
        userId: 'user3',
        displayName: '参加者3',
        status: 'revived',
        score: 40,
        correctAnswers: 2,
        joinedAt: '2024-01-01T00:00:00Z'
      }
    ];

    const { container } = render(<ParticipantsList participants={unorderedParticipants} />);
    
    // 参加者要素を取得（表示順序で）
    const participantElements = container.querySelectorAll('.space-y-2 > div');
    
    // 最初の要素（active）に参加者1が含まれること
    expect(participantElements[0]).toHaveTextContent('参加者1');
    expect(participantElements[0]).toHaveTextContent('アクティブ');
    
    // 2番目の要素（revived）に参加者3が含まれること
    expect(participantElements[1]).toHaveTextContent('参加者3');
    expect(participantElements[1]).toHaveTextContent('復活');
    
    // 3番目の要素（eliminated）に参加者2が含まれること
    expect(participantElements[2]).toHaveTextContent('参加者2');
    expect(participantElements[2]).toHaveTextContent('脱落');
  });

  test('現在のユーザーがハイライトされること', () => {
    const { container } = render(<ParticipantsList participants={mockParticipants} currentUserId="user1" />);
    
    // 現在のユーザーの要素を取得
    const currentUserElement = container.querySelector('.border-primary-200.bg-primary-50');
    expect(currentUserElement).toBeInTheDocument();
    expect(currentUserElement).toHaveTextContent('参加者1');
    expect(currentUserElement).toHaveTextContent('(あなた)');
  });

  test('現在のユーザーのアバターが特別な色になること', () => {
    const { container } = render(<ParticipantsList participants={mockParticipants} currentUserId="user1" />);
    
    // 現在のユーザーのアバターを取得
    const currentUserAvatar = container.querySelector('.bg-primary-500.text-white');
    expect(currentUserAvatar).toBeInTheDocument();
    expect(currentUserAvatar).toHaveTextContent('参');
  });

  test('maxDisplayで表示数が制限されること', () => {
    render(<ParticipantsList participants={mockParticipants} maxDisplay={2} />);
    
    // 最初の2人だけ表示される
    expect(screen.getByText('参加者1')).toBeInTheDocument();
    expect(screen.getByText('参加者3')).toBeInTheDocument(); // revivedなので2番目
    
    // 残りの人数が表示される
    expect(screen.getByText('他 1人')).toBeInTheDocument();
  });

  test('スコアが0の参加者はスコア情報が表示されないこと', () => {
    const participantsWithZeroScore: Participant[] = [
      {
        id: '1',
        userId: 'user1',
        displayName: '参加者1',
        status: 'active',
        score: 0,
        correctAnswers: 0,
        joinedAt: '2024-01-01T00:00:00Z'
      }
    ];

    render(<ParticipantsList participants={participantsWithZeroScore} />);
    
    expect(screen.getByText('参加者1')).toBeInTheDocument();
    expect(screen.queryByText('0pt (0問正解)')).not.toBeInTheDocument();
  });

  test('カスタムクラス名が適用されること', () => {
    const { container } = render(
      <ParticipantsList participants={mockParticipants} className="custom-class" />
    );
    
    const listContainer = container.firstChild;
    expect(listContainer).toHaveClass('card');
    expect(listContainer).toHaveClass('custom-class');
  });

  test('参加者名の最初の文字がアバターに表示されること', () => {
    const { container } = render(<ParticipantsList participants={mockParticipants} />);
    
    // 各参加者のアバターを確認
    const avatars = container.querySelectorAll('.w-8.h-8.rounded-full');
    expect(avatars[0]).toHaveTextContent('参'); // 参加者1の「参」
    expect(avatars[1]).toHaveTextContent('参'); // 参加者3の「参」
    expect(avatars[2]).toHaveTextContent('参'); // 参加者2の「参」
  });
});