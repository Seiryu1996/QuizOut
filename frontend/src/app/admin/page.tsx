'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAPI } from '@/hooks/useAPI';
import { Button } from '@/components/atoms/Button';

export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const api = useAPI();
  
  const [sessionTitle, setSessionTitle] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(200);
  const [timeLimit, setTimeLimit] = useState(30);
  const [revivalEnabled, setRevivalEnabled] = useState(true);
  const [revivalCount, setRevivalCount] = useState(3);
  const [isCreating, setIsCreating] = useState(false);

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
        alert(`セッションを作成しました\nセッションID: ${response.data.id}`);
        setSessionTitle('');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
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