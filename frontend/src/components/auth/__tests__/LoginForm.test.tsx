import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '../LoginForm';
import { authService } from '@/services/authService';

// Mocks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/services/authService', () => ({
  authService: {
    login: jest.fn(),
    getAccessCodeFromStorage: jest.fn(),
  },
}));

const mockPush = jest.fn();
const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockUseRouter = useRouter as jest.Mock;

describe('LoginForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
    });
  });

  test('正常にレンダリングされること', () => {
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    
    render(<LoginForm />);
    
    expect(screen.getByText('QuizOut')).toBeInTheDocument();
    expect(screen.getByText('ユーザー名とパスワードを入力してください')).toBeInTheDocument();
    expect(screen.getByLabelText('ユーザー名')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '戻る' })).toBeInTheDocument();
  });

  test('アクセスコードが確認済みの表示がされること', () => {
    render(<LoginForm accessCode="test-code" />);
    
    expect(screen.getByText('アクセスコード確認済み')).toBeInTheDocument();
  });

  test('ユーザー名の入力が正常に動作すること', () => {
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    
    render(<LoginForm />);
    
    const usernameInput = screen.getByLabelText('ユーザー名');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    
    expect(usernameInput).toHaveValue('testuser');
  });

  test('パスワードの入力が正常に動作すること', () => {
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    
    render(<LoginForm />);
    
    const passwordInput = screen.getByLabelText('パスワード');
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    
    expect(passwordInput).toHaveValue('testpass');
  });

  test('入力が空の場合はログインボタンが無効になること', () => {
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    
    render(<LoginForm />);
    
    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    expect(loginButton).toBeDisabled();
  });

  test('両方の入力がある場合はログインボタンが有効になること', () => {
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    
    render(<LoginForm />);
    
    const usernameInput = screen.getByLabelText('ユーザー名');
    const passwordInput = screen.getByLabelText('パスワード');
    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    
    expect(loginButton).toBeEnabled();
  });

  test('ユーザー名が空の場合のバリデーションエラー', async () => {
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    
    render(<LoginForm />);
    
    const passwordInput = screen.getByLabelText('パスワード');
    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText('ユーザー名を入力してください')).toBeInTheDocument();
    });
  });

  test('パスワードが空の場合のバリデーションエラー', async () => {
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    
    render(<LoginForm />);
    
    const usernameInput = screen.getByLabelText('ユーザー名');
    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText('パスワードを入力してください')).toBeInTheDocument();
    });
  });

  test('ログイン成功時にonSuccessが呼ばれること', async () => {
    const mockOnSuccess = jest.fn();
    const mockUser = { id: '1', username: 'testuser' };
    
    mockAuthService.login.mockResolvedValue({ user: mockUser });
    
    render(<LoginForm accessCode="test-code" onSuccess={mockOnSuccess} />);
    
    const usernameInput = screen.getByLabelText('ユーザー名');
    const passwordInput = screen.getByLabelText('パスワード');
    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(mockUser);
    });
  });

  test('ログイン成功時にrouterでリダイレクトされること', async () => {
    mockAuthService.login.mockResolvedValue({ user: { id: '1', username: 'testuser' } });
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    
    render(<LoginForm />);
    
    const usernameInput = screen.getByLabelText('ユーザー名');
    const passwordInput = screen.getByLabelText('パスワード');
    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  test('ログイン失敗時にエラーメッセージが表示されること', async () => {
    const errorMessage = 'ログインに失敗しました';
    mockAuthService.login.mockRejectedValue(new Error(errorMessage));
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    
    render(<LoginForm />);
    
    const usernameInput = screen.getByLabelText('ユーザー名');
    const passwordInput = screen.getByLabelText('パスワード');
    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  test('戻るボタンでアクセスコードページに戻ること', () => {
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    
    render(<LoginForm />);
    
    const backButton = screen.getByRole('button', { name: '戻る' });
    fireEvent.click(backButton);
    
    expect(mockPush).toHaveBeenCalledWith('/access-code');
  });

  test('アクセスコードがない場合にリダイレクトされること', () => {
    mockAuthService.getAccessCodeFromStorage.mockReturnValue(null);
    
    render(<LoginForm />);
    
    expect(mockPush).toHaveBeenCalledWith('/access-code');
  });

  test('ローディング中はフォームが無効になること', async () => {
    mockAuthService.login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    
    render(<LoginForm />);
    
    const usernameInput = screen.getByLabelText('ユーザー名');
    const passwordInput = screen.getByLabelText('パスワード');
    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText('ログイン中...')).toBeInTheDocument();
    });
    
    expect(usernameInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
  });

  test('エラー後に入力すると エラーメッセージが消えること', async () => {
    mockAuthService.getAccessCodeFromStorage.mockReturnValue('test-code');
    
    render(<LoginForm />);
    
    const usernameInput = screen.getByLabelText('ユーザー名');
    const passwordInput = screen.getByLabelText('パスワード');
    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    
    // エラーを発生させる
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText('ユーザー名を入力してください')).toBeInTheDocument();
    });
    
    // ユーザー名を入力するとエラーが消える
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    
    expect(screen.queryByText('ユーザー名を入力してください')).not.toBeInTheDocument();
  });
});