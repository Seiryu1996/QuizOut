import { renderHook, act } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import { useAPI } from '@/hooks/useAPI';

describe('AI Question Generation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AI問題生成の基本機能', () => {
    test('Gemini APIでの問題生成が正常に動作すること', async () => {
      const { result } = renderHook(() => useAPI());

      await act(async () => {
        const response = await result.current.generateQuestion({
          provider: 'gemini',
          difficulty: 'medium',
          category: '一般常識',
        });

        expect(response.success).toBe(true);
        expect(response.data).toMatchObject({
          id: expect.any(String),
          text: expect.stringContaining('AI生成問題'),
          options: expect.arrayContaining([
            expect.any(String),
            expect.any(String),
            expect.any(String),
            expect.any(String),
          ]),
          correctAnswer: expect.any(Number),
          difficulty: 'medium',
          category: '一般常識',
          aiProvider: 'gemini',
          generatedAt: expect.any(String),
        });

        expect(response.metadata).toMatchObject({
          provider: 'gemini',
          responseTime: expect.any(Number),
          tokensUsed: expect.any(Number),
        });
      });
    });

    test('4択形式の問題作成が正しいこと', async () => {
      const { result } = renderHook(() => useAPI());

      await act(async () => {
        const response = await result.current.generateQuestion({
          provider: 'gemini',
          difficulty: 'easy',
          category: '地理',
        });

        expect(response.success).toBe(true);
        
        // 4択であることを確認
        expect(response.data.options).toHaveLength(4);
        
        // 正解番号が有効範囲内であることを確認
        expect(response.data.correctAnswer).toBeGreaterThanOrEqual(0);
        expect(response.data.correctAnswer).toBeLessThan(4);
        
        // 選択肢がすべて異なることを確認
        const uniqueOptions = new Set(response.data.options);
        expect(uniqueOptions.size).toBe(4);
      });
    });

    test('正解データの設定が正しいこと', async () => {
      const { result } = renderHook(() => useAPI());

      await act(async () => {
        const response = await result.current.generateQuestion({
          provider: 'gemini',
          difficulty: 'hard',
          category: 'プログラミング',
        });

        expect(response.success).toBe(true);
        
        // 正解番号が設定されていること
        expect(typeof response.data.correctAnswer).toBe('number');
        
        // 正解の選択肢が存在すること
        const correctOption = response.data.options[response.data.correctAnswer];
        expect(correctOption).toBeDefined();
        expect(typeof correctOption).toBe('string');
        expect(correctOption.length).toBeGreaterThan(0);
      });
    });
  });

  describe('APIフォールバック機能', () => {
    test('Gemini API失敗時にOpenAI APIへの自動切り替えが動作すること', async () => {
      const { result } = renderHook(() => useAPI());

      await act(async () => {
        const response = await result.current.generateQuestion({
          provider: 'openai-fallback', // フォールバックのテスト用プロバイダー
          difficulty: 'easy',
          category: '地理',
        });

        expect(response.success).toBe(true);
        expect(response.data.aiProvider).toBe('openai');
        expect(response.data.text).toContain('OpenAI');
        
        // フォールバック情報の確認
        expect(response.metadata.fallbackUsed).toBe(true);
        expect(response.metadata.failedProviders).toContain('gemini');
        expect(response.metadata.provider).toBe('openai');
      });
    });

    test('複数APIの段階的フォールバックが動作すること', async () => {
      // 複数フォールバックのシミュレーション
      server.use(
        http.post('/api/ai/generate-question', async ({ request }) => {
          const { provider } = await request.json() as any;
          
          if (provider === 'multi-fallback') {
            return HttpResponse.json({
              success: true,
              data: {
                id: 'ai-question-claude',
                text: 'AI生成問題（Claude）: 最終フォールバック問題',
                options: ['Claude選択肢1', 'Claude選択肢2', 'Claude選択肢3', 'Claude選択肢4'],
                correctAnswer: 0,
                difficulty: 'medium',
                category: '一般',
                aiProvider: 'claude',
                generatedAt: new Date().toISOString(),
              },
              metadata: {
                provider: 'claude',
                responseTime: 2100,
                tokensUsed: 200,
                fallbackUsed: true,
                failedProviders: ['gemini', 'openai'],
                fallbackLevel: 2,
              },
            });
          }
          
          return HttpResponse.json({
            success: false,
            error: { code: 'ALL_PROVIDERS_FAILED', message: 'All AI providers failed' },
          }, { status: 503 });
        })
      );

      const { result } = renderHook(() => useAPI());

      await act(async () => {
        const response = await result.current.generateQuestion({
          provider: 'multi-fallback',
          difficulty: 'medium',
          category: '一般',
        });

        expect(response.success).toBe(true);
        expect(response.data.aiProvider).toBe('claude');
        expect(response.metadata.fallbackLevel).toBe(2);
        expect(response.metadata.failedProviders).toEqual(['gemini', 'openai']);
      });
    });

    test('Claude APIへのフォールバックが動作すること', async () => {
      server.use(
        http.post('/api/ai/generate-question', async ({ request }) => {
          const { provider } = await request.json() as any;
          
          if (provider === 'claude-fallback') {
            return HttpResponse.json({
              success: true,
              data: {
                id: 'ai-question-claude-final',
                text: 'AI生成問題（Claude最終）: 最後の砦問題',
                options: ['最終選択肢1', '最終選択肢2', '最終選択肢3', '最終選択肢4'],
                correctAnswer: 2,
                difficulty: 'hard',
                category: '技術',
                aiProvider: 'claude',
                generatedAt: new Date().toISOString(),
              },
              metadata: {
                provider: 'claude',
                responseTime: 1800,
                tokensUsed: 180,
                fallbackUsed: true,
                failedProviders: ['gemini', 'openai'],
                isLastResort: true,
              },
            });
          }
          
          return HttpResponse.json({
            success: false,
            error: { code: 'PROVIDER_ERROR', message: 'Provider failed' },
          }, { status: 503 });
        })
      );

      const { result } = renderHook(() => useAPI());

      await act(async () => {
        const response = await result.current.generateQuestion({
          provider: 'claude-fallback',
          difficulty: 'hard',
          category: '技術',
        });

        expect(response.success).toBe(true);
        expect(response.data.aiProvider).toBe('claude');
        expect(response.metadata.isLastResort).toBe(true);
      });
    });
  });

  describe('API制限時のエラーハンドリング', () => {
    test('API制限到達時の適切なエラーメッセージ表示', async () => {
      server.use(
        http.post('/api/ai/generate-question', () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: '全てのAI APIが制限に達しています',
              providers: ['gemini', 'openai', 'claude'],
              retryAfter: 3600,
              resetTime: new Date(Date.now() + 3600000).toISOString(),
            },
          }, { status: 429 });
        })
      );

      const { result } = renderHook(() => useAPI());

      await act(async () => {
        try {
          await result.current.generateQuestion({
            provider: 'gemini',
            difficulty: 'medium',
            category: '一般',
          });
        } catch (error: any) {
          expect(error.response.status).toBe(429);
          expect(error.response.data.error.code).toBe('RATE_LIMIT_EXCEEDED');
          expect(error.response.data.error.retryAfter).toBe(3600);
          expect(error.response.data.error.providers).toEqual(['gemini', 'openai', 'claude']);
        }
      });
    });

    test('代替手段の提示が正しく動作すること', async () => {
      server.use(
        http.get('/api/ai/fallback-options', () => {
          return HttpResponse.json({
            success: true,
            data: {
              availableOptions: [
                {
                  type: 'manual_entry',
                  title: '手動で問題を追加',
                  description: '管理者が手動で問題を入力できます',
                  available: true,
                },
                {
                  type: 'preset_questions',
                  title: 'プリセット問題を使用',
                  description: '事前に用意された問題セットを使用します',
                  available: true,
                  count: 150,
                },
                {
                  type: 'import_csv',
                  title: 'CSV問題インポート',
                  description: 'CSV形式で問題をインポートできます',
                  available: true,
                },
              ],
              retryInfo: {
                nextAvailableTime: new Date(Date.now() + 3600000).toISOString(),
                estimatedWaitTime: '1時間',
              },
            },
          });
        })
      );

      const { result } = renderHook(() => useAPI());

      await act(async () => {
        const response = await result.current.getFallbackOptions();

        expect(response.success).toBe(true);
        expect(response.data.availableOptions).toHaveLength(3);
        
        const manualOption = response.data.availableOptions.find(
          (opt: any) => opt.type === 'manual_entry'
        );
        expect(manualOption).toBeDefined();
        expect(manualOption.available).toBe(true);
        
        const presetOption = response.data.availableOptions.find(
          (opt: any) => opt.type === 'preset_questions'
        );
        expect(presetOption.count).toBe(150);
      });
    });
  });

  describe('AI生成品質チェック', () => {
    test('生成された問題の品質スコア取得', async () => {
      server.use(
        http.post('/api/ai/generate-question', async ({ request }) => {
          const { includeQualityCheck } = await request.json() as any;
          
          if (includeQualityCheck) {
            return HttpResponse.json({
              success: true,
              data: {
                id: 'quality-checked-question',
                text: '品質チェック済み問題: 日本の通貨単位は？',
                options: ['円', 'ドル', 'ユーロ', 'ウォン'],
                correctAnswer: 0,
                difficulty: 'easy',
                category: '一般常識',
                aiProvider: 'gemini',
                generatedAt: new Date().toISOString(),
              },
              qualityScore: {
                overall: 95,
                clarity: 98,
                accuracy: 100,
                difficulty: 85,
                uniqueness: 90,
                warnings: [],
                suggestions: ['選択肢の順序をランダム化することを推奨'],
              },
              metadata: {
                provider: 'gemini',
                responseTime: 1500,
                tokensUsed: 180,
                qualityCheckPerformed: true,
                qualityCheckTime: 300,
              },
            });
          }
          
          return HttpResponse.json({
            success: true,
            data: {
              id: 'standard-question',
              text: '標準問題',
              options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
              correctAnswer: 0,
              difficulty: 'medium',
              category: '一般',
              aiProvider: 'gemini',
              generatedAt: new Date().toISOString(),
            },
            metadata: {
              provider: 'gemini',
              responseTime: 1200,
              tokensUsed: 150,
            },
          });
        })
      );

      const { result } = renderHook(() => useAPI());

      await act(async () => {
        const response = await result.current.generateQuestion({
          provider: 'gemini',
          difficulty: 'easy',
          category: '一般常識',
          includeQualityCheck: true,
        });

        expect(response.success).toBe(true);
        expect(response.qualityScore).toBeDefined();
        expect(response.qualityScore.overall).toBe(95);
        expect(response.qualityScore.clarity).toBe(98);
        expect(response.qualityScore.accuracy).toBe(100);
        expect(response.qualityScore.suggestions).toContain(
          '選択肢の順序をランダム化することを推奨'
        );
        expect(response.metadata.qualityCheckPerformed).toBe(true);
      });
    });

    test('品質警告の適切な処理', async () => {
      server.use(
        http.post('/api/ai/generate-question', () => {
          return HttpResponse.json({
            success: true,
            data: {
              id: 'warning-question',
              text: '警告付き問題: この問題は曖昧な表現を含みます',
              options: ['曖昧な選択肢', '似たような選択肢', '紛らわしい選択肢', '正解'],
              correctAnswer: 3,
              difficulty: 'medium',
              category: '一般',
              aiProvider: 'gemini',
              generatedAt: new Date().toISOString(),
            },
            qualityScore: {
              overall: 65,
              clarity: 60,
              accuracy: 85,
              difficulty: 70,
              uniqueness: 45,
              warnings: [
                '問題文に曖昧な表現が含まれています',
                '選択肢が類似しており混乱を招く可能性があります',
              ],
              suggestions: [
                '問題文をより具体的に記述してください',
                '選択肢をより明確に区別できるよう修正してください',
              ],
            },
            metadata: {
              provider: 'gemini',
              responseTime: 1400,
              tokensUsed: 160,
              qualityCheckPerformed: true,
              qualityIssuesDetected: true,
            },
          });
        })
      );

      const { result } = renderHook(() => useAPI());

      await act(async () => {
        const response = await result.current.generateQuestion({
          provider: 'gemini',
          difficulty: 'medium',
          category: '一般',
          includeQualityCheck: true,
        });

        expect(response.success).toBe(true);
        expect(response.qualityScore.overall).toBe(65);
        expect(response.qualityScore.warnings).toHaveLength(2);
        expect(response.qualityScore.suggestions).toHaveLength(2);
        expect(response.metadata.qualityIssuesDetected).toBe(true);
      });
    });
  });

  describe('一括問題生成', () => {
    test('複数問題の一括生成が正常に動作すること', async () => {
      server.use(
        http.post('/api/ai/generate-questions/batch', async ({ request }) => {
          const { count, provider } = await request.json() as any;
          
          const questions = Array.from({ length: count }, (_, i) => ({
            id: `batch-question-${i + 1}`,
            text: `一括生成問題 ${i + 1}`,
            options: [`選択肢A${i + 1}`, `選択肢B${i + 1}`, `選択肢C${i + 1}`, `選択肢D${i + 1}`],
            correctAnswer: i % 4,
            difficulty: ['easy', 'medium', 'hard'][i % 3],
            category: ['一般', '歴史', '科学'][i % 3],
            aiProvider: provider || 'gemini',
            generatedAt: new Date().toISOString(),
          }));
          
          return HttpResponse.json({
            success: true,
            data: {
              questions,
              totalGenerated: count,
              provider: provider || 'gemini',
              batchId: 'batch-001',
            },
            metadata: {
              provider: provider || 'gemini',
              totalResponseTime: count * 520,
              totalTokensUsed: count * 150,
              averageResponseTime: 520,
              averageTokensPerQuestion: 150,
            },
          });
        })
      );

      const { result } = renderHook(() => useAPI());

      await act(async () => {
        const response = await result.current.generateQuestionsBatch({
          count: 10,
          provider: 'gemini',
          difficulty: 'mixed',
          category: 'mixed',
        });

        expect(response.success).toBe(true);
        expect(response.data.questions).toHaveLength(10);
        expect(response.data.totalGenerated).toBe(10);
        expect(response.metadata.averageResponseTime).toBe(520);
        expect(response.metadata.totalTokensUsed).toBe(1500);
      });
    });
  });
});