import { render, screen } from '@testing-library/react';
import { Loading } from '../Loading';

describe('Loading Component', () => {
  test('デフォルトサイズで正常にレンダリングされること', () => {
    render(<Loading />);
    
    const container = screen.getByRole('status');
    const spinner = container.querySelector('[aria-hidden="true"]');
    expect(spinner).toHaveClass('h-8', 'w-8', 'animate-spin');
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  test('テキストが表示されること', () => {
    const text = '読み込み中です...';
    render(<Loading text={text} />);
    
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByText(text)).toHaveClass('text-sm', 'text-gray-600');
  });

  test('小さいサイズが正しく適用されること', () => {
    render(<Loading size="sm" />);
    
    const container = screen.getByRole('status');
    const spinner = container.querySelector('[aria-hidden="true"]');
    expect(spinner).toHaveClass('h-4', 'w-4');
  });

  test('大きいサイズが正しく適用されること', () => {
    render(<Loading size="lg" />);
    
    const container = screen.getByRole('status');
    const spinner = container.querySelector('[aria-hidden="true"]');
    expect(spinner).toHaveClass('h-12', 'w-12');
  });

  test('カスタムクラス名が適用されること', () => {
    const customClass = 'custom-loading';
    render(<Loading className={customClass} />);
    
    const container = screen.getByRole('status');
    expect(container).toHaveClass(customClass);
  });

  test('テキストなしでも正常に動作すること', () => {
    render(<Loading />);
    
    const container = screen.getByRole('status');
    expect(container).toBeInTheDocument();
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  test('全てのサイズバリエーションが正しく動作すること', () => {
    const { rerender } = render(<Loading size="sm" />);
    
    let container = screen.getByRole('status');
    let spinner = container.querySelector('[aria-hidden="true"]');
    expect(spinner).toHaveClass('h-4', 'w-4');
    
    rerender(<Loading size="md" />);
    container = screen.getByRole('status');
    spinner = container.querySelector('[aria-hidden="true"]');
    expect(spinner).toHaveClass('h-8', 'w-8');
    
    rerender(<Loading size="lg" />);
    container = screen.getByRole('status');
    spinner = container.querySelector('[aria-hidden="true"]');
    expect(spinner).toHaveClass('h-12', 'w-12');
  });
});