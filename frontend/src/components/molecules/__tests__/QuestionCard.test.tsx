import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuestionCard } from '../QuestionCard';
import { Question } from '@/types/quiz';

describe('QuestionCard Component', () => {
  const mockQuestion: Question = {
    id: '1',
    text: 'テスト問題文です',
    options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
    round: 1,
    category: '一般',
    difficulty: 'medium',
    createdAt: '2024-01-01T00:00:00Z',
    correctAnswer: 0
  };

  const defaultProps = {
    question: mockQuestion,
    onAnswerSelect: jest.fn(),
    onSubmit: jest.fn(),
    selectedOption: null,
    hasAnswered: false,
    timeRemaining: 30,
    isLoading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('問題と選択肢が正常に表示されること', () => {
    render(<QuestionCard {...defaultProps} />);
    
    // 問題文が表示されること
    expect(screen.getByText('テスト問題文です')).toBeInTheDocument();
    
    // 4つの選択肢が表示されること
    expect(screen.getByText('選択肢1')).toBeInTheDocument();
    expect(screen.getByText('選択肢2')).toBeInTheDocument();
    expect(screen.getByText('選択肢3')).toBeInTheDocument();
    expect(screen.getByText('選択肢4')).toBeInTheDocument();
    
    // ラジオボタンが表示されること
    const radioButtons = screen.getAllByRole('radio');
    expect(radioButtons).toHaveLength(4);
  });

  test('選択肢の選択が正常に動作すること', () => {
    const mockOnAnswerSelect = jest.fn();
    render(<QuestionCard {...defaultProps} onAnswerSelect={mockOnAnswerSelect} />);
    
    // 2番目の選択肢をクリック
    const secondOption = screen.getByLabelText('選択肢2');
    fireEvent.click(secondOption);
    
    expect(mockOnAnswerSelect).toHaveBeenCalledWith(1);
  });

  test('選択状態が視覚的に分かること', () => {
    render(<QuestionCard {...defaultProps} selectedOption={1} />);
    
    const selectedOption = screen.getByLabelText('選択肢2');
    expect(selectedOption).toBeChecked();
    
    const unselectedOption = screen.getByLabelText('選択肢1');
    expect(unselectedOption).not.toBeChecked();
  });

  test('回答送信が正常に動作すること', async () => {
    const mockOnSubmit = jest.fn();
    render(<QuestionCard {...defaultProps} selectedOption={0} onSubmit={mockOnSubmit} />);
    
    // 送信ボタンが有効になっていること
    const submitButton = screen.getByText('回答する');
    expect(submitButton).not.toBeDisabled();
    
    // 送信ボタンをクリック
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(0);
    });
  });

  test('選択肢を選んでから送信ボタンが有効になること', () => {
    const { rerender } = render(<QuestionCard {...defaultProps} />);
    
    // 初期状態では送信ボタンが無効
    let submitButton = screen.getByText('回答する');
    expect(submitButton).toBeDisabled();
    
    // 選択肢を選択
    rerender(<QuestionCard {...defaultProps} selectedOption={0} />);
    
    // 送信ボタンが有効になる
    submitButton = screen.getByText('回答する');
    expect(submitButton).not.toBeDisabled();
  });

  test('送信後は選択肢が無効になること', () => {
    render(<QuestionCard {...defaultProps} hasAnswered={true} selectedOption={0} />);
    
    // すべてのラジオボタンが無効
    const radioButtons = screen.getAllByRole('radio');
    radioButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
    
    // 送信ボタンも無効
    const submitButton = screen.getByText('回答済み');
    expect(submitButton).toBeDisabled();
  });

  test('ローディング状態が正しく表示されること', () => {
    render(<QuestionCard {...defaultProps} isLoading={true} selectedOption={0} />);
    
    // 送信ボタンにローディング表示
    const submitButton = screen.getByText('送信中...');
    expect(submitButton).toBeDisabled();
    
    // 選択肢も無効化
    const radioButtons = screen.getAllByRole('radio');
    radioButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  test('問題カテゴリと難易度が表示されること', () => {
    render(<QuestionCard {...defaultProps} />);
    
    expect(screen.getByText('一般')).toBeInTheDocument();
    expect(screen.getByText('中級')).toBeInTheDocument();
  });

  test('ラウンド情報が表示されること', () => {
    render(<QuestionCard {...defaultProps} />);
    
    expect(screen.getByText('第1ラウンド')).toBeInTheDocument();
  });

  test('時間切れの場合の表示が正しいこと', () => {
    render(<QuestionCard {...defaultProps} timeRemaining={0} />);
    
    // 時間切れメッセージ
    expect(screen.getByText('時間切れ')).toBeInTheDocument();
    
    // すべての操作が無効化
    const radioButtons = screen.getAllByRole('radio');
    radioButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
    
    const submitButton = screen.getByText('時間切れ');
    expect(submitButton).toBeDisabled();
  });

  test('キーボード操作が正常に動作すること', () => {
    const mockOnAnswerSelect = jest.fn();
    render(<QuestionCard {...defaultProps} onAnswerSelect={mockOnAnswerSelect} />);
    
    const firstOption = screen.getByLabelText('選択肢1');
    
    // キーボードでフォーカス
    firstOption.focus();
    expect(firstOption).toHaveFocus();
    
    // Spaceキーで選択
    fireEvent.keyDown(firstOption, { key: ' ', code: 'Space' });
    expect(mockOnAnswerSelect).toHaveBeenCalledWith(0);
  });

  test('アクセシビリティ属性が正しく設定されること', () => {
    render(<QuestionCard {...defaultProps} />);
    
    // 問題文にheading role
    const questionText = screen.getByText('テスト問題文です');
    expect(questionText.closest('[role="heading"]')).toBeInTheDocument();
    
    // 選択肢グループにradiogroup role
    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toBeInTheDocument();
    expect(radioGroup).toHaveAttribute('aria-label', '回答選択肢');
  });

  test('正解表示モードが正常に動作すること', () => {
    const questionWithCorrectAnswer = {
      ...mockQuestion,
      correctAnswer: 1
    };
    
    render(
      <QuestionCard 
        {...defaultProps} 
        question={questionWithCorrectAnswer}
        hasAnswered={true}
        selectedOption={0}
        showCorrectAnswer={true}
      />
    );
    
    // 正解の選択肢にマーク
    const correctOption = screen.getByText('選択肢2').closest('label');
    expect(correctOption).toHaveClass('bg-green-100');
    
    // 間違った選択肢にマーク
    const wrongOption = screen.getByText('選択肢1').closest('label');
    expect(wrongOption).toHaveClass('bg-red-100');
  });
});