import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { AccessCodeForm } from '../AccessCodeForm';
import { useAccessCode } from '@/hooks/useAccessCode';

// モック化
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/useAccessCode', () => ({
  useAccessCode: jest.fn(),
}));

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAccessCode = useAccessCode as jest.MockedFunction<typeof useAccessCode>;

describe('AccessCodeForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);
  });

  test('正常にレンダリングされること', () => {
    mockUseAccessCode.mockReturnValue({
      isVerifying: false,
      error: null,
      isVerified: false,
      verifyAccessCode: jest.fn(),
      clearError: jest.fn(),
    });

    render(<AccessCodeForm />);

    expect(screen.getByText('QuizOut')).toBeInTheDocument();
    expect(screen.getByText('アクセスコードを入力してください')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('アクセスコードを入力')).toBeInTheDocument();
    expect(screen.getByText('確認')).toBeInTheDocument();
  });

  test('アクセスコードの入力が正常に動作すること', () => {
    mockUseAccessCode.mockReturnValue({
      isVerifying: false,
      error: null,
      isVerified: false,
      verifyAccessCode: jest.fn(),
      clearError: jest.fn(),
    });

    render(<AccessCodeForm />);
    
    const input = screen.getByPlaceholderText('アクセスコードを入力');
    fireEvent.change(input, { target: { value: 'test123' } });
    
    expect(input).toHaveValue('TEST123'); // 大文字に変換される
  });

  test('フォーム送信が正常に動作すること', async () => {
    const mockVerifyAccessCode = jest.fn().mockResolvedValue(true);
    mockUseAccessCode.mockReturnValue({
      isVerifying: false,
      error: null,
      isVerified: false,
      verifyAccessCode: mockVerifyAccessCode,
      clearError: jest.fn(),
    });

    render(<AccessCodeForm />);
    
    const input = screen.getByPlaceholderText('アクセスコードを入力');
    const button = screen.getByText('確認');
    
    fireEvent.change(input, { target: { value: 'VALID123' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockVerifyAccessCode).toHaveBeenCalledWith('VALID123');
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  test('エラーメッセージが表示されること', () => {
    const errorMessage = '無効なアクセスコードです';
    mockUseAccessCode.mockReturnValue({
      isVerifying: false,
      error: errorMessage,
      isVerified: false,
      verifyAccessCode: jest.fn(),
      clearError: jest.fn(),
    });

    render(<AccessCodeForm />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('ローディング状態が正しく表示されること', () => {
    mockUseAccessCode.mockReturnValue({
      isVerifying: true,
      error: null,
      isVerified: false,
      verifyAccessCode: jest.fn(),
      clearError: jest.fn(),
    });

    render(<AccessCodeForm />);
    
    expect(screen.getByText('確認中...')).toBeInTheDocument();
    
    const input = screen.getByPlaceholderText('アクセスコードを入力');
    const button = screen.getByRole('button');
    
    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });

  test('空のコードでボタンが無効化されること', () => {
    mockUseAccessCode.mockReturnValue({
      isVerifying: false,
      error: null,
      verifyAccessCode: jest.fn(),
      clearError: jest.fn(),
    });

    render(<AccessCodeForm />);
    
    const button = screen.getByText('確認');
    expect(button).toBeDisabled();
  });

  test('カスタムonSuccessコールバックが呼ばれること', async () => {
    const mockOnSuccess = jest.fn();
    const mockVerifyAccessCode = jest.fn().mockResolvedValue(true);
    mockUseAccessCode.mockReturnValue({
      isVerifying: false,
      error: null,
      isVerified: false,
      verifyAccessCode: mockVerifyAccessCode,
      clearError: jest.fn(),
    });

    render(<AccessCodeForm onSuccess={mockOnSuccess} />);
    
    const input = screen.getByPlaceholderText('アクセスコードを入力');
    const button = screen.getByText('確認');
    
    fireEvent.change(input, { target: { value: 'VALID123' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith('VALID123');
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  test('エラーがあるときに入力するとエラーがクリアされること', () => {
    const mockClearError = jest.fn();
    mockUseAccessCode.mockReturnValue({
      isVerifying: false,
      error: 'エラーメッセージ',
      isVerified: false,
      verifyAccessCode: jest.fn(),
      clearError: mockClearError,
    });

    render(<AccessCodeForm />);
    
    const input = screen.getByPlaceholderText('アクセスコードを入力');
    fireEvent.change(input, { target: { value: 'NEW123' } });
    
    expect(mockClearError).toHaveBeenCalled();
  });
});
