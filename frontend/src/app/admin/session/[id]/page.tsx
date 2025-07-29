'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminAPI } from '@/hooks/useAPI';
import { Button } from '@/components/atoms/Button';
import { Game, Question, Participant } from '@/types/quiz';

export default function AdminGamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params?.id as string;
  const { isAuthenticated, isAdmin, loading: authLoading } = useAdminAuth();
  const api = useAdminAPI();

  const [game, setGame] = useState<Game | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated && isAdmin && gameId) {
      loadGameInfo();
    }
  }, [authLoading, isAuthenticated, isAdmin, gameId]);

  const loadGameInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ゲーム情報を取得
      const gameResponse = await api.getSessionInfo(gameId);
      if (gameResponse.success && gameResponse.data) {
        setGame(gameResponse.data);
      } else {
        setError(gameResponse.error?.message || 'ゲーム情報の取得に失敗しました');
        return;
      }

      // 現在の問題を取得（管理者用エンドポイント）
      try {
        const questionResponse = await api.getAdminCurrentQuestion(gameId);
        if (questionResponse.success && questionResponse.data) {
          setCurrentQuestion(questionResponse.data);
        }
      } catch (error) {
        console.log('No current question available');
        setCurrentQuestion(null);
      }

      // 参加者一覧を取得（管理者用エンドポイント）
      try {
        const participantsResponse = await api.getAdminParticipants(gameId);
        if (participantsResponse.success && participantsResponse.data) {
          setParticipants(participantsResponse.data);
        }
      } catch (error) {
        console.log('Failed to load participants');
        setParticipants([]);
      }
      
    } catch (error) {
      console.error('Failed to load game info:', error);
      setError('ゲーム情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };


  const handleGenerateQuestion = async () => {
    try {
      setActionLoading('generate');
      const response = await api.generateQuestion(gameId);
      if (response.success) {
        alert('問題を生成しました');
        await loadGameInfo();
      } else {
        alert('問題の生成に失敗しました');
      }
    } catch (error) {
      console.error('Generate question error:', error);
      alert('問題の生成に失敗しました');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteGame = async () => {
    if (!confirm(`ゲーム「${game?.title}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      setActionLoading('delete');
      const response = await api.deleteSession(gameId);
      if (response.success) {
        alert('ゲームを削除しました');
        router.push('/admin');
      } else {
        alert('ゲームの削除に失敗しました');
      }
    } catch (error) {
      console.error('Delete game error:', error);
      alert('ゲームの削除に失敗しました');
    } finally {
      setActionLoading(null);
    }
  };

  // 認証チェック
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/access-code');
    return null;
  }

  if (!isAdmin) {
    router.push('/');
    return null;
  }

  // ローディング状態
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <div className="text-gray-600">ゲーム情報を読み込み中...</div>
        </div>
      </div>
    );
  }

  // エラー状態
  if (error || !game) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="text-6xl mb-4">😞</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            ゲームが見つかりません
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/admin')}
            className="btn-primary"
          >
            管理者ダッシュボードに戻る
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'finished': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return '待機中';
      case 'active': return '進行中';
      case 'finished': return '終了';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/admin')}
              className="text-primary-600 hover:text-primary-700 flex items-center"
            >
              ← 管理者ダッシュボードに戻る
            </button>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(game.status)}`}>
                {getStatusText(game.status)}
              </span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{game.title}</h1>
          <p className="text-gray-600">ゲームID: {game.id}</p>
        </div>

        {/* ゲーム情報カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">ゲーム情報</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">最大参加者数:</span>
                <span className="font-medium">{game.maxParticipants}人</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">現在の参加者数:</span>
                <span className="font-medium">{game.participantCount || 0}人</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">作成日時:</span>
                <span className="font-medium">
                  {new Date(game.createdAt).toLocaleString('ja-JP')}
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">ゲーム設定</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">回答制限時間:</span>
                <span className="font-medium">{game.settings?.timeLimit || 30}秒</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">敗者復活戦:</span>
                <span className="font-medium">
                  {game.settings?.revivalEnabled ? '有効' : '無効'}
                </span>
              </div>
              {game.settings?.revivalEnabled && (
                <div className="flex justify-between">
                  <span className="text-gray-600">復活可能人数:</span>
                  <span className="font-medium">{game.settings.revivalCount}人</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* コントロールパネル */}
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">問題管理</h3>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleGenerateQuestion}
              loading={actionLoading === 'generate'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              問題を生成
            </Button>

            <Button
              onClick={loadGameInfo}
              loading={loading}
              className="bg-gray-600 hover:bg-gray-700"
            >
              情報を更新
            </Button>

            <Button
              onClick={handleDeleteGame}
              loading={actionLoading === 'delete'}
              className="bg-red-600 hover:bg-red-700 border-red-600"
            >
              ゲームを削除
            </Button>
          </div>
        </div>

        {/* 現在の問題 */}
        {currentQuestion && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold mb-4">現在の問題</h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">問題文</h4>
                <p className="text-blue-800">{currentQuestion.questionText}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentQuestion.options.map((option, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border-2 ${
                      index === currentQuestion.correctAnswer 
                        ? 'border-green-500 bg-green-50 text-green-800' 
                        : 'border-gray-200 bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="font-medium">
                      {String.fromCharCode(65 + index)}. 
                    </span>
                    {option}
                    {index === currentQuestion.correctAnswer && (
                      <span className="ml-2 text-green-600">✓ 正解</span>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>ラウンド: {currentQuestion.round}</span>
                <span>難易度: {currentQuestion.difficulty}</span>
                <span>カテゴリ: {currentQuestion.category}</span>
              </div>
            </div>
          </div>
        )}

        {/* 参加者の状態 */}
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">参加者の状態</h3>
          {participants.length === 0 ? (
            <p className="text-gray-600">参加者はいません</p>
          ) : (
            <div className="space-y-2">
              {participants.map((participant) => (
                <div 
                  key={participant.userId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {participant.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {participant.displayName}
                      </p>
                      <p className="text-sm text-gray-600">
                        参加時間: {new Date(participant.joinedAt).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      participant.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : participant.status === 'eliminated'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {participant.status === 'active' ? '勝ち上がり' : 
                       participant.status === 'eliminated' ? '敗退' : participant.status}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      スコア: {participant.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 統計情報 */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">統計情報</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {participants.filter(p => p.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">勝ち上がり</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {participants.filter(p => p.status === 'eliminated').length}
              </div>
              <div className="text-sm text-gray-600">敗退</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {game?.currentRound || 0}
              </div>
              <div className="text-sm text-gray-600">現在ラウンド</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {participants.length}
              </div>
              <div className="text-sm text-gray-600">総参加者</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}