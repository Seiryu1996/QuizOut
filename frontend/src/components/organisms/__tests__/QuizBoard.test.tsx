import { render, screen, fireEvent } from '@testing-library/react';
import { QuizBoard } from '../QuizBoard';
import { Question } from '@/types/quiz';

const mockQuestion: Question = {
  id: 'q1',
  text: 'テスト問題',
  options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
  round: 1,
  category: 'general',
  difficulty: 'medium',
  createdAt: '2023-01-01T00:00:00Z',
  correctAnswer: 1
};

describe('QuizBoard Component', () => {
  const defaultProps = {
    question: mockQuestion,
    timeRemaining: 15,
    totalTime: 30,
    onAnswer: jest.fn(),
    hasAnswered: false,
    showResults: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('正常にレンダリングされること', () => {
    render(<QuizBoard {...defaultProps} />);
    
    expect(screen.getByText('テスト問題')).toBeInTheDocument();
    expect(screen.getByText('選択肢1')).toBeInTheDocument();
    expect(screen.getByText('選択肢2')).toBeInTheDocument();
    expect(screen.getByText('選択肢3')).toBeInTheDocument();
    expect(screen.getByText('選択肢4')).toBeInTheDocument();
  });

  test('タイマーが表示されること', () => {
    render(<QuizBoard {...defaultProps} />);
    
    // タイマーコンポーネントが描画されることを確認
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  test('ローディング状態が正しく表示されること', () => {
    render(<QuizBoard {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('問題を読み込み中...')).toBeInTheDocument();
    expect(screen.queryByText('テスト問題')).not.toBeInTheDocument();
  });

  test('問題がない場合の表示', () => {
    render(<QuizBoard {...defaultProps} question={null} />);
    
    expect(screen.getByText('問題の準備中')).toBeInTheDocument();
    expect(screen.getByText('次の問題をお待ちください')).toBeInTheDocument();
    expect(screen.getByText('🎯')).toBeInTheDocument();
  });

  test('回答機能が動作すること', () => {
    const mockOnAnswer = jest.fn();
    
    render(<QuizBoard {...defaultProps} onAnswer={mockOnAnswer} />);
    
    const option1Button = screen.getByRole('button', { name: /選択肢1/ });
    fireEvent.click(option1Button);
    
    expect(mockOnAnswer).toHaveBeenCalledTimes(1);
    expect(mockOnAnswer).toHaveBeenCalledWith(0, expect.any(Number));
  });

  test('時間切れメッセージが表示されること', () => {
    render(
      <QuizBoard 
        {...defaultProps} 
        timeRemaining={0} 
        hasAnswered={false} 
        showResults={false} 
      />
    );
    
    expect(screen.getByText('⏰ 時間切れです')).toBeInTheDocument();
    expect(screen.getByText('結果発表をお待ちください')).toBeInTheDocument();
  });

  test('時間切れ時は選択肢が無効になること', () => {
    render(<QuizBoard {...defaultProps} timeRemaining={0} />);
    
    const option1Button = screen.getByRole('button', { name: /選択肢1/ });
    expect(option1Button).toBeDisabled();
  });

  test('回答済みの場合は選択肢が無効になること', () => {
    render(<QuizBoard {...defaultProps} hasAnswered={true} />);
    
    const option1Button = screen.getByRole('button', { name: /選択肢1/ });
    expect(option1Button).toBeDisabled();
  });

  test('結果表示時の動作', () => {
    render(
      <QuizBoard 
        {...defaultProps} 
        showResults={true} 
        userAnswer={1} 
        hasAnswered={true} 
      />
    );
    
    // 結果が表示されている状態での動作確認
    // QuestionCardの結果表示機能がテストされる
    expect(screen.getByText('テスト問題')).toBeInTheDocument();
  });

  test('カスタムクラス名が適用されること', () => {
    const { container } = render(
      <QuizBoard {...defaultProps} className="custom-quiz-board" />
    );
    
    expect(container.firstChild).toHaveClass('custom-quiz-board');
  });

  test('時間切れでも回答済みの場合は時間切れメッセージが表示されないこと', () => {
    render(
      <QuizBoard 
        {...defaultProps} 
        timeRemaining={0} 
        hasAnswered={true} 
        showResults={false} 
      />
    );
    
    expect(screen.queryByText('⏰ 時間切れです')).not.toBeInTheDocument();
  });

  test('結果表示中は時間切れメッセージが表示されないこと', () => {
    render(
      <QuizBoard 
        {...defaultProps} 
        timeRemaining={0} 
        hasAnswered={false} 
        showResults={true} 
      />
    );
    
    expect(screen.queryByText('⏰ 時間切れです')).not.toBeInTheDocument();
  });

  test('ローディング状態でカスタムクラスが適用されること', () => {
    const { container } = render(
      <QuizBoard {...defaultProps} isLoading={true} className="custom-loading" />
    );
    
    expect(container.firstChild).toHaveClass('custom-loading');
  });

  test('問題なし状態でカスタムクラスが適用されること', () => {
    const { container } = render(
      <QuizBoard {...defaultProps} question={null} className="custom-no-question" />
    );
    
    expect(container.firstChild).toHaveClass('custom-no-question');
  });

  test('タイマーのプロパティが正しく渡されること', () => {
    render(<QuizBoard {...defaultProps} timeRemaining={10} totalTime={60} />);
    
    // タイマーに正しい値が渡されていることを確認
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  test('QuestionCardに正しいプロパティが渡されること', () => {
    const mockOnAnswer = jest.fn();
    
    render(
      <QuizBoard 
        {...defaultProps} 
        onAnswer={mockOnAnswer}
        hasAnswered={true}
        showResults={true}
        userAnswer={2}
        timeRemaining={0}
      />
    );
    
    // QuestionCardが正しく描画されていることを確認
    expect(screen.getByText('テスト問題')).toBeInTheDocument();
    
    // 選択肢がすべて無効になっていることを確認（timeRemaining <= 0）
    const options = screen.getAllByRole('button');
    options.forEach(button => {
      if (button.textContent?.includes('選択肢')) {
        expect(button).toBeDisabled();
      }
    });
  });
});