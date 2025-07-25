'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/store/userStore';

export default function HomePage() {
  const router = useRouter();
  const { signInAnonymous, loading, isAuthenticated } = useAuth();
  const { displayName, setDisplayName } = useUserStore();
  
  const [localDisplayName, setLocalDisplayName] = useState(displayName);
  const [sessionId, setSessionId] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    setLocalDisplayName(displayName);
  }, [displayName]);

  const handleJoinQuiz = async () => {
    if (!localDisplayName.trim()) {
      alert('表示名を入力してください');
      return;
    }

    if (!sessionId.trim()) {
      alert('セッションIDを入力してください');
      return;
    }

    setIsJoining(true);

    try {
      // 表示名を保存
      setDisplayName(localDisplayName.trim());

      // 認証していない場合は匿名認証
      if (!isAuthenticated) {
        const success = await signInAnonymous();
        if (!success) {
          alert('認証に失敗しました');
          return;
        }
      }

      // クイズページに遷移
      router.push(`/quiz/${sessionId}`);
    } catch (error) {
      console.error('Join quiz error:', error);
      alert('クイズへの参加に失敗しました');
    } finally {
      setIsJoining(false);
    }
  };

  const handleGoToAdmin = async () => {
    setIsJoining(true);

    try {
      // 認証していない場合は匿名認証
      if (!isAuthenticated) {
        const success = await signInAnonymous();
        if (!success) {
          alert('認証に失敗しました');
          return;
        }
      }

      // 管理者ページに遷移
      router.push('/admin');
    } catch (error) {
      console.error('Go to admin error:', error);
      alert('管理者ページへの移動に失敗しました');
    } finally {
      setIsJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 text-shadow">
              QuizOut
            </h1>
            <p className="text-primary-100 text-lg">
              サドンデス勝ち上がり式クイズ
            </p>
          </div>

          {/* メインカード */}
          <div className="card mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              クイズに参加
            </h2>

            <div className="space-y-4">
              {/* 表示名入力 */}
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                  表示名
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={localDisplayName}
                  onChange={(e) => setLocalDisplayName(e.target.value)}
                  placeholder="あなたの名前を入力"
                  className="input-field"
                  maxLength={20}
                />
              </div>

              {/* セッションID入力 */}
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
                  className="input-field"
                />
              </div>

              {/* 参加ボタン */}
              <button
                onClick={handleJoinQuiz}
                disabled={isJoining || !localDisplayName.trim() || !sessionId.trim()}
                className="btn-primary w-full py-3 text-lg"
              >
                {isJoining ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    参加中...
                  </div>
                ) : (
                  'クイズに参加'
                )}
              </button>
            </div>
          </div>

          {/* 管理者用リンク */}
          <div className="text-center">
            <button
              onClick={handleGoToAdmin}
              disabled={isJoining}
              className="text-white hover:text-primary-100 underline transition-colors duration-200"
            >
              管理者の方はこちら
            </button>
          </div>

          {/* フッター */}
          <div className="text-center mt-8 text-primary-100 text-sm">
            <p>最大200人同時参加可能</p>
            <p>AI自動問題生成・敗者復活戦あり</p>
          </div>
        </div>
      </div>
    </div>
  );
}