# フロントエンド テスト仕様書

## 概要

サドンデス勝ち上がり式クイズアプリケーションのフロントエンド（Next.js + TypeScript）のテスト仕様書。Jest + React Testing Library を使用した単体テスト、統合テスト、E2Eテストの詳細な仕様を定義する。

## テスト戦略

### テストピラミッド
- **単体テスト (70%)**: コンポーネント、Hook、ユーティリティ関数
- **統合テスト (20%)**: コンポーネント間の連携、API通信
- **E2Eテスト (10%)**: 重要なユーザーフロー

### テストツール
- **Jest**: テストランナー・アサーション
- **React Testing Library**: コンポーネントテスト
- **MSW (Mock Service Worker)**: API モック
- **Playwright**: E2Eテスト

## 単体テスト仕様

### 1. Atoms コンポーネントテスト

#### 1.1 Button コンポーネント
```typescript
// __tests__/components/atoms/Button.test.tsx
describe('Button Component', () => {
  test('正常にレンダリングされること', () => {
    // テキストが表示されること
    // 指定されたvariantのスタイルが適用されること
  });
  
  test('クリックイベントが正常に動作すること', () => {
    // onClickが呼び出されること
    // disabled時はクリックできないこと
  });
  
  test('ローディング状態が正常に表示されること', () => {
    // isLoading=trueでスピナーが表示されること
    // ローディング中はクリックできないこと
  });
});
```

#### 1.2 Timer コンポーネント
```typescript
// __tests__/components/atoms/Timer.test.tsx
describe('Timer Component', () => {
  test('制限時間が正常にカウントダウンされること', () => {
    // 初期値が正しく表示されること
    // 1秒ごとに値が減ること
    // 0になったらonTimeUpが呼ばれること
  });
  
  test('時間フォーマットが正しいこと', () => {
    // MM:SS形式で表示されること
    // 10秒未満で警告色になること
  });
});
```

### 2. Molecules コンポーネントテスト

#### 2.1 QuestionCard コンポーネント
```typescript
// __tests__/components/molecules/QuestionCard.test.tsx
describe('QuestionCard Component', () => {
  const mockQuestion = {
    id: '1',
    text: 'テスト問題',
    options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
    correctAnswer: 0
  };
  
  test('問題と選択肢が正常に表示されること', () => {
    // 問題文が表示されること
    // 4つの選択肢が表示されること
    // 選択肢にラジオボタンが表示されること
  });
  
  test('選択肢の選択が正常に動作すること', () => {
    // 選択肢をクリックできること
    // 選択状態が視覚的に分かること
    // onAnswerSelectが正しい値で呼ばれること
  });
  
  test('回答送信が正常に動作すること', () => {
    // 選択肢を選んでから送信ボタンが有効になること
    // 送信ボタンクリックでonSubmitが呼ばれること
    // 送信後は選択肢が無効になること
  });
});
```

#### 2.2 ParticipantList コンポーネント
```typescript
// __tests__/components/molecules/ParticipantList.test.tsx
describe('ParticipantList Component', () => {
  const mockParticipants = [
    { id: '1', name: '参加者1', status: 'active' },
    { id: '2', name: '参加者2', status: 'eliminated' },
    { id: '3', name: '参加者3', status: 'revived' }
  ];
  
  test('参加者一覧が正常に表示されること', () => {
    // 全参加者が表示されること
    // 各参加者の名前が表示されること
    // ステータスに応じたアイコンが表示されること
  });
  
  test('参加者数が正しく表示されること', () => {
    // アクティブ参加者数が正しいこと
    // 脱落者数が正しいこと
    // 復活者数が正しいこと
  });
});
```

### 3. Organisms コンポーネントテスト

#### 3.1 QuizInterface コンポーネント
```typescript
// __tests__/components/organisms/QuizInterface.test.tsx
describe('QuizInterface Component', () => {
  test('クイズ画面が正常に表示されること', () => {
    // QuestionCardが表示されること
    // Timerが表示されること
    // ParticipantListが表示されること
    // 現在のラウンド情報が表示されること
  });
  
  test('回答フローが正常に動作すること', () => {
    // 問題に回答できること
    // 回答後に結果が表示されること
    // 次の問題に進めること
  });
  
  test('脱落時の表示が正しいこと', () => {
    // 不正解時に脱落メッセージが表示されること
    // 復活戦の案内が表示されること
    // 他の参加者の進行が見えること
  });
});
```

#### 3.2 AdminDashboard コンポーネント
```typescript
// __tests__/components/organisms/AdminDashboard.test.tsx
describe('AdminDashboard Component', () => {
  test('管理画面が正常に表示されること', () => {
    // 現在の参加者数が表示されること
    // ゲーム状態が表示されること
    // 制御ボタンが表示されること
  });
  
  test('ゲーム制御が正常に動作すること', () => {
    // ゲーム開始ボタンが動作すること
    // 問題スキップボタンが動作すること
    // 敗者復活戦ボタンが動作すること
  });
  
  test('リアルタイム更新が正常に動作すること', () => {
    // 参加者数の変化が反映されること
    // ゲーム状態の変化が反映されること
  });
});
```

### 4. カスタムHookテスト

#### 4.1 useQuiz Hook
```typescript
// __tests__/hooks/useQuiz.test.ts
describe('useQuiz Hook', () => {
  test('初期状態が正しいこと', () => {
    // currentQuestionがnullであること
    // participantsが空配列であること
    // isLoadingがfalseであること
  });
  
  test('問題取得が正常に動作すること', () => {
    // fetchQuestionを呼ぶと問題が取得されること
    // ローディング状態が正しく管理されること
    // エラー時の処理が正しいこと
  });
  
  test('回答送信が正常に動作すること', () => {
    // submitAnswerが正しいパラメータで呼ばれること
    // 送信後の状態更新が正しいこと
    // エラーハンドリングが正しいこと
  });
});
```

#### 4.2 useAccessCode Hook
```typescript
// __tests__/hooks/useAccessCode.test.ts
describe('useAccessCode Hook', () => {
  test('アクセスコード検証が正常に動作すること', () => {
    // 有効なコードでtrueが返ること
    // 無効なコードでfalseが返ること
    // ローディング状態が正しく管理されること
  });
  
  test('エラーハンドリングが正常に動作すること', () => {
    // ネットワークエラー時の処理
    // サーバーエラー時の処理
    // 適切なエラーメッセージの表示
  });
});
```

#### 4.3 useAuth Hook
```typescript
// __tests__/hooks/useAuth.test.ts
describe('useAuth Hook', () => {
  test('ユーザー名・パスワードログインが正常に動作すること', () => {
    // 有効な認証情報でログイン成功
    // ユーザー情報とトークンが正しく設定されること
    // ローディング状態が正しく管理されること
  });
  
  test('無効な認証情報でログインが失敗すること', () => {
    // 無効なユーザー名・パスワードでfalseが返ること
    // 適切なエラーメッセージが表示されること
  });
  
  test('ログアウトが正常に動作すること', () => {
    // ユーザー情報がクリアされること
    // アクセスコードがセッションから削除されること
    // JWTトークンがクリアされること
  });
  
  test('認証状態の監視が正常に動作すること', () => {
    // 認証状態の変化が検知されること
    // 適切なリダイレクトが行われること
  });
});
```

#### 4.3 useWebSocket Hook
```typescript
// __tests__/hooks/useWebSocket.test.ts
describe('useWebSocket Hook', () => {
  test('WebSocket接続が正常に確立されること', () => {
    // 接続時にconnectedがtrueになること
    // 接続エラー時の処理が正しいこと
  });
  
  test('メッセージ送受信が正常に動作すること', () => {
    // sendMessageが正しく動作すること
    // メッセージ受信時のコールバックが呼ばれること
  });
  
  test('再接続処理が正常に動作すること', () => {
    // 接続断時に自動再接続されること
    // 再接続回数の制限が正しいこと
  });
});
```

## 統合テスト仕様

### 1. ページレベル統合テスト

#### 1.1 クイズ参加フロー
```typescript
// __tests__/integration/quiz-flow.test.tsx
describe('Quiz Participation Flow', () => {
  test('完全なクイズ参加フローが動作すること', () => {
    // 1. アクセスコード入力画面の表示
    // 2. 有効な共通アクセスコードの入力
    // 3. ログイン画面への遷移
    // 4. ユーザー名・パスワード入力とログイン
    // 5. ゲーム一覧の表示
    // 6. ゲーム選択と参加
    // 7. クイズ画面の表示
    // 8. 問題への回答
    // 9. 結果の表示
  });
  
  test('アクセスコード認証エラーフローが動作すること', () => {
    // 1. 無効なアクセスコードの入力
    // 2. エラーメッセージの表示
    // 3. 再入力の促し
    // 4. 有効なコードでの成功
  });
  
  test('脱落から復活戦までのフローが動作すること', () => {
    // 1. 不正解による脱落
    // 2. 脱落画面の表示
    // 3. 復活戦の通知受信
    // 4. 復活戦への参加
    // 5. 復活戦での正解
    // 6. メインゲームへの復帰
  });
});
```

#### 1.2 管理者フロー
```typescript
// __tests__/integration/admin-flow.test.tsx
describe('Admin Management Flow', () => {
  test('ゲーム作成から終了までのフローが動作すること', () => {
    // 1. 管理者ログイン
    // 2. ゲーム作成
    // 3. 参加者の監視
    // 4. ゲーム進行の制御
    // 5. 敗者復活戦の実行
    // 6. ゲーム終了と結果確認
  });
});
```

### 2. API統合テスト

#### 2.1 クイズAPI統合
```typescript
// __tests__/integration/quiz-api.test.tsx
describe('Quiz API Integration', () => {
  test('問題取得APIが正常に動作すること', () => {
    // APIレスポンスの形式が正しいこと
    // エラー時のフォールバックが動作すること
    // ローディング状態が正しく管理されること
  });
  
  test('回答送信APIが正常に動作すること', () => {
    // 回答データが正しく送信されること
    // レスポンスが正しく処理されること
    // エラー時の処理が正しいこと
  });
  
  test('AI問題生成APIが正常に動作すること', () => {
    // Gemini API呼び出しが正しいこと
    // フォールバック機能が動作すること
    // 生成された問題の形式が正しいこと
  });
});
```

#### 2.2 アクセスコード・認証API統合
```typescript
// __tests__/integration/auth-api.test.tsx
describe('Auth API Integration', () => {
  test('アクセスコード検証APIが正常に動作すること', () => {
    // 有効なコードでの成功レスポンス
    // 無効なコードでの失敗レスポンス
    // ネットワークエラー時の処理
  });
  
  test('ユーザー認証APIが正常に動作すること', () => {
    // ユーザー名・パスワード認証
    // 認証成功時のトークン取得
    // 認証失敗時のエラーハンドリング
  });
  
  test('ユーザー管理APIが正常に動作すること', () => {
    // 個別ユーザー登録API
    // CSV一括登録API
    // ユーザー一覧取得API
    // ユーザー削除API
  });
});
```

#### 2.3 敗者復活戦API統合
```typescript
// __tests__/integration/revival-api.test.tsx
describe('Revival API Integration', () => {
  test('敗者復活戦開始APIが正常に動作すること', () => {
    // 復活戦開始リクエスト
    // 脱落者への通知送信
    // 参加資格の検証
  });
  
  test('復活戦参加APIが正常に動作すること', () => {
    // 復活戦への参加リクエスト
    // 勝者の参加拒否処理
    // 復活者の決定処理
  });
});
```

## E2Eテスト仕様

### 1. 重要ユーザーフロー

#### 1.1 参加者の完全フロー
```typescript
// e2e/participant-flow.spec.ts
describe('Participant Complete Flow', () => {
  test('参加者が最初から最後まで正常にクイズに参加できること', () => {
    // 1. アプリケーションにアクセス
    // 2. 匿名ログイン
    // 3. ゲーム選択
    // 4. クイズ参加
    // 5. 複数問題への回答
    // 6. 結果確認
  });
  
  test('複数参加者での同時参加が正常に動作すること', () => {
    // 複数ブラウザでの同時アクセス
    // リアルタイム更新の確認
    // 参加者数の正確性確認
  });
  
  test('敗者復活戦フローが正常に動作すること', () => {
    // 1. 不正解による脱落
    // 2. 脱落画面の表示
    // 3. 復活戦の通知受信
    // 4. 復活戦への参加
    // 5. 復活戦での正解
    // 6. メインゲームへの復帰
  });
  
  test('10問連続正解での問題追加生成が動作すること', () => {
    // 1. 10問連続正解
    // 2. 追加問題の自動生成
    // 3. ゲーム継続
  });
});
```

#### 1.2 管理者の完全フロー
```typescript
// e2e/admin-flow.spec.ts
describe('Admin Complete Flow', () => {
  test('管理者がゲーム全体を正常に管理できること', () => {
    // 1. 管理者ログイン
    // 2. ゲーム作成
    // 3. 参加者監視
    // 4. ゲーム制御
    // 5. 結果確認
  });
  
  test('ユーザー管理機能が正常に動作すること', () => {
    // 1. 個別ユーザー登録
    // 2. CSV一括ユーザー登録
    // 3. ユーザー編集・削除
    // 4. ユーザー一覧表示
  });
  
  test('敗者復活戦の管理が正常に動作すること', () => {
    // 1. 脱落者の確認
    // 2. 復活戦の開始
    // 3. 復活者の確認
    // 4. メインゲームへの復帰処理
  });
});
```

#### 1.3 AI問題生成フロー
```typescript
// e2e/ai-generation-flow.spec.ts
describe('AI Question Generation Flow', () => {
  test('AI問題生成が正常に動作すること', () => {
    // 1. Gemini APIでの問題生成
    // 2. 4択形式の問題作成
    // 3. 正解データの設定
  });
  
  test('APIフォールバック機能が動作すること', () => {
    // 1. Gemini API失敗
    // 2. OpenAI APIへの自動切り替え
    // 3. Claude APIへのフォールバック
  });
  
  test('API制限時のエラーハンドリングが動作すること', () => {
    // 1. API制限到達
    // 2. 適切なエラーメッセージ表示
    // 3. 代替手段の実行
  });
});
```

## パフォーマンステスト仕様

### 1. レンダリングパフォーマンス
```typescript
// __tests__/performance/rendering.test.tsx
describe('Rendering Performance', () => {
  test('大量の参加者リストが効率的にレンダリングされること', () => {
    // 200人の参加者リストの表示時間測定
    // 仮想化の動作確認
    // メモリ使用量の確認
  });
  
  test('リアルタイム更新が効率的に処理されること', () => {
    // 頻繁な状態更新時のパフォーマンス
    // 不要な再レンダリングの防止確認
  });
});
```

## アクセシビリティテスト仕様

### 1. キーボードナビゲーション
```typescript
// __tests__/accessibility/keyboard.test.tsx
describe('Keyboard Navigation', () => {
  test('全ての操作がキーボードで実行できること', () => {
    // Tab キーでの要素間移動
    // Enter/Space キーでのボタン操作
    // Arrow キーでの選択肢移動
  });
});
```

### 2. スクリーンリーダー対応
```typescript
// __tests__/accessibility/screen-reader.test.tsx
describe('Screen Reader Support', () => {
  test('適切なARIAラベルが設定されていること', () => {
    // aria-label の設定確認
    // role 属性の設定確認
    // フォーカス管理の確認
  });
});
```

## テスト実行設定

### Jest設定
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### テストユーティリティ
```typescript
// src/test/utils.tsx
export const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClient>
      <AuthProvider>
        <WebSocketProvider>
          {ui}
        </WebSocketProvider>
      </AuthProvider>
    </QueryClient>
  );
};

export const createMockQuestion = (): Question => ({
  id: 'test-question-1',
  text: 'テスト問題',
  options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
  correctAnswer: 0,
  difficulty: 'medium',
  category: 'general',
});
```

## テスト実行コマンド

```bash
# 全テスト実行
npm test

# 監視モードでテスト実行
npm test -- --watch

# カバレッジ付きテスト実行
npm test -- --coverage

# E2Eテスト実行
npm run test:e2e

# パフォーマンステスト実行
npm run test:performance
```