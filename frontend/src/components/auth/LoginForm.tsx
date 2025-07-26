'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { User } from '@/types/auth';

interface LoginFormProps {
  accessCode?: string;
  onSuccess?: (user: User) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ accessCode, onSuccess }) => {
  const [name, setName] = useState('');
  const [currentAccessCode, setCurrentAccessCode] = useState(accessCode || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // アクセスコードが渡されていない場合はストレージから取得
    if (!accessCode) {
      const storedCode = authService.getAccessCodeFromStorage();
      if (storedCode) {
        setCurrentAccessCode(storedCode);
      } else {
        // アクセスコードがない場合はアクセスコードページにリダイレクト
        router.push('/access-code');
        return;
      }
    }
  }, [accessCode, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('名前を入力してください');
      return;
    }

    if (!currentAccessCode) {
      setError('アクセスコードが確認できません');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login(name.trim(), currentAccessCode);
      
      if (onSuccess) {
        onSuccess(response.user);
      } else {
        // デフォルトではメインページに遷移
        router.push('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'ログイン中にエラーが発生しました'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (error) {
      setError(null);
    }
  };

  const handleBackToAccessCode = () => {
    router.push('/access-code');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              QuizOut
            </h1>
            <p className="text-gray-600">
              ユーザー名を入力してください
            </p>
            {currentAccessCode && (
              <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                アクセスコード確認済み
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
                ユーザー名
              </label>
              <input
                id="userName"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="あなたの名前を入力"
                className={
                  `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    error 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300 bg-white'
                  }`
                }
                disabled={isLoading}
                maxLength={50}
                autoComplete="name"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleBackToAccessCode}
                disabled={isLoading}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:ring-4 focus:ring-gray-500 focus:ring-opacity-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                戻る
              </button>
              <button
                type="submit"
                disabled={!name.trim() || isLoading}
                className={
                  `flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-white font-medium transition-all duration-200 ${
                    !name.trim() || isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transform hover:scale-105'
                  }`
                }
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    ログイン中...
                  </>
                ) : (
                  'ログイン'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              ログイン後、利用可能なクイズセッションが表示されます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
