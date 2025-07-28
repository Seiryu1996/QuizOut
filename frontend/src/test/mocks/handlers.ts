import { http, HttpResponse } from 'msw';
import { Question, Participant, Session } from '@/types/quiz';
import { User } from '@/types/auth';

// モックデータ
const mockQuestions: Question[] = [
  {
    id: 'question-1',
    text: 'MSWテスト問題1: 日本の首都はどこですか？',
    options: ['東京', '大阪', '京都', '名古屋'],
    correctAnswer: 0,
    round: 1,
    category: '地理',
    difficulty: 'easy',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'question-2',
    text: 'MSWテスト問題2: Pythonの開発者は誰ですか？',
    options: ['グイド・ヴァンロッサム', 'ラリー・ウォール', 'ブレンダン・アイク', 'ジェームズ・ゴスリン'],
    correctAnswer: 0,
    round: 2,
    category: 'プログラミング',
    difficulty: 'medium',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const mockParticipants: Participant[] = [
  {
    id: 'participant-1',
    userId: 'user-1',
    displayName: 'テスト参加者1',
    status: 'active',
    score: 100,
    correctAnswers: 5,
    joinedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'participant-2',
    userId: 'user-2',
    displayName: 'テスト参加者2',
    status: 'eliminated',
    score: 60,
    correctAnswers: 3,
    joinedAt: '2024-01-01T00:00:00Z',
  },
];

const mockSession: Session = {
  id: 'session-1',
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
  participantCount: 2,
  activeCount: 1,
};

const mockUser: User = {
  id: 'user-1',
  username: 'testuser',
  displayName: 'テストユーザー',
  email: 'test@example.com',
  isAdmin: false,
  role: 'user',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const handlers = [
  // アクセスコード検証API
  http.post('/api/auth/verify-access-code', async ({ request }) => {
    const { accessCode } = await request.json() as { accessCode: string };
    
    if (accessCode === 'VALID123') {
      return HttpResponse.json({
        isValid: true,
        message: 'アクセスコードが確認されました',
      });
    } else if (accessCode === 'EXPIRED123') {
      return HttpResponse.json({
        isValid: false,
        message: 'アクセスコードが期限切れです',
      });
    } else {
      return HttpResponse.json({
        isValid: false,
        message: '無効なアクセスコードです',
      });
    }
  }),

  // ユーザー認証API
  http.post('/api/auth/login', async ({ request }) => {
    const { username, password } = await request.json() as { username: string; password: string };
    
    if (username === 'testuser' && password === 'password123') {
      return HttpResponse.json({
        success: true,
        user: mockUser,
        token: 'mock-jwt-token',
      });
    } else {
      return HttpResponse.json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'ユーザー名またはパスワードが間違っています',
        },
      }, { status: 401 });
    }
  }),

  // 匿名ログインAPI
  http.post('/api/auth/anonymous', async () => {
    return HttpResponse.json({
      success: true,
      user: {
        ...mockUser,
        id: 'anonymous-user',
        username: 'anonymous',
        displayName: '匿名ユーザー',
        isAnonymous: true,
      },
      token: 'mock-anonymous-token',
    });
  }),

  // 問題取得API
  http.get('/api/quiz/questions/:sessionId', ({ params }) => {
    const { sessionId } = params;
    
    if (sessionId === 'valid-session') {
      return HttpResponse.json({
        success: true,
        data: mockQuestions[0],
      });
    } else {
      return HttpResponse.json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'セッションが見つかりません',
        },
      }, { status: 404 });
    }
  }),

  // 回答送信API
  http.post('/api/quiz/answer', async ({ request }) => {
    const { questionId, selectedAnswer, responseTime } = await request.json() as {
      questionId: string;
      selectedAnswer: number;
      responseTime: number;
    };
    
    const question = mockQuestions.find(q => q.id === questionId);
    if (!question) {
      return HttpResponse.json({
        success: false,
        error: {
          code: 'QUESTION_NOT_FOUND',
          message: '問題が見つかりません',
        },
      }, { status: 404 });
    }
    
    const isCorrect = selectedAnswer === question.correctAnswer;
    
    return HttpResponse.json({
      success: true,
      data: {
        isCorrect,
        correctAnswer: question.correctAnswer,
        score: isCorrect ? 10 : 0,
        responseTime,
        nextQuestion: isCorrect ? mockQuestions[1] : null,
      },
    });
  }),

  // セッション情報取得API
  http.get('/api/sessions/:sessionId', ({ params }) => {
    const { sessionId } = params;
    
    if (sessionId === 'valid-session') {
      return HttpResponse.json({
        success: true,
        data: mockSession,
      });
    } else {
      return HttpResponse.json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'セッションが見つかりません',
        },
      }, { status: 404 });
    }
  }),

  // 参加者一覧取得API
  http.get('/api/sessions/:sessionId/participants', ({ params }) => {
    const { sessionId } = params;
    
    if (sessionId === 'valid-session') {
      return HttpResponse.json({
        success: true,
        data: mockParticipants,
      });
    } else {
      return HttpResponse.json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'セッションが見つかりません',
        },
      }, { status: 404 });
    }
  }),

  // AI問題生成API
  http.post('/api/ai/generate-question', async ({ request }) => {
    const { provider, difficulty, category } = await request.json() as {
      provider?: string;
      difficulty?: string;
      category?: string;
    };
    
    // Gemini API失敗をシミュレート
    if (provider === 'gemini-fail') {
      return HttpResponse.json({
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'Gemini API is temporarily unavailable',
          provider: 'gemini',
        },
      }, { status: 503 });
    }
    
    // OpenAI フォールバック成功
    if (provider === 'openai-fallback') {
      return HttpResponse.json({
        success: true,
        data: {
          id: 'ai-question-fallback',
          text: 'AI生成問題（OpenAI）: 世界で最も高い山は？',
          options: ['エベレスト', '富士山', 'キリマンジャロ', 'マッキンリー'],
          correctAnswer: 0,
          difficulty: 'easy',
          category: '地理',
          aiProvider: 'openai',
          generatedAt: new Date().toISOString(),
        },
        metadata: {
          provider: 'openai',
          responseTime: 800,
          tokensUsed: 120,
          fallbackUsed: true,
          failedProviders: ['gemini'],
        },
      });
    }
    
    // 通常のGemini API成功
    return HttpResponse.json({
      success: true,
      data: {
        id: 'ai-question-1',
        text: 'AI生成問題: 日本の首都はどこですか？',
        options: ['東京', '大阪', '京都', '名古屋'],
        correctAnswer: 0,
        difficulty: difficulty || 'easy',
        category: category || '地理',
        aiProvider: 'gemini',
        generatedAt: new Date().toISOString(),
      },
      metadata: {
        provider: 'gemini',
        responseTime: 1200,
        tokensUsed: 150,
      },
    });
  }),

  // 敗者復活戦開始API
  http.post('/api/sessions/:sessionId/revival/start', ({ params }) => {
    const { sessionId } = params;
    
    if (sessionId === 'valid-session') {
      return HttpResponse.json({
        success: true,
        data: {
          revivalId: 'revival-1',
          eligibleParticipants: ['user-2'],
          revivalQuestion: {
            id: 'revival-question-1',
            text: '復活戦問題: 日本の通貨単位は？',
            options: ['円', 'ドル', 'ユーロ', 'ウォン'],
            correctAnswer: 0,
          },
          timeLimit: 30,
        },
      });
    } else {
      return HttpResponse.json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'セッションが見つかりません',
        },
      }, { status: 404 });
    }
  }),

  // 復活戦参加API
  http.post('/api/sessions/:sessionId/revival/join', async ({ request, params }) => {
    const { sessionId } = params;
    const { userId } = await request.json() as { userId: string };
    
    if (sessionId === 'valid-session' && userId === 'user-2') {
      return HttpResponse.json({
        success: true,
        data: {
          participantId: 'user-2',
          status: 'joined',
          message: '復活戦に参加しました',
        },
      });
    } else {
      return HttpResponse.json({
        success: false,
        error: {
          code: 'NOT_ELIGIBLE',
          message: '復活戦への参加資格がありません',
        },
      }, { status: 403 });
    }
  }),

  // ネットワークエラーシミュレーション用
  http.get('/api/error/network', () => {
    return HttpResponse.error();
  }),

  // タイムアウトシミュレーション用
  http.get('/api/error/timeout', async () => {
    await new Promise(resolve => setTimeout(resolve, 5000));
    return HttpResponse.json({ success: true });
  }),
];