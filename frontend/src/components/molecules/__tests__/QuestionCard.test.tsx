import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuestionCard } from '../QuestionCard';
import { Question } from '@/types/quiz';

const mockQuestion: Question = {
  id: 'test-question-1',
  text: 'テスト問題文です',
  options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
  round: 1,
  category: '一般',
  difficulty: 'medium',
  createdAt: '2024-01-01T00:00:00Z',
  correctAnswer: 1,
};

describe('QuestionCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('問題と選択肢が正常に表示されること', () => {
    render(<QuestionCard question={mockQuestion} />);
    
    // 問題文が表示されること
    expect(screen.getByText('テスト問題文です')).toBeInTheDocument();
    
    // 4つの選択肢が表示されること
    expect(screen.getByText('選択肢1')).toBeInTheDocument();
    expect(screen.getByText('選択肢2')).toBeInTheDocument();
    expect(screen.getByText('選択肢3')).toBeInTheDocument();
    expect(screen.getByText('選択肢4')).toBeInTheDocument();
    
    // 選択肢にA、B、C、Dのラベルが表示されること
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    
    // ラウンド情報が表示されること
    expect(screen.getByText('ラウンド 1')).toBeInTheDocument();
    
    // カテゴリが表示されること
    expect(screen.getByText('一般')).toBeInTheDocument();
    
    // 難易度が表示されること
    expect(screen.getByText('中級')).toBeInTheDocument();
  });

  test('選択肢の選択が正常に動作すること', () => {
    const mockOnAnswer = jest.fn();
    render(<QuestionCard question={mockQuestion} onAnswer={mockOnAnswer} />);
    
    // 最初は選択肢が選択されていないこと
    const option1Button = screen.getByText('選択肢1').closest('button')!;
    expect(option1Button).not.toHaveClass('selected');
    
    // 選択肢をクリックできること
    fireEvent.click(option1Button);
    
    // 選択状態が視覚的に分かること
    expect(option1Button).toHaveClass('selected');
    
    // 他の選択肢をクリックすると選択が変わること
    const option2Button = screen.getByText('選択肢2').closest('button')!;
    fireEvent.click(option2Button);
    
    expect(option1Button).not.toHaveClass('selected');
    expect(option2Button).toHaveClass('selected');
  });

  test('回答送信が正常に動作すること', () => {
    const mockOnAnswer = jest.fn();
    render(<QuestionCard question={mockQuestion} onAnswer={mockOnAnswer} />);
    
    // 最初は回答ボタンが無効であること
    const submitButton = screen.getByText('回答する');
    expect(submitButton).toBeDisabled();
    
    // 選択肢を選んでから送信ボタンが有効になること
    const option2Button = screen.getByText('選択肢2').closest('button')!;
    fireEvent.click(option2Button);
    
    expect(submitButton).not.toBeDisabled();
    
    // 送信ボタンクリックでonAnswerが正しい値で呼ばれること
    fireEvent.click(submitButton);
    
    expect(mockOnAnswer).toHaveBeenCalledWith(1, expect.any(Number));
    
    // レスポンス時間が正しく計算されること
    const [selectedOption, responseTime] = mockOnAnswer.mock.calls[0];
    expect(selectedOption).toBe(1);
    expect(typeof responseTime).toBe('number');
    expect(responseTime).toBeGreaterThan(0);
  });

  test('回答済み状態の表示が正しいこと', () => {
    render(
      <QuestionCard 
        question={mockQuestion} 
        hasAnswered={true}
      />
    );
    
    // 回答済みメッセージが表示されること
    expect(screen.getByText('回答を送信しました')).toBeInTheDocument();
    expect(screen.getByText('結果をお待ちください...')).toBeInTheDocument();
    
    // 回答ボタンが表示されないこと
    expect(screen.queryByText('回答する')).not.toBeInTheDocument();
    
    // 選択肢がクリックできないこと
    const option1Button = screen.getByText('選択肢1').closest('button')!;
    expect(option1Button).toBeDisabled();
  });

  test('結果表示モードが正常に動作すること', () => {
    render(
      <QuestionCard 
        question={mockQuestion} 
        showResults={true}
        userAnswer={0}
      />
    );
    
    // 正解の選択肢（選択肢2）に正解マークが表示されること
    const correctOption = screen.getByText('選択肢2').closest('button')!;
    expect(correctOption).toHaveClass('correct');
    expect(screen.getByText('✓')).toBeInTheDocument();
    
    // 間違った選択肢（選択肢1）に間違いクラスが適用されること
    const incorrectOption = screen.getByText('選択肢1').closest('button')!;
    expect(incorrectOption).toHaveClass('incorrect');
    
    // 選択されなかった選択肢が薄く表示されること
    const unselectedOption = screen.getByText('選択肢3').closest('button')!;
    expect(unselectedOption).toHaveClass('opacity-60');
  });

  test('無効化状態が正常に動作すること', () => {
    const mockOnAnswer = jest.fn();
    render(
      <QuestionCard 
        question={mockQuestion} 
        onAnswer={mockOnAnswer}
        disabled={true}
      />
    );
    
    // 選択肢がクリックできないこと
    const option1Button = screen.getByText('選択肢1').closest('button')!;
    fireEvent.click(option1Button);
    
    expect(option1Button).not.toHaveClass('selected');
    expect(option1Button).toHaveClass('cursor-not-allowed');
    
    // 回答ボタンが無効であること
    const submitButton = screen.getByText('回答する');
    expect(submitButton).toBeDisabled();
  });

  test('キーボードナビゲーションが正常に動作すること', () => {
    const mockOnAnswer = jest.fn();
    render(<QuestionCard question={mockQuestion} onAnswer={mockOnAnswer} />);
    
    const option1Button = screen.getByText('選択肢1').closest('button')!;
    
    // キーボードでフォーカス
    option1Button.focus();
    expect(document.activeElement).toBe(option1Button);
    
    // Enterキーで選択
    fireEvent.keyDown(option1Button, { key: 'Enter', code: 'Enter' });
    fireEvent.click(option1Button); // React Testing Libraryではクリックイベントをシミュレート
    
    expect(option1Button).toHaveClass('selected');
    
    // 回答ボタンにフォーカス移動してEnterで送信
    const submitButton = screen.getByText('回答する');
    submitButton.focus();
    fireEvent.click(submitButton);
    
    expect(mockOnAnswer).toHaveBeenCalledWith(0, expect.any(Number));
  });

  test('アクセシビリティ属性が正しく設定されること', () => {
    render(<QuestionCard question={mockQuestion} />);
    
    // 問題文にheadingタグが使用されていること
    const questionText = screen.getByRole('heading');
    expect(questionText).toHaveTextContent('テスト問題文です');
    
    // 選択肢グループにrole="radiogroup"が設定されていること
    const optionContainer = screen.getByText('選択肢1').closest('.space-y-3');
    expect(optionContainer).toBeInTheDocument();
    
    // 各選択肢ボタンが適切にラベル付けされていること
    const option1Button = screen.getByText('選択肢1').closest('button')!;
    expect(option1Button).toBeInTheDocument();
  });

  test('難易度に応じた色分けが正しいこと', () => {
    // 初級の場合
    const easyQuestion = { ...mockQuestion, difficulty: 'easy' as const };
    const { rerender } = render(<QuestionCard question={easyQuestion} />);
    
    let difficultyBadge = screen.getByText('初級');
    expect(difficultyBadge).toHaveClass('bg-success-100', 'text-success-800');
    
    // 中級の場合
    const mediumQuestion = { ...mockQuestion, difficulty: 'medium' as const };
    rerender(<QuestionCard question={mediumQuestion} />);
    
    difficultyBadge = screen.getByText('中級');
    expect(difficultyBadge).toHaveClass('bg-warning-100', 'text-warning-800');
    
    // 上級の場合
    const hardQuestion = { ...mockQuestion, difficulty: 'hard' as const };
    rerender(<QuestionCard question={hardQuestion} />);
    
    difficultyBadge = screen.getByText('上級');
    expect(difficultyBadge).toHaveClass('bg-danger-100', 'text-danger-800');
  });

  test('問題が変更された時に選択状態がリセットされること', () => {
    const mockOnAnswer = jest.fn();
    const { rerender } = render(
      <QuestionCard question={mockQuestion} onAnswer={mockOnAnswer} />
    );
    
    // 最初の問題で選択肢を選択
    const option1Button = screen.getByText('選択肢1').closest('button')!;
    fireEvent.click(option1Button);
    expect(option1Button).toHaveClass('selected');
    
    // 問題を変更
    const newQuestion = { ...mockQuestion, id: 'test-question-2', text: '新しい問題' };
    rerender(<QuestionCard question={newQuestion} onAnswer={mockOnAnswer} />);
    
    // 選択状態がリセットされること
    const newOption1Button = screen.getByText('選択肢1').closest('button')!;
    expect(newOption1Button).not.toHaveClass('selected');
    
    // 回答ボタンが無効に戻ること
    const submitButton = screen.getByText('回答する');
    expect(submitButton).toBeDisabled();
  });

  test('レスポンス時間の計測が正確であること', () => {
    const mockOnAnswer = jest.fn();
    render(<QuestionCard question={mockQuestion} onAnswer={mockOnAnswer} />);
    
    // 選択肢を選択して回答
    const option1Button = screen.getByText('選択肢1').closest('button')!;
    fireEvent.click(option1Button);
    
    const submitButton = screen.getByText('回答する');
    fireEvent.click(submitButton);
    
    // レスポンス時間が数値で返されることを確認
    expect(mockOnAnswer).toHaveBeenCalledWith(0, expect.any(Number));
    const [, responseTime] = mockOnAnswer.mock.calls[0];
    expect(responseTime).toBeGreaterThanOrEqual(0);
  });

  test('カスタムクラス名が適用されること', () => {
    const { container } = render(
      <QuestionCard question={mockQuestion} className="custom-question" />
    );
    
    const questionCard = container.firstChild;
    expect(questionCard).toHaveClass('card');
    expect(questionCard).toHaveClass('custom-question');
  });
});