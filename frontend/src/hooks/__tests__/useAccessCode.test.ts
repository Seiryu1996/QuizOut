import { renderHook, act } from '@testing-library/react';
import { useAccessCode } from '../useAccessCode';
import { authService } from '@/services/authService';

// authService をモック化
jest.mock('@/services/authService', () => ({
  authService: {
    verifyAccessCode: jest.fn(),
    saveAccessCodeToStorage: jest.fn(),
  },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('useAccessCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('初期状態が正しいこと', () => {
    const { result } = renderHook(() => useAccessCode());

    expect(result.current.isVerifying).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.isVerified).toBe(false);
    expect(typeof result.current.verifyAccessCode).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
  });

  test('アクセスコード検証が成功すること', async () => {
    const { result } = renderHook(() => useAccessCode());
    const mockResponse = { isValid: true, message: 'アクセスコードが確認されました' };
    
    mockAuthService.verifyAccessCode.mockResolvedValue(mockResponse);

    await act(async () => {
      const isValid = await result.current.verifyAccessCode('VALID123');
      expect(isValid).toBe(true);
    });

    expect(result.current.isVerified).toBe(true);
    expect(result.current.error).toBe(null);
    expect(mockAuthService.verifyAccessCode).toHaveBeenCalledWith('VALID123');
    expect(mockAuthService.saveAccessCodeToStorage).toHaveBeenCalledWith('VALID123');
  });

  test('アクセスコード検証が失敗すること', async () => {
    const { result } = renderHook(() => useAccessCode());
    const mockResponse = { isValid: false, message: '無効なアクセスコードです' };
    
    mockAuthService.verifyAccessCode.mockResolvedValue(mockResponse);

    await act(async () => {
      const isValid = await result.current.verifyAccessCode('INVALID123');
      expect(isValid).toBe(false);
    });

    expect(result.current.isVerified).toBe(false);
    expect(result.current.error).toBe('無効なアクセスコードです');
    expect(mockAuthService.saveAccessCodeToStorage).not.toHaveBeenCalled();
  });

  test('空のアクセスコードでエラーになること', async () => {
    const { result } = renderHook(() => useAccessCode());

    await act(async () => {
      const isValid = await result.current.verifyAccessCode('');
      expect(isValid).toBe(false);
    });

    expect(result.current.error).toBe('アクセスコードを入力してください');
    expect(mockAuthService.verifyAccessCode).not.toHaveBeenCalled();
  });

  test('ネットワークエラー時の処理が正しいこと', async () => {
    const { result } = renderHook(() => useAccessCode());
    const networkError = new Error('Network error');
    
    mockAuthService.verifyAccessCode.mockRejectedValue(networkError);

    await act(async () => {
      const isValid = await result.current.verifyAccessCode('TEST123');
      expect(isValid).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.isVerified).toBe(false);
  });

  test('ローディング状態が正しく管理されること', async () => {
    const { result } = renderHook(() => useAccessCode());
    const mockResponse = { isValid: true, message: 'Success' };
    
    mockAuthService.verifyAccessCode.mockResolvedValue(mockResponse);

    // 検証開始前
    expect(result.current.isVerifying).toBe(false);

    // 検証実行
    await act(async () => {
      await result.current.verifyAccessCode('TEST123');
    });

    // 検証完了後
    expect(result.current.isVerifying).toBe(false);
    expect(result.current.isVerified).toBe(true);
  });

  test('エラークリア機能が正常に動作すること', async () => {
    const { result } = renderHook(() => useAccessCode());

    // 最初にエラーを設定（空のコードでエラーを発生させる）
    await act(async () => {
      await result.current.verifyAccessCode(''); // 空のコードでエラーを発生
    });

    expect(result.current.error).toBe('アクセスコードを入力してください');

    // エラーをクリア
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });
});
