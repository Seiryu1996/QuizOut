import { create } from 'zustand';
import { Session, Question, Participant, Answer } from '@/types/quiz';

interface QuizState {
  // Session state
  currentSession: Session | null;
  participants: Participant[];
  
  // Question state
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
  // Session actions
  setCurrentSession: (session: Session | null) => void;
  updateSessionStatus: (status: Session['status']) => void;
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  
  // Question actions
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
  currentSession: null,
  participants: [],
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
  
  // Session actions
  setCurrentSession: (session) => set({ currentSession: session }),
  
  updateSessionStatus: (status) => set((state) => ({
    currentSession: state.currentSession ? {
      ...state.currentSession,
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
    roundResults: null
  }),
}));