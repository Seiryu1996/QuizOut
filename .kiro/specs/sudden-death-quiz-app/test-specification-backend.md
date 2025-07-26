# バックエンド テスト仕様書

## 概要

サドンデス勝ち上がり式クイズアプリケーションのバックエンド（Go + Gin）のテスト仕様書。Go標準テスト + testify を使用した単体テスト、統合テスト、負荷テストの詳細な仕様を定義する。

## テスト戦略

### テストピラミッド
- **単体テスト (70%)**: UseCase、Repository、Service、Entity
- **統合テスト (20%)**: API エンドポイント、データベース連携
- **負荷テスト (10%)**: 200人同時接続、パフォーマンス

### テストツール
- **Go標準testing**: テストランナー
- **testify**: アサーション・モック
- **Firebase Emulator**: Firestore テスト環境
- **httptest**: HTTP テスト
- **Artillery.js**: 負荷テスト

## 単体テスト仕様

### 1. Domain Entity テスト

#### 1.1 Quiz Entity
```go
// internal/domain/quiz_test.go
func TestQuiz(t *testing.T) {
    t.Run("正常なクイズエンティティが作成できること", func(t *testing.T) {
        // 必須フィールドが設定されていること
        // バリデーションが正常に動作すること
        // デフォルト値が正しく設定されること
    })
    
    t.Run("クイズ状態の遷移が正常に動作すること", func(t *testing.T) {
        // Created -> Active への遷移
        // Active -> Finished への遷移
        // 不正な状態遷移の拒否
    })
    
    t.Run("参加者の追加・削除が正常に動作すること", func(t *testing.T) {
        // 参加者の追加
        // 参加者の脱落処理
        // 参加者数の上限チェック
    })
}
```

#### 1.2 Question Entity
```go
// internal/domain/question_test.go
func TestQuestion(t *testing.T) {
    t.Run("正常な問題エンティティが作成できること", func(t *testing.T) {
        // 問題文が設定されていること
        // 4つの選択肢が設定されていること
        // 正解番号が0-3の範囲内であること
    })
    
    t.Run("回答の正誤判定が正常に動作すること", func(t *testing.T) {
        // 正解の場合にtrueが返ること
        // 不正解の場合にfalseが返ること
        // 範囲外の回答でfalseが返ること
    })
    
    t.Run("問題のバリデーションが正常に動作すること", func(t *testing.T) {
        // 空の問題文でエラーになること
        // 選択肢が4つ未満でエラーになること
        // 不正な正解番号でエラーになること
    })
}
```

#### 1.3 Participant Entity
```go
// internal/domain/participant_test.go
func TestParticipant(t *testing.T) {
    t.Run("参加者エンティティが正常に作成できること", func(t *testing.T) {
        // 必須フィールドが設定されていること
        // 初期状態がActiveであること
        // スコアが0で初期化されること
    })
    
    t.Run("参加者状態の変更が正常に動作すること", func(t *testing.T) {
        // Active -> Eliminated への変更
        // Eliminated -> Revived への変更
        // 不正な状態変更の拒否
    })
    
    t.Run("スコア計算が正常に動作すること", func(t *testing.T) {
        // 正解時のスコア加算
        // 連続正解ボーナス
        // 回答時間による加点
    })
}
```

### 2. UseCase テスト

#### 2.1 Quiz UseCase
```go
// internal/usecase/quiz_usecase_test.go
func TestQuizUseCase(t *testing.T) {
    t.Run("ゲーム作成が正常に動作すること", func(t *testing.T) {
        // モックリポジトリの設定
        mockRepo := &MockQuizRepository{}
        mockAI := &MockAIService{}
        usecase := NewQuizUseCase(mockRepo, mockAI)
        
        // 初期問題10問が生成されること
        // ゲームが正常に保存されること
        // 適切なレスポンスが返ること
    })
    
    t.Run("参加者の参加処理が正常に動作すること", func(t *testing.T) {
        // 参加者がゲームに追加されること
        // 参加者数の上限チェックが動作すること
        // 重複参加の防止が動作すること
    })
    
    t.Run("回答処理が正常に動作すること", func(t *testing.T) {
        // 正解時の処理が正しいこと
        // 不正解時の脱落処理が正しいこと
        // 10問連続正解時の追加問題生成
    })
    
    t.Run("敗者復活戦が正常に動作すること", func(t *testing.T) {
        // 脱落者のみが参加できること
        // 勝者の参加が拒否されること
        // 復活者の再参加処理が正しいこと
    })
}
```

#### 2.2 Auth UseCase
```go
// internal/usecase/auth_usecase_test.go
func TestAuthUseCase(t *testing.T) {
    t.Run("アクセスコード検証が正常に動作すること", func(t *testing.T) {
        mockRepo := &MockAccessCodeRepository{}
        usecase := NewAuthUseCase(mockRepo)
        
        // 有効なアクセスコードの検証
        mockRepo.On("IsValidAccessCode", "VALID_CODE").Return(true)
        isValid, err := usecase.VerifyAccessCode(ctx, "VALID_CODE")
        assert.NoError(t, err)
        assert.True(t, isValid)
        
        // 無効なアクセスコードの検証
        mockRepo.On("IsValidAccessCode", "INVALID_CODE").Return(false)
        isValid, err = usecase.VerifyAccessCode(ctx, "INVALID_CODE")
        assert.NoError(t, err)
        assert.False(t, isValid)
    })
    
    t.Run("ユーザー認証が正常に動作すること", func(t *testing.T) {
        mockUserRepo := &MockUserRepository{}
        usecase := NewAuthUseCase(mockRepo, mockUserRepo)
        
        // 有効な認証情報での認証成功
        user := &domain.User{Username: "testuser", DisplayName: "Test User"}
        mockUserRepo.On("ValidateUserCredentials", ctx, "testuser", "password123").Return(user, nil)
        
        authenticatedUser, err := usecase.AuthenticateUser(ctx, "testuser", "password123")
        assert.NoError(t, err)
        assert.Equal(t, "testuser", authenticatedUser.Username)
        
        // 無効な認証情報での認証失敗
        mockUserRepo.On("ValidateUserCredentials", ctx, "testuser", "wrongpassword").Return(nil, errors.New("invalid credentials"))
        
        _, err = usecase.AuthenticateUser(ctx, "testuser", "wrongpassword")
        assert.Error(t, err)
    })
    
    t.Run("ユーザー作成が正常に動作すること", func(t *testing.T) {
        // ユーザー名・パスワード・表示名でのユーザー作成
        // パスワードハッシュ化の確認
        // 重複チェック
    })
    
    t.Run("一括ユーザー作成が正常に動作すること", func(t *testing.T) {
        // CSV形式でのユーザー一括作成
        // バリデーション処理
        // エラーハンドリング
    })
    
    t.Run("ログイン試行のログ記録が動作すること", func(t *testing.T) {
        // 成功・失敗ログの記録
        // 不正アクセスの検知
    })
}
```

#### 2.3 AI UseCase
```go
// internal/usecase/ai_usecase_test.go
func TestAIUseCase(t *testing.T) {
    t.Run("問題生成が正常に動作すること", func(t *testing.T) {
        mockGemini := &MockGeminiClient{}
        mockOpenAI := &MockOpenAIClient{}
        usecase := NewAIUseCase([]AIClient{mockGemini, mockOpenAI})
        
        // Gemini APIが優先的に使用されること
        // 4択問題が正しい形式で生成されること
        // 適切な難易度の問題が生成されること
    })
    
    t.Run("API切り替えが正常に動作すること", func(t *testing.T) {
        // Gemini API失敗時にOpenAIに切り替わること
        // 全API失敗時に適切なエラーが返ること
        // 復旧時に元のAPIに戻ること
    })
    
    t.Run("レート制限処理が正常に動作すること", func(t *testing.T) {
        // レート制限時の待機処理
        // 代替APIへの切り替え
        // エラーハンドリング
    })
}
```

#### 2.3 Admin UseCase
```go
// internal/usecase/admin_usecase_test.go
func TestAdminUseCase(t *testing.T) {
    t.Run("ゲーム制御が正常に動作すること", func(t *testing.T) {
        // ゲーム開始処理
        // ゲーム一時停止処理
        // ゲーム終了処理
        // 問題スキップ処理
    })
    
    t.Run("参加者管理が正常に動作すること", func(t *testing.T) {
        // CSV一括登録処理
        // 個別参加者の追加・削除・編集
        // 参加者情報の検証
    })
    
    t.Run("統計情報取得が正常に動作すること", func(t *testing.T) {
        // 現在の参加者数取得
        // ラウンド別統計取得
        // 結果データのエクスポート
    })
}
```

### 3. Repository テスト

#### 3.1 Quiz Repository
```go
// internal/repository/quiz_repository_test.go
func TestQuizRepository(t *testing.T) {
    // Firebase Emulator使用
    os.Setenv("FIRESTORE_EMULATOR_HOST", "localhost:8080")
    
    t.Run("クイズの作成・取得・更新が正常に動作すること", func(t *testing.T) {
        repo := NewFirebaseQuizRepository(client)
        
        // クイズの作成
        quiz := &domain.Quiz{
            ID:    "test-quiz-1",
            Title: "テストクイズ",
            Status: "created",
        }
        err := repo.CreateQuiz(ctx, quiz)
        assert.NoError(t, err)
        
        // クイズの取得
        retrieved, err := repo.GetQuiz(ctx, "test-quiz-1")
        assert.NoError(t, err)
        assert.Equal(t, quiz.Title, retrieved.Title)
        
        // クイズの更新
        quiz.Status = "active"
        err = repo.UpdateQuiz(ctx, quiz)
        assert.NoError(t, err)
    })
    
    t.Run("参加者の管理が正常に動作すること", func(t *testing.T) {
        // 参加者の追加
        // 参加者一覧の取得
        // 参加者状態の更新
        // 参加者の削除
    })
    
    t.Run("回答履歴の保存・取得が正常に動作すること", func(t *testing.T) {
        // 回答の保存
        // 回答履歴の取得
        // 統計情報の集計
    })
}
```

#### 3.2 AccessCode Repository
```go
// internal/repository/access_code_repository_test.go
func TestAccessCodeRepository(t *testing.T) {
    t.Run("共通アクセスコードファイルの読み込みが正常に動作すること", func(t *testing.T) {
        // テスト用ファイル作成
        testFile := createTestAccessCodeFile(t, "COMMON_ACCESS_CODE_2024")
        defer os.Remove(testFile)
        
        repo := NewFileAccessCodeRepository(testFile)
        code, err := repo.LoadAccessCode()
        
        assert.NoError(t, err)
        assert.Equal(t, "COMMON_ACCESS_CODE_2024", code)
    })
    
    t.Run("アクセスコードの検証が正常に動作すること", func(t *testing.T) {
        // 有効なコードでtrueが返ること
        // 無効なコードでfalseが返ること
        // 大文字小文字の区別
    })
    
    t.Run("ファイル更新の自動検知が動作すること", func(t *testing.T) {
        // ファイル更新時の自動リロード
        // 更新タイムスタンプの管理
    })
}
```

#### 3.3 User Repository
```go
// internal/repository/user_repository_test.go
func TestUserRepository(t *testing.T) {
    // Firebase Emulator使用
    os.Setenv("FIRESTORE_EMULATOR_HOST", "localhost:8080")
    
    t.Run("ユーザーの作成・取得・更新が正常に動作すること", func(t *testing.T) {
        repo := NewFirebaseUserRepository(client)
        
        // ユーザーの作成
        user := &domain.User{
            Username:    "testuser",
            DisplayName: "Test User",
        }
        err := repo.CreateUser(ctx, user, "password123")
        assert.NoError(t, err)
        
        // ユーザー情報の取得
        retrieved, err := repo.GetUserByUsername(ctx, "testuser")
        assert.NoError(t, err)
        assert.Equal(t, user.DisplayName, retrieved.DisplayName)
    })
    
    t.Run("認証情報の管理が正常に動作すること", func(t *testing.T) {
        // パスワードハッシュ化の確認
        // 認証情報の検証
        // 無効な認証情報での失敗
    })
    
    t.Run("一括ユーザー作成が正常に動作すること", func(t *testing.T) {
        users := []UserCredentials{
            {Username: "user1", Password: "pass1", DisplayName: "User 1"},
            {Username: "user2", Password: "pass2", DisplayName: "User 2"},
        }
        
        err := repo.BulkCreateUsers(ctx, users)
        assert.NoError(t, err)
        
        // 作成されたユーザーの確認
        user1, err := repo.GetUserByUsername(ctx, "user1")
        assert.NoError(t, err)
        assert.Equal(t, "User 1", user1.DisplayName)
    })
}
```

### 4. Service テスト

#### 4.1 AI Client Service
```go
// internal/service/ai_client_test.go
func TestGeminiClient(t *testing.T) {
    t.Run("Gemini APIが正常に動作すること", func(t *testing.T) {
        client := NewGeminiClient(apiKey)
        
        question, err := client.GenerateQuestion(ctx, "medium", "general")
        assert.NoError(t, err)
        assert.NotEmpty(t, question.Text)
        assert.Len(t, question.Options, 4)
        assert.GreaterOrEqual(t, question.CorrectAnswer, 0)
        assert.Less(t, question.CorrectAnswer, 4)
    })
    
    t.Run("API制限時の処理が正常に動作すること", func(t *testing.T) {
        // レート制限エラーの処理
        // リトライ機構の動作
        // タイムアウト処理
    })
}

func TestOpenAIClient(t *testing.T) {
    t.Run("OpenAI APIが正常に動作すること", func(t *testing.T) {
        // OpenAI API呼び出しテスト
        // レスポンス形式の検証
        // エラーハンドリング
    })
}

func TestClaudeClient(t *testing.T) {
    t.Run("Claude APIが正常に動作すること", func(t *testing.T) {
        // Claude API呼び出しテスト
        // レスポンス形式の検証
        // エラーハンドリング
    })
}
```

### 5. WebSocket テスト

#### 5.1 WebSocket Hub
```go
// internal/websocket/hub_test.go
func TestHub(t *testing.T) {
    t.Run("クライアント登録・削除が正常に動作すること", func(t *testing.T) {
        hub := NewHub()
        go hub.Run()
        
        // クライアント登録
        client := &Client{userID: "test-user-1"}
        hub.register <- client
        
        // 登録確認
        time.Sleep(100 * time.Millisecond)
        assert.Contains(t, hub.clients, client)
        
        // クライアント削除
        hub.unregister <- client
        time.Sleep(100 * time.Millisecond)
        assert.NotContains(t, hub.clients, client)
    })
    
    t.Run("メッセージブロードキャストが正常に動作すること", func(t *testing.T) {
        // 複数クライアントへの同時配信
        // セッション別配信
        // メッセージ形式の検証
    })
    
    t.Run("大量接続時の処理が正常に動作すること", func(t *testing.T) {
        // 200クライアント同時接続
        // メモリ使用量の確認
        // パフォーマンスの測定
    })
}
```

## 統合テスト仕様

### 1. API エンドポイント統合テスト

#### 1.1 Quiz API
```go
// tests/integration/quiz_api_test.go
func TestQuizAPI(t *testing.T) {
    // テストサーバー起動
    router := setupTestRouter()
    server := httptest.NewServer(router)
    defer server.Close()
    
    t.Run("ゲーム作成APIが正常に動作すること", func(t *testing.T) {
        reqBody := `{"title":"テストゲーム","maxParticipants":100}`
        resp, err := http.Post(server.URL+"/api/admin/games", "application/json", strings.NewReader(reqBody))
        
        assert.NoError(t, err)
        assert.Equal(t, http.StatusCreated, resp.StatusCode)
        
        var game domain.Quiz
        json.NewDecoder(resp.Body).Decode(&game)
        assert.Equal(t, "テストゲーム", game.Title)
        assert.Equal(t, 100, game.MaxParticipants)
    })
    
    t.Run("ゲーム参加APIが正常に動作すること", func(t *testing.T) {
        // ゲーム作成
        gameID := createTestGame(t, server.URL)
        
        // 参加リクエスト
        reqBody := `{"userName":"テストユーザー"}`
        resp, err := http.Post(server.URL+"/api/games/"+gameID+"/join", "application/json", strings.NewReader(reqBody))
        
        assert.NoError(t, err)
        assert.Equal(t, http.StatusOK, resp.StatusCode)
    })
    
    t.Run("回答送信APIが正常に動作すること", func(t *testing.T) {
        // ゲーム作成・参加
        gameID, userID := setupGameAndUser(t, server.URL)
        
        // 回答送信
        reqBody := `{"questionId":"q1","selectedOption":0}`
        req, _ := http.NewRequest("POST", server.URL+"/api/games/"+gameID+"/answers", strings.NewReader(reqBody))
        req.Header.Set("Authorization", "Bearer "+getUserToken(userID))
        req.Header.Set("Content-Type", "application/json")
        
        resp, err := http.DefaultClient.Do(req)
        assert.NoError(t, err)
        assert.Equal(t, http.StatusOK, resp.StatusCode)
    })
}
```

#### 1.2 Admin API
```go
// tests/integration/admin_api_test.go
func TestAdminAPI(t *testing.T) {
    t.Run("管理者認証が正常に動作すること", func(t *testing.T) {
        // 管理者ログイン
        // トークン取得
        // 認証済みリクエスト
    })
    
    t.Run("ゲーム制御APIが正常に動作すること", func(t *testing.T) {
        // ゲーム開始
        // ゲーム一時停止
        // ゲーム終了
        // 問題スキップ
    })
    
    t.Run("敗者復活戦APIが正常に動作すること", func(t *testing.T) {
        // 復活戦開始
        // 脱落者の参加確認
        // 勝者の参加拒否確認
    })
}
```

#### 1.3 CORS API
```go
// tests/integration/cors_api_test.go
func TestCORSAPI(t *testing.T) {
    t.Run("CORS設定が正常に動作すること", func(t *testing.T) {
        server := httptest.NewServer(setupTestRouter())
        defer server.Close()
        
        // Preflightリクエストのテスト
        req, _ := http.NewRequest("OPTIONS", server.URL+"/api/v1/auth/verify-access-code", nil)
        req.Header.Set("Origin", "http://localhost:3000")
        req.Header.Set("Access-Control-Request-Method", "POST")
        req.Header.Set("Access-Control-Request-Headers", "Content-Type")
        
        resp, err := http.DefaultClient.Do(req)
        assert.NoError(t, err)
        assert.Equal(t, http.StatusOK, resp.StatusCode)
        assert.Equal(t, "http://localhost:3000", resp.Header.Get("Access-Control-Allow-Origin"))
        assert.Equal(t, "true", resp.Header.Get("Access-Control-Allow-Credentials"))
    })
    
    t.Run("Credentialsを含むリクエストが正常に処理されること", func(t *testing.T) {
        server := httptest.NewServer(setupTestRouter())
        defer server.Close()
        
        // Credentialsを含むPOSTリクエスト
        reqBody := `{"accessCode":"TEST_CODE"}`
        req, _ := http.NewRequest("POST", server.URL+"/api/v1/auth/verify-access-code", strings.NewReader(reqBody))
        req.Header.Set("Origin", "http://localhost:3000")
        req.Header.Set("Content-Type", "application/json")
        
        resp, err := http.DefaultClient.Do(req)
        assert.NoError(t, err)
        assert.Equal(t, "http://localhost:3000", resp.Header.Get("Access-Control-Allow-Origin"))
        assert.Equal(t, "true", resp.Header.Get("Access-Control-Allow-Credentials"))
    })
    
    t.Run("許可されていないOriginからのリクエストが拒否されること", func(t *testing.T) {
        server := httptest.NewServer(setupTestRouter())
        defer server.Close()
        
        req, _ := http.NewRequest("POST", server.URL+"/api/v1/auth/verify-access-code", nil)
        req.Header.Set("Origin", "http://malicious-site.com")
        
        resp, err := http.DefaultClient.Do(req)
        assert.NoError(t, err)
        // CORSエラーはブラウザ側で発生するため、サーバーは200を返すが
        // Access-Control-Allow-Originヘッダーが設定されないことを確認
        assert.Empty(t, resp.Header.Get("Access-Control-Allow-Origin"))
    })
}
```

### 2. データベース統合テスト

#### 2.1 Firestore統合テスト
```go
// tests/integration/firestore_test.go
func TestFirestoreIntegration(t *testing.T) {
    // Firebase Emulator使用
    os.Setenv("FIRESTORE_EMULATOR_HOST", "localhost:8080")
    
    t.Run("完全なゲームフローのデータ永続化", func(t *testing.T) {
        // 1. ゲーム作成
        // 2. 参加者追加
        // 3. 問題生成・保存
        // 4. 回答履歴保存
        // 5. 結果集計
        // 6. データ整合性確認
    })
    
    t.Run("同時書き込み時の整合性確認", func(t *testing.T) {
        // 複数の参加者が同時に回答
        // データの整合性確認
        // トランザクション処理の確認
    })
}
```

### 3. AI API統合テスト

#### 3.1 AI サービス統合テスト
```go
// tests/integration/ai_service_test.go
func TestAIServiceIntegration(t *testing.T) {
    t.Run("実際のAI APIとの連携テスト", func(t *testing.T) {
        // 実際のGemini APIを使用した問題生成
        // レスポンス形式の検証
        // 生成された問題の品質確認
    })
    
    t.Run("API切り替え機能の統合テスト", func(t *testing.T) {
        // Gemini API障害時のOpenAI切り替え
        // 全API障害時のエラーハンドリング
        // 復旧時の元API復帰
    })
}
```

## 負荷テスト仕様

### 1. 同時接続テスト

#### 1.1 WebSocket負荷テスト
```javascript
// tests/load/websocket-load.js (Artillery.js)
config:
  target: 'ws://localhost:8080'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Ramp up to 200 connections"
    - duration: 300
      arrivalRate: 0
      name: "Stay at 200 connections"

scenarios:
  - name: "Quiz participation"
    weight: 100
    engine: ws
    beforeRequest: "setUserData"
    flow:
      - connect:
          url: "/ws"
      - send:
          payload: '{"type":"join_game","gameId":"test-game"}'
      - think: 5
      - send:
          payload: '{"type":"submit_answer","questionId":"q1","answer":0}'
      - think: 10
```

#### 1.2 HTTP API負荷テスト
```javascript
// tests/load/api-load.js
config:
  target: 'http://localhost:8080'
  phases:
    - duration: 60
      arrivalRate: 50
      name: "Ramp up load"

scenarios:
  - name: "Game creation and participation"
    flow:
      - post:
          url: "/api/admin/games"
          json:
            title: "Load Test Game"
            maxParticipants: 200
      - post:
          url: "/api/games/{{ gameId }}/join"
          json:
            userName: "User{{ $randomString() }}"
      - post:
          url: "/api/games/{{ gameId }}/answers"
          json:
            questionId: "{{ questionId }}"
            selectedOption: "{{ $randomInt(0,3) }}"
```

### 2. パフォーマンステスト

#### 2.1 レスポンス時間テスト
```go
// tests/performance/response_time_test.go
func TestResponseTime(t *testing.T) {
    t.Run("API レスポンス時間が基準内であること", func(t *testing.T) {
        // ゲーム作成: < 500ms
        // 参加者追加: < 200ms
        // 回答送信: < 100ms
        // 問題生成: < 2000ms
    })
    
    t.Run("WebSocket メッセージ配信時間が基準内であること", func(t *testing.T) {
        // 200人への同時配信: < 1000ms
        // 個別メッセージ配信: < 50ms
    })
}
```

#### 2.2 メモリ使用量テスト
```go
// tests/performance/memory_test.go
func TestMemoryUsage(t *testing.T) {
    t.Run("200人接続時のメモリ使用量が基準内であること", func(t *testing.T) {
        // 基準: 512MB以下
        // メモリリークの確認
        // ガベージコレクションの動作確認
    })
}
```

## テスト実行設定

### Makefile
```makefile
# Makefile
.PHONY: test test-unit test-integration test-load

test: test-unit test-integration

test-unit:
	go test -v ./internal/...

test-integration:
	docker-compose -f docker-compose.test.yml up -d
	go test -v ./tests/integration/...
	docker-compose -f docker-compose.test.yml down

test-load:
	artillery run tests/load/websocket-load.js
	artillery run tests/load/api-load.js

test-coverage:
	go test -coverprofile=coverage.out ./internal/...
	go tool cover -html=coverage.out -o coverage.html

test-benchmark:
	go test -bench=. -benchmem ./internal/...
```

### Docker Compose テスト環境
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  firestore-emulator:
    image: gcr.io/google.com/cloudsdktool/cloud-sdk:latest
    command: gcloud emulators firestore start --host-port=0.0.0.0:8080
    ports:
      - "8080:8080"
    environment:
      - FIRESTORE_EMULATOR_HOST=localhost:8080
  
  test-db:
    image: postgres:13
    environment:
      POSTGRES_DB: quiz_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
```

### CI/CD統合
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-go@v2
        with:
          go-version: 1.21
      
      - name: Run unit tests
        run: make test-unit
      
      - name: Run integration tests
        run: make test-integration
      
      - name: Upload coverage
        uses: codecov/codecov-action@v1
        with:
          file: ./coverage.out
```

## テスト実行コマンド

```bash
# 全テスト実行
make test

# 単体テストのみ
make test-unit

# 統合テストのみ
make test-integration

# 負荷テスト実行
make test-load

# カバレッジ測定
make test-coverage

# ベンチマークテスト
make test-benchmark

# 特定パッケージのテスト
go test -v ./internal/usecase/

# テスト監視モード
go test -v ./internal/... -watch
```