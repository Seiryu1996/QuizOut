import { useState, useCallback } from 'react';
import { authService } from '@/services/authService';
import { AuthError } from '@/types/auth';

interface UseAccessCodeReturn {
  isVerifying: boolean;
  error: string | null;
  isVerified: boolean;
  verifyAccessCode: (code: string) => Promise<boolean>;
  clearError: () => void;
}

// アクセスコード認証フック
export const useAccessCode = (): UseAccessCodeReturn => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  const verifyAccessCode = useCallback(async (code: string): Promise<boolean> => {
    if (!code.trim()) {
      setError('アクセスコードを入力してください');
      return false;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await authService.verifyAccessCode(code);
      
      if (response.isValid) {
        setIsVerified(true);
        // アクセスコードをストレージに保存
        authService.saveAccessCodeToStorage(code);
        return true;
      } else {
        setError(response.message || '無効なアクセスコードです');
        return false;
      }
    } catch (err) {
      console.error('Access code verification error:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'アクセスコードの検証中にエラーが発生しました'
      );
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isVerifying,
    error,
    isVerified,
    verifyAccessCode,
    clearError,
  };
};
