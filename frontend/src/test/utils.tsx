import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Question, Participant, Session } from '@/types/quiz';
import { User } from '@/types/auth';

// テスト用のプロバイダー
interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// カスタムレンダー関数
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// テストデータ作成ヘルパー関数

// モック問題作成
export const createMockQuestion = (overrides: Partial<Question> = {}): Question => ({
  id: 'test-question-1',
  text: 'テスト問題文です',
  options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
  round: 1,
  category: '一般',
  difficulty: 'medium',
  createdAt: '2024-01-01T00:00:00Z',
  correctAnswer: 0,
  ...overrides,
});

// モック参加者作成
export const createMockParticipant = (overrides: Partial<Participant> = {}): Participant => ({
  id: 'test-participant-1',
  userId: 'test-user-1',
  displayName: 'テスト参加者',
  status: 'active',
  score: 100,
  correctAnswers: 5,
  joinedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

// モックセッション作成
export const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'test-session-1',
  title: 'テストセッション',
  status: 'waiting',
  currentRound: 1,
  maxParticipants: 200,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  settings: {
    timeLimit: 30,
    revivalEnabled: true,
    revivalCount: 3,
  },
  participantCount: 0,
  activeCount: 0,
  ...overrides,
});

// モックユーザー作成
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'test-user-1',
  username: 'testuser',
  displayName: 'テストユーザー',
  email: 'test@example.com',
  isAdmin: false,
  role: 'user',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

// モック管理者ユーザー作成
export const createMockAdminUser = (overrides: Partial<User> = {}): User => 
  createMockUser({
    username: 'admin',
    displayName: '管理者',
    email: 'admin@example.com',
    isAdmin: true,
    role: 'admin',
    ...overrides,
  });

// 複数参加者の作成
export const createMockParticipants = (count: number): Participant[] => {
  return Array.from({ length: count }, (_, index) => createMockParticipant({
    id: `participant-${index + 1}`,
    userId: `user-${index + 1}`,
    displayName: `参加者${index + 1}`,
    score: Math.floor(Math.random() * 200),
    correctAnswers: Math.floor(Math.random() * 10),
  }));
};

// WebSocketメッセージのモック作成
export const createMockWebSocketMessage = (type: string, data: any) => ({
  type,
  data,
  timestamp: new Date().toISOString(),
});

// APIレスポンスのモック作成
export const createMockAPIResponse = <T>(data: T, success = true) => ({
  success,
  data: success ? data : undefined,
  error: success ? undefined : {
    code: 'TEST_ERROR',
    message: 'テストエラーです',
  },
});

// 時間を進めるヘルパー
export const advanceTimers = (ms: number) => {
  jest.advanceTimersByTime(ms);
};

// 非同期待機ヘルパー
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

// イベントハンドラーのモック作成
export const createMockEventHandler = () => jest.fn();

// ローカルストレージのモック操作
export const mockLocalStorage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
  removeItem: (key: string) => window.localStorage.removeItem(key),
  clear: () => window.localStorage.clear(),
};

// セッションストレージのモック操作
export const mockSessionStorage = {
  getItem: (key: string) => window.sessionStorage.getItem(key),
  setItem: (key: string, value: string) => window.sessionStorage.setItem(key, value),
  removeItem: (key: string) => window.sessionStorage.removeItem(key),
  clear: () => window.sessionStorage.clear(),
};

// テスト用のカスタムマッチャー
export const customMatchers = {
  toHaveLoadingState: (received: HTMLElement) => {
    const hasLoadingSpinner = received.querySelector('[data-testid="loading-spinner"]');
    const hasLoadingText = received.textContent?.includes('読み込み中');
    
    return {
      pass: hasLoadingSpinner !== null || hasLoadingText === true,
      message: () => `expected element to have loading state`,
    };
  },
  
  toHaveErrorState: (received: HTMLElement, expectedError?: string) => {
    const hasErrorElement = received.querySelector('[data-testid="error-message"]');
    const errorText = hasErrorElement?.textContent;
    
    const pass = hasErrorElement !== null && 
      (expectedError ? errorText?.includes(expectedError) : true);
    
    return {
      pass,
      message: () => `expected element to have error state${expectedError ? ` with message "${expectedError}"` : ''}`,
    };
  },
};

// デフォルトエクスポート（カスタムレンダー）
export { customRender as render };

// 全てのテストユーティリティをエクスポート
export * from '@testing-library/react';
export { customRender };

// 型定義のエクスポート
export type { Question, Participant, Session, User };