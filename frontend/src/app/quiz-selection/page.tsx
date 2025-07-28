'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { User } from '@/types/auth';

export default function QuizSelectionPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const response = await authService.getMe();
      setUser(response.user);
      setIsAdmin(response.user.isAdmin || false);
    } catch (error) {
      console.error('Failed to load user info:', error);
      // 認証エラーの場合はアクセスコードページにリダイレクト
      router.push('/access-code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinQuiz = async () => {
    if (!sessionId.trim()) {
      alert('セッションIDを入力してください');
      return;
    }

    setIsJoining(true);
    try {
      // クイズページに遷移
      router.push(`/quiz/${sessionId}`);
    } catch (error) {
      console.error('Join quiz error:', error);
      alert('クイズへの参加に失敗しました');
    } finally {
      setIsJoining(false);
    }
  };

  const handleGoToAdmin = () => {
    router.push('/admin');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push('/access-code');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">ユーザー情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              QuizOut
            </h1>
            <p className="text-gray-600">
              サドンデス勝ち上がり式クイズ
            </p>
          </div>
          
          {user && (
            <div className="flex items-center justify-between bg-green-50 rounded-lg p-3">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                  <p className="text-xs text-green-600">ログイン済み</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                ログアウト
              </button>
            </div>
          )}
        </div>

        {/* クイズ参加カード */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
            クイズに参加
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="sessionId" className="block text-sm font-medium text-gray-700 mb-2">
                セッションID
              </label>
              <input
                id="sessionId"
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="セッションIDを入力"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                disabled={isJoining}
                autoComplete="off"
              />
            </div>

            <button
              onClick={handleJoinQuiz}
              disabled={!sessionId.trim() || isJoining}
              className={
                `w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-white font-medium transition-all duration-200 ${
                  !sessionId.trim() || isJoining
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transform hover:scale-105'
                }`
              }
            >
              {isJoining ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  参加中...
                </>
              ) : (
                'クイズに参加'
              )}
            </button>
          </div>
        </div>

        {/* 管理者用リンク - 管理者のみ表示 */}
        {isAdmin && (
          <div className="text-center mb-6">
            <button
              onClick={handleGoToAdmin}
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              管理者ダッシュボード
            </button>
          </div>
        )}

        {/* フッター */}
        <div className="text-center text-gray-500 text-sm">
          <p>最大200人同時参加可能</p>
          <p>AI自動問題生成・敗者復活戦あり</p>
        </div>
      </div>
    </div>
  );
}
