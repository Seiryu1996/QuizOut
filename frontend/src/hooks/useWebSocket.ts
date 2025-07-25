import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQuizStore } from '@/store/quizStore';
import { useUserStore } from '@/store/userStore';
import { 
  WebSocketMessage, 
  QuestionStartMessage, 
  QuestionEndMessage,
  RoundResultMessage,
  ParticipantJoinMessage,
  SessionUpdateMessage,
  RevivalStartMessage,
  RevivalResultMessage
} from '@/types/websocket';

interface UseWebSocketOptions {
  sessionId?: string;
  autoConnect?: boolean;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { sessionId, autoConnect = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const { authToken, displayName, user } = useUserStore();
  const {
    setIsConnected: setQuizConnected,
    setCurrentQuestion,
    setTimeRemaining,
    setRoundResults,
    clearRoundResults,
    setRevivalInProgress,
    setRevivalCandidates,
    setRevivedParticipants,
    updateSessionStatus,
    addParticipant,
    removeParticipant,
    setError
  } = useQuizStore();

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
      
      socketRef.current = io(wsUrl, {
        transports: ['websocket'],
        query: {
          sessionId: sessionId || '',
          displayName: displayName || '匿名ユーザー',
          token: authToken || '',
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setQuizConnected(true);
        setConnectionError(null);
      });

      socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setQuizConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setConnectionError(error.message);
        setIsConnected(false);
        setQuizConnected(false);
      });

      // クイズ関連イベント
      socket.on('question_start', (data: QuestionStartMessage) => {
        console.log('Question started:', data);
        setCurrentQuestion({
          id: data.question.id,
          text: data.question.text,
          options: data.question.options,
          round: data.question.round,
          category: data.question.category,
          difficulty: 'medium', // デフォルト値
          createdAt: new Date().toISOString(),
        });
        setTimeRemaining(data.timeLimit);
        clearRoundResults();
      });

      socket.on('question_end', (data: QuestionEndMessage) => {
        console.log('Question ended:', data);
        setTimeRemaining(0);
      });

      socket.on('round_result', (data: RoundResultMessage) => {
        console.log('Round result:', data);
        setRoundResults({
          survivors: data.survivors.map(s => ({
            id: s.userId,
            userId: s.userId,
            displayName: s.displayName,
            status: 'active' as const,
            score: s.score,
            correctAnswers: 0,
            joinedAt: new Date().toISOString(),
          })),
          eliminated: data.eliminated.map(e => ({
            id: e.userId,
            userId: e.userId,
            displayName: e.displayName,
            status: 'eliminated' as const,
            score: e.score,
            correctAnswers: 0,
            joinedAt: new Date().toISOString(),
          })),
          round: data.round,
        });
      });

      // 参加者関連イベント
      socket.on('participant_join', (data: ParticipantJoinMessage) => {
        console.log('Participant joined:', data);
        addParticipant({
          id: data.userId,
          userId: data.userId,
          displayName: data.displayName,
          status: 'active',
          score: 0,
          correctAnswers: 0,
          joinedAt: new Date().toISOString(),
        });
      });

      socket.on('participant_leave', (data: ParticipantJoinMessage) => {
        console.log('Participant left:', data);
        removeParticipant(data.userId);
      });

      // セッション関連イベント
      socket.on('session_update', (data: SessionUpdateMessage) => {
        console.log('Session updated:', data);
        updateSessionStatus(data.status as any);
      });

      // 敗者復活戦関連イベント
      socket.on('revival_start', (data: RevivalStartMessage) => {
        console.log('Revival started:', data);
        setRevivalInProgress(true);
        setRevivalCandidates(data.candidates.map(c => ({
          id: c.userId,
          userId: c.userId,
          displayName: c.displayName,
          status: 'eliminated' as const,
          score: 0,
          correctAnswers: 0,
          joinedAt: new Date().toISOString(),
        })));
      });

      socket.on('revival_result', (data: RevivalResultMessage) => {
        console.log('Revival result:', data);
        setRevivalInProgress(false);
        setRevivedParticipants(data.revived.map(r => ({
          id: r.userId,
          userId: r.userId,
          displayName: r.displayName,
          status: 'revived' as const,
          score: 0,
          correctAnswers: 0,
          joinedAt: new Date().toISOString(),
        })));
      });

      // エラーハンドリング
      socket.on('error', (data: { error: string }) => {
        console.error('WebSocket error:', data.error);
        setError(data.error);
      });

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError('Failed to connect to server');
    }
  }, [sessionId, displayName, authToken, setQuizConnected, setCurrentQuestion, 
      setTimeRemaining, setRoundResults, clearRoundResults, setRevivalInProgress,
      setRevivalCandidates, setRevivedParticipants, updateSessionStatus,
      addParticipant, removeParticipant, setError]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setQuizConnected(false);
    }
  }, [setQuizConnected]);

  const sendMessage = useCallback((type: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(type, {
        type,
        sessionId,
        data,
        timestamp: Date.now(),
      });
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }, [sessionId]);

  const submitAnswer = useCallback((questionId: string, selectedOption: number, responseTime: number) => {
    sendMessage('answer_submit', {
      questionId,
      selectedOption,
      responseTime,
    });
  }, [sendMessage]);

  const joinSession = useCallback((sessionId: string) => {
    sendMessage('join_session', { sessionId });
  }, [sendMessage]);

  // 自動接続
  useEffect(() => {
    if (autoConnect && authToken) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, authToken, connect, disconnect]);

  // タイマー管理
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [setTimeRemaining]);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    sendMessage,
    submitAnswer,
    joinSession,
  };
};