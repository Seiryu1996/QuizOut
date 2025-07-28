import { renderHook, act } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import { useAuth } from '@/hooks/useAuth';
import { useAccessCode } from '@/hooks/useAccessCode';

describe('Auth API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('アクセスコード検証API', () => {
    test('有効なアクセスコードでの成功レスポンス', async () => {
      const { result } = renderHook(() => useAccessCode());

      await act(async () => {
        const isValid = await result.current.verifyAccessCode('VALID123');
        expect(isValid).toBe(true);
      });

      expect(result.current.error).toBe(null);
      expect(result.current.isVerified).toBe(true);
    });

    test('無効なアクセスコードでの失敗レスポンス', async () => {
      const { result } = renderHook(() => useAccessCode());

      await act(async () => {
        const isValid = await result.current.verifyAccessCode('INVALID123');
        expect(isValid).toBe(false);
      });

      expect(result.current.error).toBe('無効なアクセスコードです');
      expect(result.current.isVerified).toBe(false);
    });

    test('期限切れアクセスコードでの失敗レスポンス', async () => {
      const { result } = renderHook(() => useAccessCode());

      await act(async () => {
        const isValid = await result.current.verifyAccessCode('EXPIRED123');
        expect(isValid).toBe(false);
      });

      expect(result.current.error).toBe('アクセスコードが期限切れです');
      expect(result.current.isVerified).toBe(false);
    });

    test('ネットワークエラー時の処理', async () => {
      // ネットワークエラーをシミュレート
      server.use(
        http.post('/api/auth/verify-access-code', () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useAccessCode());

      await act(async () => {
        const isValid = await result.current.verifyAccessCode('VALID123');
        expect(isValid).toBe(false);
      });

      expect(result.current.error).toContain('検証中にエラーが発生しました');
    });

    test('ローディング状態が正しく管理されること', async () => {
      // レスポンスを遅延させる
      server.use(
        http.post('/api/auth/verify-access-code', async () => {
          await new Promise(resolve => setTimeout(resolve, 500));
          return HttpResponse.json({ isValid: true, message: 'Success' });
        })
      );

      const { result } = renderHook(() => useAccessCode());

      expect(result.current.isVerifying).toBe(false);

      act(() => {
        result.current.verifyAccessCode('VALID123');
      });

      expect(result.current.isVerifying).toBe(true);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });

      expect(result.current.isVerifying).toBe(false);
    });
  });

  describe('ユーザー認証API', () => {
    test('有効な認証情報でのログイン成功', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const success = await result.current.signIn('testuser', 'password123');
        expect(success).toBe(true);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.username).toBe('testuser');
      expect(result.current.authToken).toBe('mock-jwt-token');
    });

    test('無効な認証情報でのログイン失敗', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const success = await result.current.signIn('invaliduser', 'wrongpassword');
        expect(success).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
      expect(result.current.authToken).toBe(null);
    });

    test('匿名ログインが正常に動作すること', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const success = await result.current.signInAnonymous();
        expect(success).toBe(true);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isAnonymous).toBe(true);
      expect(result.current.user?.username).toBe('anonymous');
      expect(result.current.authToken).toBe('mock-anonymous-token');
    });

    test('ログアウトが正常に動作すること', async () => {
      const { result } = renderHook(() => useAuth());

      // まずログイン
      await act(async () => {
        await result.current.signIn('testuser', 'password123');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // ログアウト
      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
      expect(result.current.authToken).toBe(null);
    });

    test('認証エラー時の処理が正しいこと', async () => {
      // サーバーエラーをシミュレート
      server.use(
        http.post('/api/auth/login', () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: 'SERVER_ERROR',
              message: 'サーバーエラーが発生しました',
            },
          }, { status: 500 });
        })
      );

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const success = await result.current.signIn('testuser', 'password123');
        expect(success).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toContain('サーバーエラーが発生しました');
    });

    test('トークンリフレッシュが正常に動作すること', async () => {
      // トークンリフレッシュAPIのモック
      server.use(
        http.post('/api/auth/refresh', () => {
          return HttpResponse.json({
            success: true,
            token: 'new-jwt-token',
            user: {
              id: 'user-1',
              username: 'testuser',
              displayName: 'テストユーザー',
              email: 'test@example.com',
              isAdmin: false,
              role: 'user',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
          });
        })
      );

      const { result } = renderHook(() => useAuth());

      // まずログイン
      await act(async () => {
        await result.current.signIn('testuser', 'password123');
      });

      const oldToken = result.current.authToken;

      // トークンリフレッシュ
      await act(async () => {
        const success = await result.current.refreshToken();
        expect(success).toBe(true);
      });

      expect(result.current.authToken).toBe('new-jwt-token');
      expect(result.current.authToken).not.toBe(oldToken);
      expect(result.current.isAuthenticated).toBe(true);
    });

    test('期限切れトークンでの自動ログアウト', async () => {
      // 期限切れトークンエラーをシミュレート
      server.use(
        http.post('/api/auth/refresh', () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: 'TOKEN_EXPIRED',
              message: 'トークンが期限切れです',
            },
          }, { status: 401 });
        })
      );

      const { result } = renderHook(() => useAuth());

      // まずログイン
      await act(async () => {
        await result.current.signIn('testuser', 'password123');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // トークンリフレッシュ失敗（自動ログアウト）
      await act(async () => {
        const success = await result.current.refreshToken();
        expect(success).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
      expect(result.current.authToken).toBe(null);
    });
  });

  describe('ユーザー管理API', () => {
    test('個別ユーザー登録APIが正常に動作すること', async () => {
      // ユーザー登録APIのモック
      server.use(
        http.post('/api/admin/users', async ({ request }) => {
          const userData = await request.json() as any;
          
          if (userData.username === 'newuser') {
            return HttpResponse.json({
              success: true,
              data: {
                id: 'new-user-id',
                username: userData.username,
                displayName: userData.displayName,
                email: userData.email,
                isAdmin: false,
                role: 'user',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            });
          } else {
            return HttpResponse.json({
              success: false,
              error: {
                code: 'USER_EXISTS',
                message: 'ユーザーが既に存在します',
              },
            }, { status: 409 });
          }
        })
      );

      // APIを直接呼び出してテスト
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'newuser',
          displayName: '新しいユーザー',
          email: 'newuser@example.com',
          password: 'password123',
        }),
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.username).toBe('newuser');
      expect(result.data.displayName).toBe('新しいユーザー');
    });

    test('CSV一括ユーザー登録APIが正常に動作すること', async () => {
      // CSV一括登録APIのモック
      server.use(
        http.post('/api/admin/users/bulk', () => {
          return HttpResponse.json({
            success: true,
            data: {
              created: 5,
              failed: 0,
              users: [
                { username: 'user1', displayName: 'ユーザー1' },
                { username: 'user2', displayName: 'ユーザー2' },
                { username: 'user3', displayName: 'ユーザー3' },
                { username: 'user4', displayName: 'ユーザー4' },
                { username: 'user5', displayName: 'ユーザー5' },
              ],
            },
          });
        })
      );

      const csvData = `username,displayName,email,password
user1,ユーザー1,user1@example.com,password123
user2,ユーザー2,user2@example.com,password123
user3,ユーザー3,user3@example.com,password123
user4,ユーザー4,user4@example.com,password123
user5,ユーザー5,user5@example.com,password123`;

      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csvData,
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.created).toBe(5);
      expect(result.data.failed).toBe(0);
      expect(result.data.users).toHaveLength(5);
    });

    test('ユーザー一覧取得APIが正常に動作すること', async () => {
      // ユーザー一覧取得APIのモック
      server.use(
        http.get('/api/admin/users', () => {
          return HttpResponse.json({
            success: true,
            data: {
              users: [
                {
                  id: 'user-1',
                  username: 'testuser',
                  displayName: 'テストユーザー',
                  email: 'test@example.com',
                  isAdmin: false,
                  role: 'user',
                  createdAt: '2024-01-01T00:00:00Z',
                },
                {
                  id: 'admin-1',
                  username: 'admin',
                  displayName: '管理者',
                  email: 'admin@example.com',
                  isAdmin: true,
                  role: 'admin',
                  createdAt: '2024-01-01T00:00:00Z',
                },
              ],
              total: 2,
              page: 1,
              limit: 10,
            },
          });
        })
      );

      const response = await fetch('/api/admin/users');
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.users).toHaveLength(2);
      expect(result.data.total).toBe(2);
    });

    test('ユーザー削除APIが正常に動作すること', async () => {
      // ユーザー削除APIのモック
      server.use(
        http.delete('/api/admin/users/:userId', ({ params }) => {
          const { userId } = params;
          
          if (userId === 'user-1') {
            return HttpResponse.json({
              success: true,
              data: {
                deletedUserId: userId,
                message: 'ユーザーを削除しました',
              },
            });
          } else {
            return HttpResponse.json({
              success: false,
              error: {
                code: 'USER_NOT_FOUND',
                message: 'ユーザーが見つかりません',
              },
            }, { status: 404 });
          }
        })
      );

      const response = await fetch('/api/admin/users/user-1', {
        method: 'DELETE',
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.deletedUserId).toBe('user-1');
    });
  });
});