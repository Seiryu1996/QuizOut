import { create } from 'zustand';
import { Session, Participant } from '@/types/quiz';

interface SessionStats {
  session: {
    id: string;
    title: string;
    status: string;
    currentRound: number;
    createdAt: string;
  };
  participants: {
    total: number;
    active: number;
    eliminated: number;
    connected: number;
  };
  questions: {
    total: number;
  };
  answers: {
    total: number;
    correct: number;
    correctRate: number;
  };
}

interface AdminState {
  // 管理中のセッション
  managedSessions: Session[];
  
  // 現在選択中のセッション
  selectedSession: Session | null;
  
  // セッション統計
  sessionStats: SessionStats | null;
  
  // 参加者管理
  allParticipants: Participant[];
  eliminatedParticipants: Participant[];
  
  // 画面状態
  activeView: 'dashboard' | 'participants' | 'questions' | 'results';
  isAdminMode: boolean;
  
  // 操作状態
  isGeneratingQuestion: boolean;
  isProcessingResults: boolean;
  isStartingRevival: boolean;
  
  // エラー状態
  error: string | null;
}

interface AdminActions {
  // セッション管理
  setManagedSessions: (sessions: Session[]) => void;
  addManagedSession: (session: Session) => void;
  updateManagedSession: (sessionId: string, updates: Partial<Session>) => void;
  removeManagedSession: (sessionId: string) => void;
  
  // セッション選択
  setSelectedSession: (session: Session | null) => void;
  
  // 統計データ
  setSessionStats: (stats: SessionStats | null) => void;
  
  // 参加者管理
  setAllParticipants: (participants: Participant[]) => void;
  setEliminatedParticipants: (participants: Participant[]) => void;
  updateParticipant: (participant: Participant) => void;
  
  // 画面制御
  setActiveView: (view: AdminState['activeView']) => void;
  setIsAdminMode: (isAdmin: boolean) => void;
  
  // 操作状態
  setIsGeneratingQuestion: (generating: boolean) => void;
  setIsProcessingResults: (processing: boolean) => void;
  setIsStartingRevival: (starting: boolean) => void;
  
  // エラー管理
  setError: (error: string | null) => void;
  
  // リセット
  resetAdminState: () => void;
}

const initialState: AdminState = {
  managedSessions: [],
  selectedSession: null,
  sessionStats: null,
  allParticipants: [],
  eliminatedParticipants: [],
  activeView: 'dashboard',
  isAdminMode: false,
  isGeneratingQuestion: false,
  isProcessingResults: false,
  isStartingRevival: false,
  error: null,
};

export const useAdminStore = create<AdminState & AdminActions>((set, get) => ({
  ...initialState,
  
  // セッション管理
  setManagedSessions: (sessions) => set({ managedSessions: sessions }),
  
  addManagedSession: (session) => set((state) => ({
    managedSessions: [...state.managedSessions, session]
  })),
  
  updateManagedSession: (sessionId, updates) => set((state) => ({
    managedSessions: state.managedSessions.map(session =>
      session.id === sessionId ? { ...session, ...updates } : session
    ),
    selectedSession: state.selectedSession?.id === sessionId
      ? { ...state.selectedSession, ...updates }
      : state.selectedSession
  })),
  
  removeManagedSession: (sessionId) => set((state) => ({
    managedSessions: state.managedSessions.filter(session => session.id !== sessionId),
    selectedSession: state.selectedSession?.id === sessionId ? null : state.selectedSession
  })),
  
  // セッション選択
  setSelectedSession: (session) => set({ selectedSession: session }),
  
  // 統計データ
  setSessionStats: (stats) => set({ sessionStats: stats }),
  
  // 参加者管理
  setAllParticipants: (participants) => set({ allParticipants: participants }),
  
  setEliminatedParticipants: (participants) => set({ eliminatedParticipants: participants }),
  
  updateParticipant: (participant) => set((state) => ({
    allParticipants: state.allParticipants.map(p =>
      p.userId === participant.userId ? participant : p
    )
  })),
  
  // 画面制御
  setActiveView: (activeView) => set({ activeView }),
  setIsAdminMode: (isAdminMode) => set({ isAdminMode }),
  
  // 操作状態
  setIsGeneratingQuestion: (isGeneratingQuestion) => set({ isGeneratingQuestion }),
  setIsProcessingResults: (isProcessingResults) => set({ isProcessingResults }),
  setIsStartingRevival: (isStartingRevival) => set({ isStartingRevival }),
  
  // エラー管理
  setError: (error) => set({ error }),
  
  // リセット
  resetAdminState: () => set(initialState),
}));