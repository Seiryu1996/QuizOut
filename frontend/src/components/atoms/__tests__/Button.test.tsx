import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button Component', () => {
  test('正常にレンダリングされること', () => {
    render(<Button>テストボタン</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('テストボタン');
  });

  test('クリックイベントが正常に動作すること', () => {
    const mockOnClick = jest.fn();
    render(<Button onClick={mockOnClick}>クリック</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  test('disabled時はクリックできないこと', () => {
    const mockOnClick = jest.fn();
    render(
      <Button onClick={mockOnClick} disabled>
        無効ボタン
      </Button>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  test('ローディング状態が正常に表示されること', () => {
    render(<Button loading>ローディング</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    expect(button.querySelector('.animate-spin')).toBeInTheDocument();
  });

  test('サイズプロパティが正しく適用されること', () => {
    const { rerender } = render(<Button size="sm">小さいボタン</Button>);
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
    
    rerender(<Button size="lg">大きいボタン</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('px-6', 'py-3', 'text-lg');
  });

  test('variantプロパティが正しく適用されること', () => {
    const { rerender } = render(<Button variant="primary">プライマリ</Button>);
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary-500', 'hover:bg-primary-600');
    
    rerender(<Button variant="secondary">セカンダリ</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gray-200', 'hover:bg-gray-300');

    rerender(<Button variant="danger">危険</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-danger-500', 'hover:bg-danger-600');
  });

  test('カスタムクラス名が適用されること', () => {
    render(<Button className="custom-class">カスタム</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  test('type属性が正しく設定されること', () => {
    const { rerender } = render(<Button type="submit">送信</Button>);
    
    let button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
    
    rerender(<Button type="reset">リセット</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'reset');
  });


  test('アクセシビリティ属性が正しく設定されること', () => {
    render(
      <Button 
        aria-label="閉じる"
        aria-describedby="description"
      >
        ×
      </Button>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', '閉じる');
    expect(button).toHaveAttribute('aria-describedby', 'description');
  });

});