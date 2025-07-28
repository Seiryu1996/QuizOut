import { render, screen, fireEvent } from '@testing-library/react';
import { RoundResult } from '../RoundResult';
import { Participant } from '@/types/quiz';

const mockSurvivors: Participant[] = [
  {
    userId: '1',
    displayName: 'Alice',
    score: 85,
    status: 'active',
    isAdmin: false,
    joinedAt: new Date('2023-01-01')
  },
  {
    userId: '2',
    displayName: 'Bob',
    score: 78,
    status: 'active',
    isAdmin: false,
    joinedAt: new Date('2023-01-01')
  }
];

const mockEliminated: Participant[] = [
  {
    userId: '3',
    displayName: 'Charlie',
    score: 65,
    status: 'eliminated',
    isAdmin: false,
    joinedAt: new Date('2023-01-01')
  },
  {
    userId: '4',
    displayName: 'David',
    score: 45,
    status: 'eliminated',
    isAdmin: false,
    joinedAt: new Date('2023-01-01')
  }
];

describe('RoundResult Component', () => {
  test('基本的な結果表示が正常に動作すること', () => {
    render(
      <RoundResult
        survivors={mockSurvivors}
        eliminated={mockEliminated}
        round={3}
      />
    );

    expect(screen.getByText('ラウンド 3 結果発表')).toBeInTheDocument();
    expect(screen.getByText('勝ち残り (2人)')).toBeInTheDocument();
    expect(screen.getByText('脱落 (2人)')).toBeInTheDocument();
  });

  test('勝ち残り参加者が正しく表示されること', () => {
    render(
      <RoundResult
        survivors={mockSurvivors}
        eliminated={mockEliminated}
        round={1}
      />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('85pt')).toBeInTheDocument();
    expect(screen.getByText('78pt')).toBeInTheDocument();
  });

  test('脱落者が正しく表示されること', () => {
    render(
      <RoundResult
        survivors={mockSurvivors}
        eliminated={mockEliminated}
        round={1}
      />
    );

    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('David')).toBeInTheDocument();
    expect(screen.getByText('65pt')).toBeInTheDocument();
    expect(screen.getByText('45pt')).toBeInTheDocument();
  });

  test('統計情報が正しく表示されること', () => {
    render(
      <RoundResult
        survivors={mockSurvivors}
        eliminated={mockEliminated}
        round={1}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument(); // 勝ち残り数
    expect(screen.getByText('50%')).toBeInTheDocument(); // 生存率
  });

  test('現在のユーザーが勝ち残りの場合の表示', () => {
    render(
      <RoundResult
        survivors={mockSurvivors}
        eliminated={mockEliminated}
        currentUserId="1"
        round={1}
      />
    );

    expect(screen.getByText('🎉 おめでとうございます！次のラウンドに進出です！')).toBeInTheDocument();
    expect(screen.getByText('Alice (あなた)')).toBeInTheDocument();
    expect(screen.getByText('次のラウンドに向けて準備してください')).toBeInTheDocument();
  });

  test('現在のユーザーが脱落の場合の表示', () => {
    render(
      <RoundResult
        survivors={mockSurvivors}
        eliminated={mockEliminated}
        currentUserId="3"
        round={1}
      />
    );

    expect(screen.getByText('😞 残念！今回は脱落となりました')).toBeInTheDocument();
    expect(screen.getByText('Charlie (あなた)')).toBeInTheDocument();
    expect(screen.getByText('敗者復活戦の機会があるかもしれません！')).toBeInTheDocument();
  });

  test('ゲーム終了時のメッセージ表示', () => {
    const singleSurvivor = [mockSurvivors[0]];
    
    render(
      <RoundResult
        survivors={singleSurvivor}
        eliminated={mockEliminated}
        round={5}
      />
    );

    expect(screen.getByText('ゲーム終了！最終結果をお待ちください')).toBeInTheDocument();
  });

  test('続行ボタンが表示され動作すること', () => {
    const mockOnContinue = jest.fn();
    
    render(
      <RoundResult
        survivors={mockSurvivors}
        eliminated={mockEliminated}
        round={1}
        onContinue={mockOnContinue}
      />
    );

    const continueButton = screen.getByRole('button', { name: '続行' });
    expect(continueButton).toBeInTheDocument();
    
    fireEvent.click(continueButton);
    expect(mockOnContinue).toHaveBeenCalledTimes(1);
  });

  test('続行ボタンがない場合は表示されないこと', () => {
    render(
      <RoundResult
        survivors={mockSurvivors}
        eliminated={mockEliminated}
        round={1}
      />
    );

    expect(screen.queryByRole('button', { name: '続行' })).not.toBeInTheDocument();
  });

  test('カスタムクラス名が適用されること', () => {
    const { container } = render(
      <RoundResult
        survivors={mockSurvivors}
        eliminated={mockEliminated}
        round={1}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  test('勝ち残りのみの場合も正常に動作すること', () => {
    render(
      <RoundResult
        survivors={mockSurvivors}
        eliminated={[]}
        round={1}
      />
    );

    expect(screen.getByText('勝ち残り (2人)')).toBeInTheDocument();
    expect(screen.getByText('脱落 (0人)')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument(); // 生存率
  });

  test('脱落者のみの場合も正常に動作すること', () => {
    render(
      <RoundResult
        survivors={[]}
        eliminated={mockEliminated}
        round={1}
      />
    );

    expect(screen.getByText('勝ち残り (0人)')).toBeInTheDocument();
    expect(screen.getByText('脱落 (2人)')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument(); // 生存率
  });

  test('現在のユーザーの強調表示が正しく動作すること', () => {
    const { container } = render(
      <RoundResult
        survivors={mockSurvivors}
        eliminated={mockEliminated}
        currentUserId="1"
        round={1}
      />
    );

    // 現在のユーザーの要素に特別なスタイルが適用されているかチェック
    const userElement = screen.getByText('Alice (あなた)').closest('div');
    expect(userElement).toHaveClass('bg-success-200', 'font-semibold');
  });

  test('スクロール可能リストが長いリストで動作すること', () => {
    const longSurvivorsList = Array.from({ length: 20 }, (_, i) => ({
      userId: `user-${i}`,
      displayName: `User ${i}`,
      score: 50 + i,
      status: 'active' as const,
      isAdmin: false,
      joinedAt: new Date('2023-01-01')
    }));

    render(
      <RoundResult
        survivors={longSurvivorsList}
        eliminated={[]}
        round={1}
      />
    );

    expect(screen.getByText('勝ち残り (20人)')).toBeInTheDocument();
    
    // スクロール可能なコンテナが存在することを確認
    const scrollContainer = screen.getByText('User 0').closest('.overflow-y-auto');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer).toHaveClass('max-h-40');
  });
});