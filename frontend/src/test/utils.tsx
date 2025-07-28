import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Question, Participant, Session } from '@/types/quiz';
import { User } from '@/types/auth';

// カスタムレンダー関数
const customRender = (
  ui: ReactElement,
  options?: RenderOptions
) => render(ui, { ...options });

// テストデータ作成ヘルパー関数

// モック問題作成
export const createMockQuestion = (overrides: Partial<Question> = {}): Question => ({
  id: 'test-question-1',
  question: 'テスト問題文です',
  options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
  correctAnswer: 0,
  explanation: 'テスト説明',
  difficulty: 'medium',
  category: 'general',
  tags: ['test'],
  timeLimit: 30,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

// モック参加者作成
export const createMockParticipant = (overrides: Partial<Participant> = {}): Participant => ({
  userId: 'test-user-1',
  displayName: 'テスト参加者',
  status: 'active',
  score: 100,
  isAdmin: false,
  joinedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

// モックセッション作成
export const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'test-session-1',
  title: 'テストセッション',
  status: 'active',
  currentRound: 1,
  maxRounds: 10,
  settings: {
    timeLimit: 30,
    revivalEnabled: true,
    revivalCount: 3,
    minParticipants: 2,
    maxParticipants: 20,
    autoStart: false,
    shuffleQuestions: true,
    showCorrectAnswer: true,
    allowSpectators: false
  },
  createdBy: 'admin-1',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

// モックユーザー作成
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'test-user-1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  isAdmin: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

// モック管理者ユーザー作成
export const createMockAdminUser = (overrides: Partial<User> = {}): User => 
  createMockUser({
    username: 'admin',
    email: 'admin@example.com',
    isAdmin: true,
    role: 'admin',
    ...overrides,
  });

// 複数参加者の作成
export const createMockParticipants = (count: number): Participant[] => {
  return Array.from({ length: count }, (_, index) => createMockParticipant({
    userId: `user-${index + 1}`,
    displayName: `参加者${index + 1}`,
    score: Math.floor(Math.random() * 200),
  }));
};

// WebSocketメッセージのモック作成
export const createMockWebSocketMessage = (type: string, data: any) => ({
  type,
  data,
  timestamp: new Date().toISOString(),
});

// APIレスポンスのモック作成
export const createMockAPIResponse = <T,>(data: T, success = true) => ({
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

// デフォルトエクスポート（カスタムレンダー）
export { customRender as render };

// 全てのテストユーティリティをエクスポート
export * from '@testing-library/react';
export { customRender };

// 型定義のエクスポート
export type { Question, Participant, Session, User };