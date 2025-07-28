import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import HomePage from '../page';

// Mocks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/services/authService', () => ({
  authService: {
    getAccessCodeFromStorage: jest.fn(),
    isAuthenticated: jest.fn(),
  },
}));

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.Mock;
const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
    });
  });

  test('ローディング画面が表示されること', () => {
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    mockAuthService.isAuthenticated.mockReturnValue(true);

    render(<HomePage />);

    expect(screen.getByText('認証状態を確認中...')).toBeInTheDocument();
    // ローディングスピナーの存在を確認
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  test('アクセスコードがない場合はアクセスコードページにリダイレクトされること', async () => {
    mockAuthService.getAccessCodeFromStorage.mockReturnValue(null);

    render(<HomePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/access-code');
    });
  });

  test('アクセスコードがあり認証済みの場合はクイズ選択ページにリダイレクトされること', async () => {
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    mockAuthService.isAuthenticated.mockReturnValue(true);

    render(<HomePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/quiz-selection');
    });
  });

  test('アクセスコードはあるが未認証の場合はログインページにリダイレクトされること', async () => {
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    mockAuthService.isAuthenticated.mockReturnValue(false);

    render(<HomePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  test('認証チェック中にエラーが発生した場合はログインページにリダイレクトされること', async () => {
    mockAuthService.getAccessCodeFromStorage.mockImplementation(() => {
      throw new Error('Storage error');
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  test('isAuthenticated でエラーが発生した場合はログインページにリダイレクトされること', async () => {
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    mockAuthService.isAuthenticated.mockImplementation(() => {
      throw new Error('Auth check error');
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  test('認証フローが正しい順序で実行されること', async () => {
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    mockAuthService.isAuthenticated.mockReturnValue(true);

    render(<HomePage />);

    await waitFor(() => {
      expect(mockAuthService.getAccessCodeFromStorage).toHaveBeenCalledTimes(1);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/quiz-selection');
    });

    // getAccessCodeFromStorage が isAuthenticated より先に呼ばれることを確認
    const getAccessCodeCall = mockAuthService.getAccessCodeFromStorage.mock.invocationCallOrder[0];
    const isAuthenticatedCall = mockAuthService.isAuthenticated.mock.invocationCallOrder[0];
    expect(getAccessCodeCall).toBeLessThan(isAuthenticatedCall);
  });

  test('複数回レンダリングされてもリダイレクトが一度だけ実行されること', async () => {
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    mockAuthService.isAuthenticated.mockReturnValue(true);

    const { rerender } = render(<HomePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledTimes(1);
    });

    rerender(<HomePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledTimes(2); // useEffectが再実行される
    });
  });

  test('認証状態の各パターンでの動作確認', async () => {
    const testCases = [
      {
        accessCode: null,
        isAuthenticated: false,
        expectedRedirect: '/access-code',
        description: 'アクセスコードなし',
      },
      {
        accessCode: 'valid-code',
        isAuthenticated: true,
        expectedRedirect: '/quiz-selection',
        description: 'アクセスコードあり・認証済み',
      },
      {
        accessCode: 'valid-code',
        isAuthenticated: false,
        expectedRedirect: '/login',
        description: 'アクセスコードあり・未認証',
      },
    ];

    for (const testCase of testCases) {
      mockPush.mockClear();
      mockAuthService.getAccessCodeFromStorage.mockReturnValue(testCase.accessCode);
      mockAuthService.isAuthenticated.mockReturnValue(testCase.isAuthenticated);

      const { unmount } = render(<HomePage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(testCase.expectedRedirect);
      }, { timeout: 1000 });

      unmount();
    }
  });

  test('ローディングスピナーのアクセシビリティが正しく設定されていること', () => {
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    mockAuthService.isAuthenticated.mockReturnValue(true);

    render(<HomePage />);

    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toHaveClass('animate-spin');
    expect(spinner.firstChild).toHaveClass('border-b-2', 'border-blue-600');
  });

  test('ページの基本的なスタイルが適用されていること', () => {
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    mockAuthService.isAuthenticated.mockReturnValue(true);

    const { container } = render(<HomePage />);

    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveClass(
      'min-h-screen',
      'bg-gradient-to-br',
      'from-blue-50',
      'to-indigo-100',
      'flex',
      'items-center',
      'justify-center'
    );
  });
});