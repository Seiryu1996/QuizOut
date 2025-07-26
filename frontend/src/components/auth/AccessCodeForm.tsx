'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAccessCode } from '@/hooks/useAccessCode';

interface AccessCodeFormProps {
  onSuccess?: (accessCode: string) => void;
}

export const AccessCodeForm: React.FC<AccessCodeFormProps> = ({ onSuccess }) => {
  const [code, setCode] = useState('');
  const { isVerifying, error, verifyAccessCode, clearError } = useAccessCode();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const isValid = await verifyAccessCode(code);
    if (isValid) {
      if (onSuccess) {
        onSuccess(code);
      } else {
        // デフォルトではログインページに遷移
        router.push('/login');
      }
    }
  };

  const handleCodeChange = (value: string) => {
    setCode(value.toUpperCase()); // 大文字に統一
    if (error) {
      clearError();
    }
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
              アクセスコードを入力してください
            </p>
            <p className="text-sm text-gray-500 mt-2">
              忘年会イベントへの参加に必要です
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-2">
                アクセスコード
              </label>
              <input
                id="accessCode"
                type="text"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="アクセスコードを入力"
                className={
                  `w-full px-4 py-3 border rounded-lg text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    error 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300 bg-white'
                  }`
                }
                disabled={isVerifying}
                maxLength={20}
                autoComplete="off"
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

            <button
              type="submit"
              disabled={!code.trim() || isVerifying}
              className={
                `w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-white font-medium transition-all duration-200 ${
                  !code.trim() || isVerifying
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transform hover:scale-105'
                }`
              }
            >
              {isVerifying ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  確認中...
                </>
              ) : (
                '確認'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              アクセスコードはイベント主催者から配布されます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessCodeForm;
