'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAPI } from '@/hooks/useAPI';
import { useQuizStore } from '@/store/quizStore';
import { useUserStore } from '@/store/userStore';
import { QuizPresenter } from './QuizPresenter';

export const QuizContainer: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { displayName } = useUserStore();
  const api = useAPI();

  const [hasJoined, setHasJoined] = useState(false);
  const [joiningError, setJoiningError] = useState<string | null>(null);

  const {
    currentSession,
    setCurrentSession,
    participants,
    setParticipants,
    currentQuestion,
    timeRemaining,
    hasAnswered,
    setHasAnswered,
    roundResults,
    clearRoundResults,
    revivalInProgress,
    revivalCandidates,
    revivedParticipants,
    isConnected,
    isLoading,
    error,
    setError,
    addAnswer,
  } = useQuizStore();

  // WebSocket接続
  const { 
    isConnected: wsConnected, 
    submitAnswer: wsSubmitAnswer,
    connectionError 
  } = useWebSocket({ 
    sessionId, 
    autoConnect: isAuthenticated 
  });

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  // セッション情報取得
  useEffect(() => {
    const fetchSessionInfo = async () => {
      if (!sessionId) return;

      try {
        const response = await api.getSessionInfo(sessionId);
        if (response.success && response.data) {
          setCurrentSession(response.data);
        } else {
          setError(response.error?.message || 'セッション情報の取得に失敗しました');
        }
      } catch (error) {
        console.error('Failed to fetch session info:', error);
        setError('セッション情報の取得に失敗しました');
      }
    };

    fetchSessionInfo();
  }, [sessionId, api, setCurrentSession, setError]);

  // セッション参加
  useEffect(() => {
    const joinSession = async () => {
      if (!sessionId || !isAuthenticated || !displayName || hasJoined) return;

      try {
        setJoiningError(null);
        const response = await api.joinSession(sessionId, { displayName });
        
        if (response.success) {
          setHasJoined(true);
          // 参加者一覧を取得
          const participantsResponse = await api.getParticipants(sessionId);
          if (participantsResponse.success && participantsResponse.data) {
            setParticipants(participantsResponse.data);
          }
        } else {
          setJoiningError(response.error?.message || 'セッションへの参加に失敗しました');
        }
      } catch (error) {
        console.error('Failed to join session:', error);
        setJoiningError('セッションへの参加に失敗しました');
      }
    };

    joinSession();
  }, [sessionId, isAuthenticated, displayName, hasJoined, api, setParticipants]);

  // 回答送信
  const handleAnswer = async (selectedOption: number, responseTime: number) => {
    if (!currentQuestion || hasAnswered) return;

    try {
      // APIで回答送信
      const response = await api.submitAnswer(sessionId, {
        questionId: currentQuestion.id,
        selectedOption,
        responseTime,
      });

      if (response.success && response.data) {
        addAnswer(response.data);
        setHasAnswered(true);
        
        // WebSocketでも送信（リアルタイム更新用）
        wsSubmitAnswer(currentQuestion.id, selectedOption, responseTime);
      } else {
        setError(response.error?.message || '回答の送信に失敗しました');
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
      setError('回答の送信に失敗しました');
    }
  };

  // 結果クリア
  const handleClearResults = () => {
    clearRoundResults();
  };

  // ローディング状態
  if (authLoading || !currentSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <div className="text-gray-600">読み込み中...</div>
        </div>
      </div>
    );
  }

  // 参加エラー
  if (joiningError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="text-6xl mb-4">😞</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            参加できませんでした
          </h2>
          <p className="text-gray-600 mb-4">{joiningError}</p>
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
    <QuizPresenter
      session={currentSession}
      participants={participants}
      currentQuestion={currentQuestion}
      timeRemaining={timeRemaining}
      hasAnswered={hasAnswered}
      roundResults={roundResults}
      revivalInProgress={revivalInProgress}
      revivalCandidates={revivalCandidates}
      revivedParticipants={revivedParticipants}
      isConnected={wsConnected}
      isLoading={isLoading}
      error={error || connectionError}
      currentUserId={user?.id}
      onAnswer={handleAnswer}
      onClearResults={handleClearResults}
      onGoHome={() => router.push('/')}
    />
  );
};