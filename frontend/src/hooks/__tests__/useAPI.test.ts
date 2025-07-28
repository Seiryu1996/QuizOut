import { renderHook } from '@testing-library/react';
import { useAPI } from '../useAPI';
import { useUserStore } from '@/store/userStore';
import { createAPIClient } from '@/services/api';

// Mocks
jest.mock('@/store/userStore', () => ({
  useUserStore: jest.fn(),
}));

jest.mock('@/services/api', () => ({
  createAPIClient: jest.fn(),
}));

const mockUseUserStore = useUserStore as jest.Mock;
const mockCreateAPIClient = createAPIClient as jest.Mock;

describe('useAPI Hook', () => {
  const mockApiClient = {
    getSessionInfo: jest.fn(),
    joinSession: jest.fn(),
    getParticipants: jest.fn(),
    submitAnswer: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateAPIClient.mockReturnValue(mockApiClient);
  });

  test('authTokenが存在する場合にAPIクライアントが作成されること', () => {
    const testToken = 'test-auth-token';
    mockUseUserStore.mockReturnValue(testToken);

    const { result } = renderHook(() => useAPI());

    expect(mockCreateAPIClient).toHaveBeenCalledWith(expect.any(Function));
    expect(result.current).toBe(mockApiClient);
  });

  test('authTokenがnullの場合もAPIクライアントが作成されること', () => {
    mockUseUserStore.mockReturnValue(null);

    const { result } = renderHook(() => useAPI());

    expect(mockCreateAPIClient).toHaveBeenCalledWith(expect.any(Function));
    expect(result.current).toBe(mockApiClient);
  });

  test('authTokenが変更された時にAPIクライアントが再作成されること', () => {
    const { result, rerender } = renderHook(() => useAPI());

    // 初回レンダリング
    mockUseUserStore.mockReturnValue('token1');
    rerender();

    expect(mockCreateAPIClient).toHaveBeenCalledTimes(1);

    // トークンが変更
    mockUseUserStore.mockReturnValue('token2');
    rerender();

    expect(mockCreateAPIClient).toHaveBeenCalledTimes(2);
  });

  test('同じauthTokenの場合はAPIクライアントが再作成されないこと', () => {
    const testToken = 'stable-token';
    mockUseUserStore.mockReturnValue(testToken);

    const { rerender } = renderHook(() => useAPI());

    expect(mockCreateAPIClient).toHaveBeenCalledTimes(1);

    // 同じトークンで再レンダリング
    rerender();

    expect(mockCreateAPIClient).toHaveBeenCalledTimes(1);
  });

  test('createAPIClientに渡される関数が正しいトークンを返すこと', () => {
    const testToken = 'test-token-123';
    mockUseUserStore.mockReturnValue(testToken);

    renderHook(() => useAPI());

    // createAPIClientに渡された関数を取得
    const tokenGetter = mockCreateAPIClient.mock.calls[0][0];
    expect(typeof tokenGetter).toBe('function');
    expect(tokenGetter()).toBe(testToken);
  });

  test('authTokenが未定義の場合も正しく処理されること', () => {
    mockUseUserStore.mockReturnValue(undefined);

    const { result } = renderHook(() => useAPI());

    expect(mockCreateAPIClient).toHaveBeenCalledWith(expect.any(Function));
    expect(result.current).toBe(mockApiClient);

    // createAPIClientに渡された関数を取得してテスト
    const tokenGetter = mockCreateAPIClient.mock.calls[0][0];
    expect(tokenGetter()).toBeUndefined();
  });

  test('複数回レンダリングされても同じAPIクライアントインスタンスが返されること', () => {
    const testToken = 'consistent-token';
    mockUseUserStore.mockReturnValue(testToken);

    const { result, rerender } = renderHook(() => useAPI());
    const firstResult = result.current;

    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
    expect(mockCreateAPIClient).toHaveBeenCalledTimes(1);
  });

  test('authTokenの型がstringの場合とnullの場合の切り替え', () => {
    // 最初にstring
    mockUseUserStore.mockReturnValue('string-token');
    const { rerender } = renderHook(() => useAPI());

    let tokenGetter = mockCreateAPIClient.mock.calls[0][0];
    expect(tokenGetter()).toBe('string-token');

    // nullに変更
    mockUseUserStore.mockReturnValue(null);
    rerender();

    tokenGetter = mockCreateAPIClient.mock.calls[1][0];
    expect(tokenGetter()).toBeNull();

    expect(mockCreateAPIClient).toHaveBeenCalledTimes(2);
  });
});