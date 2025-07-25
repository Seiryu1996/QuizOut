import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/quiz';

interface UserState {
  user: User | null;
  displayName: string;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  authToken: string | null;
}

interface UserActions {
  setUser: (user: User | null) => void;
  setDisplayName: (name: string) => void;
  setAuthToken: (token: string | null) => void;
  setIsAuthenticated: (authenticated: boolean) => void;
  setIsAnonymous: (anonymous: boolean) => void;
  logout: () => void;
}

const initialState: UserState = {
  user: null,
  displayName: '',
  isAuthenticated: false,
  isAnonymous: true,
  authToken: null,
};

export const useUserStore = create<UserState & UserActions>()(
  persist(
    (set) => ({
      ...initialState,
      
      setUser: (user) => set({ user }),
      
      setDisplayName: (displayName) => set({ displayName }),
      
      setAuthToken: (authToken) => set({ 
        authToken,
        isAuthenticated: !!authToken
      }),
      
      setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      
      setIsAnonymous: (isAnonymous) => set({ isAnonymous }),
      
      logout: () => set({
        user: null,
        authToken: null,
        isAuthenticated: false,
        displayName: '',
      }),
    }),
    {
      name: 'user-storage',
      // 機密情報は永続化しない
      partialize: (state) => ({
        displayName: state.displayName,
        isAnonymous: state.isAnonymous,
      }),
    }
  )
);