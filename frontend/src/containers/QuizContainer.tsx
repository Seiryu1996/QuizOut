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
  const gameId = params?.id as string;

  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { displayName } = useUserStore();
  const api = useAPI();

  const [hasJoined, setHasJoined] = useState(false);
  const [joiningError, setJoiningError] = useState<string | null>(null);

  const {
    currentGame,
    setCurrentGame,
    participants,
    setParticipants,
    questions,
    setQuestions,
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
    sessionId: gameId, 
    autoConnect: isAuthenticated 
  });

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  // ゲーム情報取得
  useEffect(() => {
    const fetchGameInfo = async () => {
      if (!gameId) return;

      try {
        const response = await api.getSessionInfo(gameId);
        if (response.success && response.data) {
          setCurrentGame(response.data);
        } else {
          setError(response.error?.message || 'ゲーム情報の取得に失敗しました');
        }
      } catch (error) {
        console.error('Failed to fetch game info:', error);
        setError('ゲーム情報の取得に失敗しました');
      }
    };

    fetchGameInfo();
  }, [gameId]);

  // 問題一覧取得
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!gameId || !isAuthenticated) return;

      try {
        const response = await api.getAllQuestions(gameId);
        if (response.success && response.data) {
          setQuestions(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch questions:', error);
      }
    };

    fetchQuestions();
  }, [gameId, isAuthenticated]);

  // ゲーム参加
  useEffect(() => {
    const joinGame = async () => {
      if (!gameId || !isAuthenticated || !displayName || hasJoined) return;

      try {
        setJoiningError(null);
        const response = await api.joinSession(gameId, { displayName });
        
        if (response.success) {
          setHasJoined(true);
          // 参加者一覧を取得
          const participantsResponse = await api.getParticipants(gameId);
          if (participantsResponse.success && participantsResponse.data) {
            setParticipants(participantsResponse.data);
          }
        } else {
          setJoiningError(response.error?.message || 'ゲームへの参加に失敗しました');
        }
      } catch (error) {
        console.error('Failed to join game:', error);
        setJoiningError('ゲームへの参加に失敗しました');
      }
    };

    joinGame();
  }, [gameId, isAuthenticated, displayName, hasJoined]);

  // 回答送信
  const handleAnswer = async (selectedOption: number, responseTime: number) => {
    if (!currentQuestion || hasAnswered) return;

    try {
      // APIで回答送信
      const response = await api.submitAnswer(gameId, {
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
  if (authLoading || !currentGame) {
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
      game={currentGame}
      participants={participants}
      questions={questions}
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