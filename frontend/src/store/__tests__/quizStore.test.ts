import { renderHook, act } from '@testing-library/react';
import { useQuizStore } from '../quizStore';
import { Session, Question, Participant, Answer } from '@/types/quiz';

describe('useQuizStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useQuizStore.getState().resetQuizState();
    });
  });

  const mockSession: Session = {
    id: 'session-1',
    title: 'Test Session',
    status: 'active',
    currentRound: 1,
    maxRounds: 5,
    settings: {
      timeLimit: 30,
      revivalEnabled: true,
      revivalCount: 2,
      minParticipants: 2,
      maxParticipants: 10,
      autoStart: false,
      shuffleQuestions: true,
      showCorrectAnswer: true,
      allowSpectators: false
    },
    createdBy: 'admin-1',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  };

  const mockQuestion: Question = {
    id: 'q1',
    question: 'Test Question',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 1,
    explanation: 'Test explanation',
    difficulty: 'medium',
    category: 'general',
    tags: ['test'],
    timeLimit: 30,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  };

  const mockParticipant: Participant = {
    userId: 'user-1',
    displayName: 'Test User',
    score: 100,
    status: 'active',
    isAdmin: false,
    joinedAt: new Date('2023-01-01')
  };

  const mockAnswer: Answer = {
    id: 'answer-1',
    questionId: 'q1',
    selectedOption: 1,
    responseTime: 15000,
    isCorrect: true,
    createdAt: new Date('2023-01-01')
  };

  test('初期状態が正しく設定されていること', () => {
    const { result } = renderHook(() => useQuizStore());

    expect(result.current.currentSession).toBeNull();
    expect(result.current.participants).toEqual([]);
    expect(result.current.currentQuestion).toBeNull();
    expect(result.current.timeRemaining).toBe(0);
    expect(result.current.isAnswering).toBe(false);
    expect(result.current.hasAnswered).toBe(false);
    expect(result.current.userAnswers).toEqual([]);
    expect(result.current.roundResults).toBeNull();
    expect(result.current.revivalInProgress).toBe(false);
    expect(result.current.revivalCandidates).toEqual([]);
    expect(result.current.revivedParticipants).toEqual([]);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  describe('Session actions', () => {
    test('setCurrentSessionが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());

      act(() => {
        result.current.setCurrentSession(mockSession);
      });

      expect(result.current.currentSession).toEqual(mockSession);
    });

    test('updateSessionStatusが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());

      act(() => {
        result.current.setCurrentSession(mockSession);
        result.current.updateSessionStatus('finished');
      });

      expect(result.current.currentSession?.status).toBe('finished');
    });

    test('currentSessionがnullの場合updateSessionStatusが動作しないこと', () => {
      const { result } = renderHook(() => useQuizStore());

      act(() => {
        result.current.updateSessionStatus('finished');
      });

      expect(result.current.currentSession).toBeNull();
    });
  });

  describe('Participants actions', () => {
    test('setParticipantsが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());
      const participants = [mockParticipant];

      act(() => {
        result.current.setParticipants(participants);
      });

      expect(result.current.participants).toEqual(participants);
    });

    test('addParticipantが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());

      act(() => {
        result.current.addParticipant(mockParticipant);
      });

      expect(result.current.participants).toContainEqual(mockParticipant);
    });

    test('addParticipantで同じユーザーを追加すると重複しないこと', () => {
      const { result } = renderHook(() => useQuizStore());

      act(() => {
        result.current.addParticipant(mockParticipant);
        result.current.addParticipant({ ...mockParticipant, score: 200 });
      });

      expect(result.current.participants).toHaveLength(1);
      expect(result.current.participants[0].score).toBe(200);
    });

    test('removeParticipantが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());

      act(() => {
        result.current.addParticipant(mockParticipant);
        result.current.removeParticipant('user-1');
      });

      expect(result.current.participants).toHaveLength(0);
    });
  });

  describe('Question actions', () => {
    test('setCurrentQuestionが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());

      act(() => {
        result.current.setCurrentQuestion(mockQuestion);
      });

      expect(result.current.currentQuestion).toEqual(mockQuestion);
      expect(result.current.hasAnswered).toBe(false);
      expect(result.current.isAnswering).toBe(false);
    });

    test('setTimeRemainingが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());

      act(() => {
        result.current.setTimeRemaining(15);
      });

      expect(result.current.timeRemaining).toBe(15);
    });

    test('setIsAnsweringが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());

      act(() => {
        result.current.setIsAnswering(true);
      });

      expect(result.current.isAnswering).toBe(true);
    });

    test('setHasAnsweredが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());

      act(() => {
        result.current.setHasAnswered(true);
      });

      expect(result.current.hasAnswered).toBe(true);
    });
  });

  describe('Answer actions', () => {
    test('addAnswerが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());

      act(() => {
        result.current.addAnswer(mockAnswer);
      });

      expect(result.current.userAnswers).toContainEqual(mockAnswer);
      expect(result.current.hasAnswered).toBe(true);
      expect(result.current.isAnswering).toBe(false);
    });

    test('複数の回答を追加できること', () => {
      const { result } = renderHook(() => useQuizStore());
      const answer2 = { ...mockAnswer, id: 'answer-2', questionId: 'q2' };

      act(() => {
        result.current.addAnswer(mockAnswer);
        result.current.addAnswer(answer2);
      });

      expect(result.current.userAnswers).toHaveLength(2);
      expect(result.current.userAnswers).toContainEqual(mockAnswer);
      expect(result.current.userAnswers).toContainEqual(answer2);
    });
  });

  describe('Round results actions', () => {
    test('setRoundResultsが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());
      const roundResults = {
        survivors: [mockParticipant],
        eliminated: [],
        round: 1
      };

      act(() => {
        result.current.setRoundResults(roundResults);
      });

      expect(result.current.roundResults).toEqual(roundResults);
    });

    test('clearRoundResultsが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());
      const roundResults = {
        survivors: [mockParticipant],
        eliminated: [],
        round: 1
      };

      act(() => {
        result.current.setRoundResults(roundResults);
        result.current.clearRoundResults();
      });

      expect(result.current.roundResults).toBeNull();
    });
  });

  describe('Revival actions', () => {
    test('setRevivalInProgressが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());

      act(() => {
        result.current.setRevivalInProgress(true);
      });

      expect(result.current.revivalInProgress).toBe(true);
    });

    test('setRevivalCandidatesが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());
      const candidates = [mockParticipant];

      act(() => {
        result.current.setRevivalCandidates(candidates);
      });

      expect(result.current.revivalCandidates).toEqual(candidates);
    });

    test('setRevivedParticipantsが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());
      const revived = [mockParticipant];

      act(() => {
        result.current.setRevivedParticipants(revived);
      });

      expect(result.current.revivedParticipants).toEqual(revived);
    });
  });

  describe('Connection state actions', () => {
    test('setIsConnectedが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());

      act(() => {
        result.current.setIsConnected(true);
      });

      expect(result.current.isConnected).toBe(true);
    });

    test('setIsLoadingが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());

      act(() => {
        result.current.setIsLoading(true);
      });

      expect(result.current.isLoading).toBe(true);
    });

    test('setErrorが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');
    });
  });

  describe('Reset actions', () => {
    test('resetQuizStateが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());

      // 各種状態を設定
      act(() => {
        result.current.setCurrentSession(mockSession);
        result.current.setCurrentQuestion(mockQuestion);
        result.current.addParticipant(mockParticipant);
        result.current.addAnswer(mockAnswer);
        result.current.setIsConnected(true);
        result.current.setError('Test error');
      });

      // リセット実行
      act(() => {
        result.current.resetQuizState();
      });

      // 初期状態に戻っていることを確認
      expect(result.current.currentSession).toBeNull();
      expect(result.current.currentQuestion).toBeNull();
      expect(result.current.participants).toEqual([]);
      expect(result.current.userAnswers).toEqual([]);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('resetRoundStateが正しく動作すること', () => {
      const { result } = renderHook(() => useQuizStore());

      // ラウンド関連の状態を設定
      act(() => {
        result.current.setCurrentQuestion(mockQuestion);
        result.current.setTimeRemaining(15);
        result.current.setIsAnswering(true);
        result.current.setHasAnswered(true);
        result.current.setRoundResults({
          survivors: [mockParticipant],
          eliminated: [],
          round: 1
        });
      });

      // resetRoundState実行
      act(() => {
        result.current.resetRoundState();
      });

      // ラウンド関連の状態がリセットされていることを確認
      expect(result.current.currentQuestion).toBeNull();
      expect(result.current.timeRemaining).toBe(0);
      expect(result.current.isAnswering).toBe(false);
      expect(result.current.hasAnswered).toBe(false);
      expect(result.current.roundResults).toBeNull();
    });

    test('resetRoundStateは他の状態に影響しないこと', () => {
      const { result } = renderHook(() => useQuizStore());

      // セッション関連の状態を設定
      act(() => {
        result.current.setCurrentSession(mockSession);
        result.current.addParticipant(mockParticipant);
        result.current.setIsConnected(true);
        result.current.setCurrentQuestion(mockQuestion);
      });

      // resetRoundState実行
      act(() => {
        result.current.resetRoundState();
      });

      // セッション関連の状態は保持されていることを確認
      expect(result.current.currentSession).toEqual(mockSession);
      expect(result.current.participants).toContainEqual(mockParticipant);
      expect(result.current.isConnected).toBe(true);
    });
  });

  test('複数のアクションを組み合わせた場合の動作', () => {
    const { result } = renderHook(() => useQuizStore());

    act(() => {
      result.current.setCurrentSession(mockSession);
      result.current.addParticipant(mockParticipant);
      result.current.setCurrentQuestion(mockQuestion);
      result.current.setTimeRemaining(20);
      result.current.setIsAnswering(true);
      result.current.addAnswer(mockAnswer);
    });

    expect(result.current.currentSession).toEqual(mockSession);
    expect(result.current.participants).toContainEqual(mockParticipant);
    expect(result.current.currentQuestion).toEqual(mockQuestion);
    expect(result.current.timeRemaining).toBe(20);
    expect(result.current.hasAnswered).toBe(true); // addAnswerで自動的にtrueになる
    expect(result.current.isAnswering).toBe(false); // addAnswerで自動的にfalseになる
    expect(result.current.userAnswers).toContainEqual(mockAnswer);
  });
});