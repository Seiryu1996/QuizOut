import { renderHook, act } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import { useAPI } from '@/hooks/useAPI';

describe('Revival API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('敗者復活戦開始API', () => {
    test('復活戦開始リクエストが正常に動作すること', async () => {
      const { result } = renderHook(() => useAPI());

      await act(async () => {
        const response = await result.current.startRevival('valid-session');
        
        expect(response).toEqual({
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
      });
    });

    test('存在しないセッションでの復活戦開始エラー', async () => {
      const { result } = renderHook(() => useAPI());

      await act(async () => {
        try {
          await result.current.startRevival('invalid-session');
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

    test('脱落者への通知送信が正しく処理されること', async () => {
      // WebSocket通知のモック
      server.use(
        http.post('/api/sessions/:sessionId/revival/start', ({ params }) => {
          const { sessionId } = params;
          
          if (sessionId === 'valid-session') {
            return HttpResponse.json({
              success: true,
              data: {
                revivalId: 'revival-1',
                eligibleParticipants: ['user-2', 'user-3', 'user-4'],
                notificationsSent: 3,
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
                code: 'NO_ELIGIBLE_PARTICIPANTS',
                message: '復活戦の対象者がいません',
              },
            }, { status: 400 });
          }
        })
      );

      const { result } = renderHook(() => useAPI());

      await act(async () => {
        const response = await result.current.startRevival('valid-session');
        
        expect(response.success).toBe(true);
        expect(response.data.eligibleParticipants).toHaveLength(3);
        expect(response.data.notificationsSent).toBe(3);
      });
    });

    test('参加資格の検証が正しく動作すること', async () => {
      // 勝者の参加拒否をテスト
      server.use(
        http.post('/api/sessions/:sessionId/revival/start', async ({ request }) => {
          const body = await request.json() as any;
          
          if (body.includeWinners === true) {
            return HttpResponse.json({
              success: false,
              error: {
                code: 'INVALID_PARTICIPANTS',
                message: '勝者は復活戦に参加できません',
              },
            }, { status: 400 });
          }

          return HttpResponse.json({
            success: true,
            data: {
              revivalId: 'revival-1',
              eligibleParticipants: ['user-2', 'user-3'],
              excludedParticipants: ['user-1'], // 勝者
              revivalQuestion: {
                id: 'revival-question-1',
                text: '復活戦問題',
                options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
                correctAnswer: 0,
              },
              timeLimit: 30,
            },
          });
        })
      );

      const { result } = renderHook(() => useAPI());

      // 勝者を含めた場合のエラー
      await act(async () => {
        try {
          await result.current.startRevival('valid-session', { includeWinners: true });
        } catch (error: any) {
          expect(error.response.data.error.code).toBe('INVALID_PARTICIPANTS');
        }
      });

      // 正常な復活戦開始
      await act(async () => {
        const response = await result.current.startRevival('valid-session', { includeWinners: false });
        
        expect(response.success).toBe(true);
        expect(response.data.eligibleParticipants).toEqual(['user-2', 'user-3']);
        expect(response.data.excludedParticipants).toEqual(['user-1']);
      });
    });
  });

  describe('復活戦参加API', () => {
    test('復活戦への参加リクエストが正常に動作すること', async () => {
      const { result } = renderHook(() => useAPI());

      await act(async () => {
        const response = await result.current.joinRevival('valid-session', 'user-2');
        
        expect(response).toEqual({
          success: true,
          data: {
            participantId: 'user-2',
            status: 'joined',
            message: '復活戦に参加しました',
          },
        });
      });
    });

    test('復活戦参加資格がない場合のエラー処理', async () => {
      const { result } = renderHook(() => useAPI());

      await act(async () => {
        try {
          await result.current.joinRevival('valid-session', 'user-1'); // 勝者（参加資格なし）
        } catch (error: any) {
          expect(error.response.status).toBe(403);
          expect(error.response.data).toEqual({
            success: false,
            error: {
              code: 'NOT_ELIGIBLE',
              message: '復活戦への参加資格がありません',
            },
          });
        }
      });
    });

    test('勝者の参加拒否処理が正しいこと', async () => {
      // 詳細な参加資格チェックのモック
      server.use(
        http.post('/api/sessions/:sessionId/revival/join', async ({ request, params }) => {
          const { sessionId } = params;
          const { userId } = await request.json() as any;
          
          // 勝者データのシミュレーション
          const winnerIds = ['user-1'];
          const eliminatedIds = ['user-2', 'user-3', 'user-4'];
          
          if (sessionId === 'valid-session') {
            if (winnerIds.includes(userId)) {
              return HttpResponse.json({
                success: false,
                error: {
                  code: 'WINNER_NOT_ELIGIBLE',
                  message: '勝者は復活戦に参加できません',
                  userStatus: 'winner',
                },
              }, { status: 403 });
            } else if (eliminatedIds.includes(userId)) {
              return HttpResponse.json({
                success: true,
                data: {
                  participantId: userId,
                  status: 'joined',
                  message: '復活戦に参加しました',
                  userStatus: 'eliminated',
                  joinedAt: new Date().toISOString(),
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
          } else {
            return HttpResponse.json({
              success: false,
              error: {
                code: 'SESSION_NOT_FOUND',
                message: 'セッションが見つかりません',
              },
            }, { status: 404 });
          }
        })
      );

      const { result } = renderHook(() => useAPI());

      // 勝者の参加試行
      await act(async () => {
        try {
          await result.current.joinRevival('valid-session', 'user-1');
        } catch (error: any) {
          expect(error.response.data.error.code).toBe('WINNER_NOT_ELIGIBLE');
          expect(error.response.data.error.userStatus).toBe('winner');
        }
      });

      // 脱落者の参加成功
      await act(async () => {
        const response = await result.current.joinRevival('valid-session', 'user-2');
        
        expect(response.success).toBe(true);
        expect(response.data.userStatus).toBe('eliminated');
        expect(response.data.joinedAt).toBeDefined();
      });
    });

    test('復活者の決定処理が正しいこと', async () => {
      // 復活戦結果取得のモック
      server.use(
        http.get('/api/sessions/:sessionId/revival/results', ({ params }) => {
          const { sessionId } = params;
          
          if (sessionId === 'valid-session') {
            return HttpResponse.json({
              success: true,
              data: {
                revivalId: 'revival-1',
                participants: [
                  {
                    userId: 'user-2',
                    displayName: '参加者2',
                    answerTime: 1200,
                    isCorrect: true,
                    rank: 1,
                  },
                  {
                    userId: 'user-3',
                    displayName: '参加者3',
                    answerTime: 1500,
                    isCorrect: true,
                    rank: 2,
                  },
                  {
                    userId: 'user-4',
                    displayName: '参加者4',
                    answerTime: 2000,
                    isCorrect: false,
                    rank: 3,
                  },
                ],
                revivedParticipants: ['user-2', 'user-3'], // 上位2名が復活
                revivalCount: 2,
                determinedAt: new Date().toISOString(),
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
        })
      );

      const { result } = renderHook(() => useAPI());

      await act(async () => {
        const response = await result.current.getRevivalResults('valid-session');
        
        expect(response.success).toBe(true);
        expect(response.data.participants).toHaveLength(3);
        expect(response.data.revivedParticipants).toEqual(['user-2', 'user-3']);
        expect(response.data.revivalCount).toBe(2);
        
        // ランキング順序の確認
        const participants = response.data.participants;
        expect(participants[0].rank).toBe(1);
        expect(participants[0].userId).toBe('user-2');
        expect(participants[1].rank).toBe(2);
        expect(participants[1].userId).toBe('user-3');
      });
    });
  });

  describe('復活戦進行API', () => {
    test('復活戦タイムアウト処理が正しいこと', async () => {
      server.use(
        http.post('/api/sessions/:sessionId/revival/timeout', ({ params }) => {
          const { sessionId } = params;
          
          if (sessionId === 'valid-session') {
            return HttpResponse.json({
              success: true,
              data: {
                revivalId: 'revival-1',
                timeoutParticipants: ['user-3', 'user-4'],
                answeredParticipants: ['user-2'],
                revivedParticipants: ['user-2'], // 回答者のみ復活
                timeoutAt: new Date().toISOString(),
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
        })
      );

      const { result } = renderHook(() => useAPI());

      await act(async () => {
        const response = await result.current.handleRevivalTimeout('valid-session');
        
        expect(response.success).toBe(true);
        expect(response.data.timeoutParticipants).toEqual(['user-3', 'user-4']);
        expect(response.data.answeredParticipants).toEqual(['user-2']);
        expect(response.data.revivedParticipants).toEqual(['user-2']);
      });
    });

    test('復活戦問題回答APIが正しく動作すること', async () => {
      server.use(
        http.post('/api/sessions/:sessionId/revival/answer', async ({ request, params }) => {
          const { sessionId } = params;
          const { questionId, selectedAnswer, responseTime, userId } = await request.json() as any;
          
          if (sessionId === 'valid-session' && questionId === 'revival-question-1') {
            const isCorrect = selectedAnswer === 0; // 正解は0番
            
            return HttpResponse.json({
              success: true,
              data: {
                userId,
                questionId,
                selectedAnswer,
                isCorrect,
                responseTime,
                submittedAt: new Date().toISOString(),
                rank: isCorrect ? (responseTime < 1500 ? 1 : 2) : null,
              },
            });
          } else {
            return HttpResponse.json({
              success: false,
              error: {
                code: 'INVALID_SUBMISSION',
                message: '無効な回答です',
              },
            }, { status: 400 });
          }
        })
      );

      const { result } = renderHook(() => useAPI());

      // 正解の場合
      await act(async () => {
        const response = await result.current.submitRevivalAnswer(
          'valid-session',
          'revival-question-1',
          0, // 正解
          1200,
          'user-2'
        );
        
        expect(response.success).toBe(true);
        expect(response.data.isCorrect).toBe(true);
        expect(response.data.rank).toBe(1); // 早い回答なので1位
      });

      // 不正解の場合
      await act(async () => {
        const response = await result.current.submitRevivalAnswer(
          'valid-session',
          'revival-question-1',
          2, // 不正解
          1800,
          'user-3'
        );
        
        expect(response.success).toBe(true);
        expect(response.data.isCorrect).toBe(false);
        expect(response.data.rank).toBe(null); // 不正解なのでランクなし
      });
    });

    test('復活戦完了通知APIが正しく動作すること', async () => {
      server.use(
        http.post('/api/sessions/:sessionId/revival/complete', ({ params }) => {
          const { sessionId } = params;
          
          if (sessionId === 'valid-session') {
            return HttpResponse.json({
              success: true,
              data: {
                revivalId: 'revival-1',
                completedAt: new Date().toISOString(),
                totalParticipants: 3,
                revivedCount: 2,
                revivedParticipants: [
                  {
                    userId: 'user-2',
                    displayName: '参加者2',
                    rank: 1,
                    answerTime: 1200,
                  },
                  {
                    userId: 'user-3',
                    displayName: '参加者3',
                    rank: 2,
                    answerTime: 1500,
                  },
                ],
                eliminatedParticipants: [
                  {
                    userId: 'user-4',
                    displayName: '参加者4',
                    reason: 'incorrect_answer',
                  },
                ],
                notificationsSent: 5, // 参加者 + 観戦者への通知
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
        })
      );

      const { result } = renderHook(() => useAPI());

      await act(async () => {
        const response = await result.current.completeRevival('valid-session');
        
        expect(response.success).toBe(true);
        expect(response.data.totalParticipants).toBe(3);
        expect(response.data.revivedCount).toBe(2);
        expect(response.data.revivedParticipants).toHaveLength(2);
        expect(response.data.eliminatedParticipants).toHaveLength(1);
        expect(response.data.notificationsSent).toBe(5);
      });
    });
  });

  describe('復活戦エラーケース', () => {
    test('同時復活戦開始の競合状態処理', async () => {
      server.use(
        http.post('/api/sessions/:sessionId/revival/start', () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: 'REVIVAL_ALREADY_IN_PROGRESS',
              message: '復活戦が既に開始されています',
              currentRevivalId: 'revival-existing',
            },
          }, { status: 409 });
        })
      );

      const { result } = renderHook(() => useAPI());

      await act(async () => {
        try {
          await result.current.startRevival('valid-session');
        } catch (error: any) {
          expect(error.response.status).toBe(409);
          expect(error.response.data.error.code).toBe('REVIVAL_ALREADY_IN_PROGRESS');
          expect(error.response.data.error.currentRevivalId).toBe('revival-existing');
        }
      });
    });

    test('復活戦中のセッション状態変更エラー', async () => {
      server.use(
        http.post('/api/sessions/:sessionId/control', () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: 'REVIVAL_IN_PROGRESS',
              message: '復活戦中はセッション制御できません',
              revivalId: 'revival-1',
            },
          }, { status: 423 }); // Locked
        })
      );

      const { result } = renderHook(() => useAPI());

      await act(async () => {
        try {
          await result.current.controlSession('valid-session', 'next_round');
        } catch (error: any) {
          expect(error.response.status).toBe(423);
          expect(error.response.data.error.code).toBe('REVIVAL_IN_PROGRESS');
        }
      });
    });
  });
});