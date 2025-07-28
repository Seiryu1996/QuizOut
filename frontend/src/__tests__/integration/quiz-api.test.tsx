import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import { useAPI } from '@/hooks/useAPI';
import { renderHook, act } from '@testing-library/react';

// useAPIフックの動作テスト用コンポーネント
function TestComponent() {
  const api = useAPI();

  return (
    <div>
      <button 
        onClick={() => api.fetchQuestion('valid-session')}
        data-testid="fetch-question"
      >
        問題取得
      </button>
      <button 
        onClick={() => api.submitAnswer('question-1', 0, 1000)}
        data-testid="submit-answer"
      >
        回答送信
      </button>
    </div>
  );
}

describe('Quiz API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('問題取得APIが正常に動作すること', async () => {
    const { result } = renderHook(() => useAPI());

    await act(async () => {
      const response = await result.current.fetchQuestion('valid-session');
      
      expect(response).toEqual({
        success: true,
        data: {
          id: 'question-1',
          text: 'MSWテスト問題1: 日本の首都はどこですか？',
          options: ['東京', '大阪', '京都', '名古屋'],
          correctAnswer: 0,
          round: 1,
          category: '地理',
          difficulty: 'easy',
          createdAt: '2024-01-01T00:00:00Z',
        },
      });
    });
  });

  test('存在しないセッションでの問題取得エラーが正しく処理されること', async () => {
    const { result } = renderHook(() => useAPI());

    await act(async () => {
      try {
        await result.current.fetchQuestion('invalid-session');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data).toEqual({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'セッションが見つかりません',
          },
        });
      }
    });
  });

  test('回答送信APIが正常に動作すること', async () => {
    const { result } = renderHook(() => useAPI());

    await act(async () => {
      const response = await result.current.submitAnswer('question-1', 0, 1000);
      
      expect(response).toEqual({
        success: true,
        data: {
          isCorrect: true,
          correctAnswer: 0,
          score: 10,
          responseTime: 1000,
          nextQuestion: {
            id: 'question-2',
            text: 'MSWテスト問題2: Pythonの開発者は誰ですか？',
            options: ['グイド・ヴァンロッサム', 'ラリー・ウォール', 'ブレンダン・アイク', 'ジェームズ・ゴスリン'],
            correctAnswer: 0,
            round: 2,
            category: 'プログラミング',
            difficulty: 'medium',
            createdAt: '2024-01-01T00:00:00Z',
          },
        },
      });
    });
  });

  test('不正解時の回答送信が正しく処理されること', async () => {
    const { result } = renderHook(() => useAPI());

    await act(async () => {
      const response = await result.current.submitAnswer('question-1', 2, 1500);
      
      expect(response).toEqual({
        success: true,
        data: {
          isCorrect: false,
          correctAnswer: 0,
          score: 0,
          responseTime: 1500,
          nextQuestion: null,
        },
      });
    });
  });

  test('存在しない問題での回答送信エラーが正しく処理されること', async () => {
    const { result } = renderHook(() => useAPI());

    await act(async () => {
      try {
        await result.current.submitAnswer('nonexistent-question', 0, 1000);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data).toEqual({
          success: false,
          error: {
            code: 'QUESTION_NOT_FOUND',
            message: '問題が見つかりません',
          },
        });
      }
    });
  });

  test('ネットワークエラー時の処理が正しいこと', async () => {
    // ネットワークエラーをシミュレート
    server.use(
      http.get('/api/quiz/questions/:sessionId', () => {
        return HttpResponse.error();
      })
    );

    const { result } = renderHook(() => useAPI());

    await act(async () => {
      try {
        await result.current.fetchQuestion('valid-session');
      } catch (error: any) {
        expect(error.name).toBe('NetworkError');
      }
    });
  });

  test('APIタイムアウト時の処理が正しいこと', async () => {
    // タイムアウトをシミュレート
    server.use(
      http.get('/api/quiz/questions/:sessionId', async () => {
        await new Promise(resolve => setTimeout(resolve, 6000)); // 6秒待機
        return HttpResponse.json({ success: true });
      })
    );

    const { result } = renderHook(() => useAPI());

    await act(async () => {
      try {
        await result.current.fetchQuestion('valid-session');
      } catch (error: any) {
        expect(error.name).toBe('TimeoutError');
      }
    });
  }, 10000); // テストタイムアウトを10秒に設定

  test('複数の同時API呼び出しが正しく処理されること', async () => {
    const { result } = renderHook(() => useAPI());

    await act(async () => {
      // 同時に複数のAPIを呼び出し
      const promises = [
        result.current.fetchQuestion('valid-session'),
        result.current.getSessionInfo('valid-session'),
        result.current.getParticipants('valid-session'),
      ];

      const responses = await Promise.all(promises);

      // 全てのAPIが成功すること
      responses.forEach(response => {
        expect(response.success).toBe(true);
      });

      // 問題データの確認
      expect(responses[0].data.id).toBe('question-1');
      
      // セッション情報の確認
      expect(responses[1].data.id).toBe('session-1');
      expect(responses[1].data.title).toBe('テストセッション');
      
      // 参加者情報の確認
      expect(responses[2].data).toHaveLength(2);
      expect(responses[2].data[0].displayName).toBe('テスト参加者1');
    });
  });

  test('APIレスポンスの形式が正しいこと', async () => {
    const { result } = renderHook(() => useAPI());

    await act(async () => {
      const response = await result.current.fetchQuestion('valid-session');
      
      // レスポンス構造の確認
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response.success).toBe(true);
      
      // 問題データの形式確認
      const question = response.data;
      expect(question).toHaveProperty('id');
      expect(question).toHaveProperty('text');
      expect(question).toHaveProperty('options');
      expect(question).toHaveProperty('correctAnswer');
      expect(question).toHaveProperty('round');
      expect(question).toHaveProperty('category');
      expect(question).toHaveProperty('difficulty');
      expect(question).toHaveProperty('createdAt');
      
      // 選択肢が4つであること
      expect(question.options).toHaveLength(4);
      
      // 正解番号が有効範囲内であること
      expect(question.correctAnswer).toBeGreaterThanOrEqual(0);
      expect(question.correctAnswer).toBeLessThan(question.options.length);
    });
  });

  test('エラーレスポンスの形式が正しいこと', async () => {
    const { result } = renderHook(() => useAPI());

    await act(async () => {
      try {
        await result.current.fetchQuestion('invalid-session');
      } catch (error: any) {
        const errorResponse = error.response.data;
        
        // エラーレスポンス構造の確認
        expect(errorResponse).toHaveProperty('success');
        expect(errorResponse).toHaveProperty('error');
        expect(errorResponse.success).toBe(false);
        
        // エラー情報の形式確認
        const errorInfo = errorResponse.error;
        expect(errorInfo).toHaveProperty('code');
        expect(errorInfo).toHaveProperty('message');
        expect(typeof errorInfo.code).toBe('string');
        expect(typeof errorInfo.message).toBe('string');
      }
    });
  });

  test('APIレスポンス時間の測定が正しいこと', async () => {
    const { result } = renderHook(() => useAPI());

    const startTime = Date.now();
    
    await act(async () => {
      await result.current.fetchQuestion('valid-session');
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // レスポンス時間が合理的な範囲内であること（100ms以上、3秒以下）
    expect(responseTime).toBeGreaterThan(100);
    expect(responseTime).toBeLessThan(3000);
  });
});