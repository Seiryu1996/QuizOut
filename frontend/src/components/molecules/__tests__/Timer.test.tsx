import { render, screen } from '@testing-library/react';
import { Timer } from '../Timer';

describe('Timer Component', () => {
  test('時間が正しく表示されること', () => {
    render(<Timer timeRemaining={30} totalTime={30} />);
    
    // 時間の表示確認
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('残り時間')).toBeInTheDocument();
  });

  test('時間切れ時の表示が正しいこと', () => {
    render(<Timer timeRemaining={0} totalTime={30} />);
    
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('時間切れ')).toBeInTheDocument();
  });

  test('プログレスバーの幅が正しく計算されること', () => {
    const { container } = render(<Timer timeRemaining={15} totalTime={30} />);
    
    // プログレスバーの幅は50%になるはず
    const progressBar = container.querySelector('.h-2.rounded-full.transition-all');
    expect(progressBar).toHaveStyle('width: 50%');
  });

  test('低い時間での警告色が適用されること', () => {
    const { container } = render(<Timer timeRemaining={3} totalTime={30} />);
    
    // 5秒以下で警告色とアニメーションが適用される
    const timeDisplay = container.querySelector('.text-4xl.font-bold');
    expect(timeDisplay).toHaveClass('text-warning-600');
    expect(timeDisplay).toHaveClass('animate-pulse');
  });

  test('時間切れ時の危険色が適用されること', () => {
    const { container } = render(<Timer timeRemaining={0} totalTime={30} />);
    
    const timeDisplay = container.querySelector('.text-4xl.font-bold');
    expect(timeDisplay).toHaveClass('text-danger-600');
  });

  test('通常時の色が適用されること', () => {
    const { container } = render(<Timer timeRemaining={20} totalTime={30} />);
    
    const timeDisplay = container.querySelector('.text-4xl.font-bold');
    expect(timeDisplay).toHaveClass('text-primary-600');
  });

  test('プログレスバーの色が時間に応じて変わること', () => {
    // 40%より大きい：緑色
    const { container: container1 } = render(<Timer timeRemaining={25} totalTime={30} />);
    let progressBar = container1.querySelector('.h-2.rounded-full.transition-all');
    expect(progressBar).toHaveClass('bg-success-500');

    // 50%は40%より大きいので緑色
    const { container: container2 } = render(<Timer timeRemaining={15} totalTime={30} />);
    progressBar = container2.querySelector('.h-2.rounded-full.transition-all');
    expect(progressBar).toHaveClass('bg-success-500');

    // 21-40%：黄色
    const { container: container3 } = render(<Timer timeRemaining={10} totalTime={30} />);
    progressBar = container3.querySelector('.h-2.rounded-full.transition-all');
    expect(progressBar).toHaveClass('bg-warning-500');

    // 20%以下：赤色
    const { container: container4 } = render(<Timer timeRemaining={5} totalTime={30} />);
    progressBar = container4.querySelector('.h-2.rounded-full.transition-all');
    expect(progressBar).toHaveClass('bg-danger-500');
  });

  test('カスタムクラス名が適用されること', () => {
    const { container } = render(<Timer timeRemaining={30} totalTime={30} className="custom-timer" />);
    
    const timerContainer = container.firstChild;
    expect(timerContainer).toHaveClass('custom-timer');
    expect(timerContainer).toHaveClass('text-center');
  });

  test('プログレスバーが負の値にならないこと', () => {
    const { container } = render(<Timer timeRemaining={-5} totalTime={30} />);
    
    const progressBar = container.querySelector('.h-2.rounded-full.transition-all');
    expect(progressBar).toHaveStyle('width: 0%');
  });

  test('totalTime が 0 の場合にエラーが発生しないこと', () => {
    expect(() => {
      render(<Timer timeRemaining={0} totalTime={0} />);
    }).not.toThrow();
    
    // プログレスバーは0%になるはず
    const { container } = render(<Timer timeRemaining={0} totalTime={0} />);
    const progressBar = container.querySelector('.h-2.rounded-full.transition-all');
    expect(progressBar).toHaveStyle('width: 0%');
  });
});