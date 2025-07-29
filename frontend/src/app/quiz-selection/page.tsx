'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAPI } from '@/hooks/useAPI';
import { authService } from '@/services/authService';
import { Game } from '@/types/quiz';

export default function QuizSelectionPage() {
  const router = useRouter();
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAdminAuth();
  const api = useAPI();
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [isJoining, setIsJoining] = useState(false);
  const [loadingGames, setLoadingGames] = useState(false);
  const [gamesError, setGamesError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/access-code');
        return;
      }
      loadAvailableGames();
    }
  }, [authLoading, isAuthenticated, router]);


  const loadAvailableGames = async () => {
    try {
      setLoadingGames(true);
      setGamesError(null);
      const response = await api.listAvailableGames();
      if (response.success && response.data) {
        setAvailableGames(response.data);
      } else {
        setGamesError('ゲーム一覧の取得に失敗しました');
      }
    } catch (error) {
      console.error('Failed to load available games:', error);
      setGamesError('ゲーム一覧の取得に失敗しました');
    } finally {
      setLoadingGames(false);
    }
  };

  const handleJoinGame = async (gameId: string) => {
    if (!isAuthenticated || !user) {
      alert('ログインが必要です');
      router.push('/access-code');
      return;
    }

    setIsJoining(true);
    try {
      // ゲームに参加
      const response = await api.joinSession(gameId, {
        displayName: user.displayName
      });

      if (response.success) {
        // 参加成功後、ゲームページに遷移
        router.push(`/quiz/${gameId}`);
      } else {
        alert('ゲームへの参加に失敗しました: ' + (response.error?.message || '不明なエラー'));
      }
    } catch (error) {
      console.error('Join game error:', error);
      alert('ゲームへの参加に失敗しました');
    } finally {
      setIsJoining(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return '開始待ち';
      case 'active': return '進行中';
      case 'finished': return '終了';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'finished': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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

  // 認証チェック
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">ユーザー情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/access-code');
    return null;
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

        {/* 参加可能ゲーム一覧 */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              参加可能なゲーム
            </h2>
            <button
              onClick={loadAvailableGames}
              disabled={loadingGames}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              更新
            </button>
          </div>

          {loadingGames ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">ゲームを読み込み中...</p>
            </div>
          ) : gamesError ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">😞</div>
              <p className="text-gray-600 mb-4">{gamesError}</p>
              <button
                onClick={loadAvailableGames}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                再試行
              </button>
            </div>
          ) : availableGames.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🎮</div>
              <p className="text-gray-600">現在参加可能なゲームはありません</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {availableGames.map((game) => (
                <div
                  key={game.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{game.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(game.status)}`}>
                          {getStatusText(game.status)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>参加者: {game.participantCount || 0}/{game.maxParticipants}人</span>
                        {game.status === 'active' && (
                          <span>ラウンド: {game.currentRound}</span>
                        )}
                        <span>制限時間: {game.settings.timeLimit}秒</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinGame(game.id)}
                      disabled={isJoining || (game.participantCount || 0) >= game.maxParticipants}
                      className={
                        `px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                          isJoining || (game.participantCount || 0) >= game.maxParticipants
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105'
                        }`
                      }
                    >
                      {isJoining ? '参加中...' : '参加'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 管理者専用機能 - 管理者のみ表示 */}
        {isAdmin && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              管理者機能
            </h2>
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleGoToAdmin}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                新しいゲームを作成
              </button>
              
              {availableGames.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">作成済みゲーム管理</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableGames.map((game) => (
                      <div
                        key={game.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">{game.title}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(game.status)}`}>
                              {getStatusText(game.status)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            参加者: {game.participantCount || 0}人
                          </div>
                        </div>
                        <button
                          onClick={() => router.push(`/admin/session/${game.id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                        >
                          管理
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
