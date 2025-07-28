import '@testing-library/jest-dom';
// import { server } from './mocks/server';

// グローバルなテスト設定

// fetch polyfill
global.fetch = jest.fn();

// IntersectionObserver のモック
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// ResizeObserver のモック
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// window.matchMedia のモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// window.scrollTo のモック
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// localStorage のモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// sessionStorage のモック
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// console.error を一時的に無効化（React Testing Library の警告を抑制）
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

// テスト前後のクリーンアップ
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// タイマーのセットアップ
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// 非同期エラーの処理
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// MSWサーバーのセットアップ（一時的にコメントアウト）
// beforeAll(() => {
//   server.listen({ onUnhandledRequest: 'error' });
// });

// afterEach(() => {
//   server.resetHandlers();
// });

// afterAll(() => {
//   server.close();
// });

// テスト環境の確認（Jestが自動的にtest環境を設定しない場合があるため、より緩やかなチェック）
if (process.env.NODE_ENV && process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
  console.warn('This setup file is intended for test environment');
}