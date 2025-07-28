'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAPI } from '@/hooks/useAPI';
import { Button } from '@/components/atoms/Button';
import { Session } from '@/types/quiz';

export default function AdminSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;
  const { isAuthenticated, isAdmin, loading: authLoading } = useAdminAuth();
  const api = useAPI();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated && isAdmin && sessionId) {
      loadSessionInfo();
    }
  }, [authLoading, isAuthenticated, isAdmin, sessionId]);

  const loadSessionInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getSessionInfo(sessionId);
      if (response.success && response.data) {
        setSession(response.data);
      } else {
        setError(response.error?.message || 'セッション情報の取得に失敗しました');
      }
    } catch (error) {
      console.error('Failed to load session info:', error);
      setError('セッション情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSessionControl = async (action: 'start' | 'finish') => {
    try {
      setActionLoading(action);
      const response = await api.controlSession(sessionId, { action });
      if (response.success) {
        alert(`セッションを${action === 'start' ? '開始' : '終了'}しました`);
        await loadSessionInfo(); // セッション情報を再読み込み
      } else {
        alert(`セッションの${action === 'start' ? '開始' : '終了'}に失敗しました`);
      }
    } catch (error) {
      console.error('Session control error:', error);
      alert(`セッションの${action === 'start' ? '開始' : '終了'}に失敗しました`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateQuestion = async () => {
    try {
      setActionLoading('generate');
      const response = await api.generateQuestion(sessionId);
      if (response.success) {
        alert('問題を生成しました');
        await loadSessionInfo();
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
          <div className="text-gray-600">セッション情報を読み込み中...</div>
        </div>
      </div>
    );
  }

  // エラー状態
  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="text-6xl mb-4">😞</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            セッションが見つかりません
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
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(session.status)}`}>
                {getStatusText(session.status)}
              </span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{session.title}</h1>
          <p className="text-gray-600">セッションID: {session.id}</p>
        </div>

        {/* セッション情報カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">セッション情報</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">最大参加者数:</span>
                <span className="font-medium">{session.maxParticipants}人</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">現在の参加者数:</span>
                <span className="font-medium">{session.participantCount || 0}人</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">作成日時:</span>
                <span className="font-medium">
                  {new Date(session.createdAt).toLocaleString('ja-JP')}
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">ゲーム設定</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">回答制限時間:</span>
                <span className="font-medium">{session.settings?.timeLimit || 30}秒</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">敗者復活戦:</span>
                <span className="font-medium">
                  {session.settings?.revivalEnabled ? '有効' : '無効'}
                </span>
              </div>
              {session.settings?.revivalEnabled && (
                <div className="flex justify-between">
                  <span className="text-gray-600">復活可能人数:</span>
                  <span className="font-medium">{session.settings.revivalCount}人</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* コントロールパネル */}
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">セッション制御</h3>
          <div className="flex flex-wrap gap-3">
            {session.status === 'waiting' && (
              <Button
                onClick={() => handleSessionControl('start')}
                loading={actionLoading === 'start'}
                className="bg-green-600 hover:bg-green-700"
              >
                セッション開始
              </Button>
            )}
            
            {session.status === 'active' && (
              <Button
                onClick={() => handleSessionControl('finish')}
                loading={actionLoading === 'finish'}
                className="bg-red-600 hover:bg-red-700"
              >
                セッション終了
              </Button>
            )}

            <Button
              onClick={handleGenerateQuestion}
              loading={actionLoading === 'generate'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              問題を生成
            </Button>

            <Button
              onClick={loadSessionInfo}
              loading={loading}
              className="bg-gray-600 hover:bg-gray-700"
            >
              情報を更新
            </Button>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">統計情報</h3>
          <div className="text-gray-600">
            <p>統計情報は開発中です。</p>
          </div>
        </div>
      </div>
    </div>
  );
}