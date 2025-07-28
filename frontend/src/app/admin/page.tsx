'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAPI } from '@/hooks/useAPI';
import { Button } from '@/components/atoms/Button';

export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin, loading, error } = useAdminAuth();
  const api = useAPI();
  
  const [sessionTitle, setSessionTitle] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(200);
  const [timeLimit, setTimeLimit] = useState(30);
  const [revivalEnabled, setRevivalEnabled] = useState(true);
  const [revivalCount, setRevivalCount] = useState(3);
  const [isCreating, setIsCreating] = useState(false);

  // 認証状態に基づくリダイレクト処理
  useEffect(() => {
    // ローディング完了後、認証されていない場合のみリダイレクト
    if (!loading && !isAuthenticated && !error) {
      router.push('/access-code');
    }
  }, [loading, isAuthenticated, error, router]);

  const handleCreateSession = async () => {
    if (!sessionTitle.trim()) {
      alert('セッション名を入力してください');
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.createSession({
        title: sessionTitle,
        maxParticipants,
        timeLimit,
        revivalEnabled,
        revivalCount,
      });

      if (response.success && response.data) {
        // セッション作成成功時は管理画面に遷移
        router.push(`/admin/session/${response.data.id}`);
      } else {
        alert('セッションの作成に失敗しました');
      }
    } catch (error) {
      console.error('Create session error:', error);
      alert('セッションの作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  // ローディング中
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // 認証エラー時の表示
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            認証エラー
          </h2>
          <p className="text-gray-600 mb-4">
            認証情報の取得に失敗しました。
          </p>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => router.push('/access-code')}
            className="btn-primary"
          >
            ログイン画面に戻る
          </button>
        </div>
      </div>
    );
  }

  // 未認証の場合（リダイレクト処理中）
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // 管理者権限がない場合
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            アクセス権限がありません
          </h2>
          <p className="text-gray-600 mb-4">
            このページは管理者のみアクセス可能です。
          </p>
          <button
            onClick={() => router.push('/')}
            className="btn-primary"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">管理者ダッシュボード</h1>
          <p className="text-gray-600">クイズセッションを作成・管理できます</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-6">新しいセッションを作成</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                セッション名
              </label>
              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="忘年会クイズ大会"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最大参加者数
              </label>
              <input
                type="number"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 200)}
                min="1"
                max="1000"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                回答制限時間（秒）
              </label>
              <input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value) || 30)}
                min="5"
                max="120"
                className="input-field"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="revivalEnabled"
                checked={revivalEnabled}
                onChange={(e) => setRevivalEnabled(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="revivalEnabled" className="text-sm font-medium text-gray-700">
                敗者復活戦を有効にする
              </label>
            </div>

            {revivalEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  復活可能人数
                </label>
                <input
                  type="number"
                  value={revivalCount}
                  onChange={(e) => setRevivalCount(parseInt(e.target.value) || 3)}
                  min="1"
                  max="10"
                  className="input-field"
                />
              </div>
            )}

            <Button
              onClick={handleCreateSession}
              loading={isCreating}
              disabled={!sessionTitle.trim()}
              className="w-full"
              size="lg"
            >
              セッションを作成
            </Button>
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/')}
            className="text-primary-600 hover:text-primary-700 underline"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  );
}