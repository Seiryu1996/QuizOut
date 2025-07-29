import { create } from 'zustand';
import { Game, Question, Participant, Answer } from '@/types/quiz';

interface QuizState {
  // Game state
  currentGame: Game | null;
  participants: Participant[];
  
  // Question state
  questions: Question[];
  currentQuestion: Question | null;
  timeRemaining: number;
  isAnswering: boolean;
  hasAnswered: boolean;
  
  // User's answers
  userAnswers: Answer[];
  
  // Round results
  roundResults: {
    survivors: Participant[];
    eliminated: Participant[];
    round: number;
  } | null;
  
  // Revival state
  revivalInProgress: boolean;
  revivalCandidates: Participant[];
  revivedParticipants: Participant[];
  
  // UI state
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

interface QuizActions {
  // Game actions
  setCurrentGame: (game: Game | null) => void;
  updateGameStatus: (status: Game['status']) => void;
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  
  // Question actions
  setQuestions: (questions: Question[]) => void;
  addQuestion: (question: Question) => void;
  setCurrentQuestion: (question: Question | null) => void;
  setTimeRemaining: (time: number) => void;
  setIsAnswering: (isAnswering: boolean) => void;
  setHasAnswered: (hasAnswered: boolean) => void;
  
  // Answer actions
  addAnswer: (answer: Answer) => void;
  
  // Round results
  setRoundResults: (results: QuizState['roundResults']) => void;
  clearRoundResults: () => void;
  
  // Revival actions
  setRevivalInProgress: (inProgress: boolean) => void;
  setRevivalCandidates: (candidates: Participant[]) => void;
  setRevivedParticipants: (revived: Participant[]) => void;
  
  // Connection state
  setIsConnected: (connected: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Reset actions
  resetQuizState: () => void;
  resetRoundState: () => void;
}

const initialState: QuizState = {
  currentGame: null,
  participants: [],
  questions: [],
  currentQuestion: null,
  timeRemaining: 0,
  isAnswering: false,
  hasAnswered: false,
  userAnswers: [],
  roundResults: null,
  revivalInProgress: false,
  revivalCandidates: [],
  revivedParticipants: [],
  isConnected: false,
  isLoading: false,
  error: null,
};

export const useQuizStore = create<QuizState & QuizActions>((set, get) => ({
  ...initialState,
  
  // Game actions
  setCurrentGame: (game) => set({ currentGame: game }),
  
  updateGameStatus: (status) => set((state) => ({
    currentGame: state.currentGame ? {
      ...state.currentGame,
      status
    } : null
  })),
  
  setParticipants: (participants) => set({ participants }),
  
  addParticipant: (participant) => set((state) => ({
    participants: [...state.participants.filter(p => p.userId !== participant.userId), participant]
  })),
  
  removeParticipant: (userId) => set((state) => ({
    participants: state.participants.filter(p => p.userId !== userId)
  })),
  
  // Question actions
  setQuestions: (questions) => set({ questions }),
  
  addQuestion: (question) => set((state) => ({
    questions: [...state.questions.filter(q => q.id !== question.id), question].sort((a, b) => a.round - b.round)
  })),
  
  setCurrentQuestion: (question) => set({ 
    currentQuestion: question,
    hasAnswered: false,
    isAnswering: false
  }),
  
  setTimeRemaining: (time) => set({ timeRemaining: time }),
  setIsAnswering: (isAnswering) => set({ isAnswering }),
  setHasAnswered: (hasAnswered) => set({ hasAnswered }),
  
  // Answer actions
  addAnswer: (answer) => set((state) => ({
    userAnswers: [...state.userAnswers, answer],
    hasAnswered: true,
    isAnswering: false
  })),
  
  // Round results
  setRoundResults: (results) => set({ roundResults: results }),
  clearRoundResults: () => set({ roundResults: null }),
  
  // Revival actions
  setRevivalInProgress: (inProgress) => set({ revivalInProgress: inProgress }),
  setRevivalCandidates: (candidates) => set({ revivalCandidates: candidates }),
  setRevivedParticipants: (revived) => set({ revivedParticipants: revived }),
  
  // Connection state
  setIsConnected: (connected) => set({ isConnected: connected }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  // Reset actions
  resetQuizState: () => set(initialState),
  
  resetRoundState: () => set({
    currentQuestion: null,
    timeRemaining: 0,
    isAnswering: false,
    hasAnswered: false,
    roundResults: null,
    questions: []
  }),
}));