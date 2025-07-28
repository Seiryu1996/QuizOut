import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge Component', () => {
  test('activeステータスが正しく表示されること', () => {
    render(<StatusBadge status="active" />);
    
    const badge = screen.getByText('参加中');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-success-100', 'text-success-800');
  });

  test('eliminatedステータスが正しく表示されること', () => {
    render(<StatusBadge status="eliminated" />);
    
    const badge = screen.getByText('脱落');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-danger-100', 'text-danger-800');
  });

  test('revivedステータスが正しく表示されること', () => {
    render(<StatusBadge status="revived" />);
    
    const badge = screen.getByText('復活');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-warning-100', 'text-warning-800');
  });

  test('waitingステータスが正しく表示されること', () => {
    render(<StatusBadge status="waiting" />);
    
    const badge = screen.getByText('待機中');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  test('finishedステータスが正しく表示されること', () => {
    render(<StatusBadge status="finished" />);
    
    const badge = screen.getByText('終了');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  test('カスタムクラス名が適用されること', () => {
    const customClass = 'custom-badge';
    render(<StatusBadge status="active" className={customClass} />);
    
    const badge = screen.getByText('参加中');
    expect(badge).toHaveClass(customClass);
  });

  test('基本的なスタイルクラスが適用されること', () => {
    render(<StatusBadge status="active" />);
    
    const badge = screen.getByText('参加中');
    expect(badge).toHaveClass(
      'inline-flex',
      'items-center',
      'px-2.5',
      'py-0.5',
      'rounded-full',
      'text-xs',
      'font-medium'
    );
  });

  test('全てのステータスバリエーションが正しく動作すること', () => {
    const statuses = [
      { status: 'active' as const, label: '参加中', classes: 'bg-success-100 text-success-800' },
      { status: 'eliminated' as const, label: '脱落', classes: 'bg-danger-100 text-danger-800' },
      { status: 'revived' as const, label: '復活', classes: 'bg-warning-100 text-warning-800' },
      { status: 'waiting' as const, label: '待機中', classes: 'bg-gray-100 text-gray-800' },
      { status: 'finished' as const, label: '終了', classes: 'bg-blue-100 text-blue-800' },
    ];

    statuses.forEach(({ status, label, classes }) => {
      const { unmount } = render(<StatusBadge status={status} />);
      
      const badge = screen.getByText(label);
      expect(badge).toBeInTheDocument();
      
      const classArray = classes.split(' ');
      classArray.forEach(cls => {
        expect(badge).toHaveClass(cls);
      });
      
      unmount();
    });
  });
});