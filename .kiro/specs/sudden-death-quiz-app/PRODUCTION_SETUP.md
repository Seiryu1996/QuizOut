# 本番環境セットアップ手順

## 概要
このドキュメントは、QuizOutアプリケーションをGCP Firebase本番環境で動作させるための手順書です。

## 現在の設定状況

### ✅ 完了済み
- 本番環境用の環境変数設定（.env）
- Firebase Emulatorの無効化
- 本番用docker-compose設定
- GCP Firebase接続用のテストプログラム

### 📋 設定内容

#### 本番環境の環境変数
```bash
ENVIRONMENT=production
BUILD_TARGET=runtime
NODE_ENV=production

# Firebase Emulator無効
# FIRESTORE_EMULATOR_HOST=firestore-emulator:8081
# FIREBASE_AUTH_EMULATOR_HOST=firestore-emulator:9099

# GCP Firebase本番設定
FIREBASE_PROJECT_ID=quiz-out-467102
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@quiz-out-467102.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://quiz-out-467102-default-rtdb.firebaseio.com
FIREBASE_STORAGE_BUCKET=quiz-out-467102.firebasestorage.app
```

## 起動手順

### 1. Firebase接続テスト
```bash
# Firebase接続をテスト
docker-compose exec -T backend go run ./cmd/firebase-test/main.go
```

### 2. 本番環境でのアプリケーション起動
```bash
# 本番モードで起動
make prod

# または
docker-compose up --build

# バックグラウンドで起動
make up-prod

# または  
docker-compose up -d --build
```

### 3. アクセス先
- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8080
- **ヘルスチェック**: http://localhost:8080/health

### 4. ログ確認
```bash
# 全サービスのログ
make logs

# バックエンドログのみ
make logs-backend

# フロントエンドログのみ
make logs-frontend
```

## GCP Firebase設定確認項目

### Firestore Database
- ✅ プロジェクトID: `quiz-out-467102`
- ✅ サービスアカウント設定済み
- ⚠️ セキュリティルールの確認が必要

### Firebase Authentication
- ✅ プロジェクト設定済み
- ⚠️ 認証プロバイダーの設定確認が必要

### 必要な初期設定

#### 1. Firestoreセキュリティルール
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // セッション（ゲーム）
    match /sessions/{sessionId} {
      allow read, write: if true; // 本番では制限を追加
      
      // セッション内のコレクション
      match /{collection}/{document} {
        allow read, write: if true; // 本番では制限を追加
      }
    }
    
    // ユーザー
    match /users/{userId} {
      allow read, write: if true; // 本番では制限を追加
    }
  }
}
```

#### 2. Firebase Authenticationプロバイダー
- Anonymous Authentication: 有効化必要
- カスタムトークン: 有効化必要

## トラブルシューティング

### Firebase接続エラーの場合
1. 環境変数の確認
2. サービスアカウントキーの確認
3. GCPプロジェクトの権限確認

### 認証エラーの場合
1. Firebase Authenticationの設定確認
2. API Keyの確認
3. 認証プロバイダーの有効化確認

## 監視・メンテナンス

### ログ監視
```bash
# エラーログの監視
docker-compose logs backend | grep ERROR

# アクセスログの監視
docker-compose logs backend | grep "HTTP"
```

### パフォーマンス監視
- Firebase Console でのFirestore使用量確認
- API呼び出し数の監視
- エラー率の監視

## 本番環境での注意事項

1. **セキュリティルール**: 開発用の緩い設定から本番用に変更必要
2. **認証設定**: 本番用の認証プロバイダー設定
3. **API制限**: Gemini、OpenAI、ClaudeのAPI制限確認
4. **ドメイン設定**: 本番ドメインでのCORS設定
5. **SSL/TLS**: HTTPS対応の検討

## 次のステップ

- [ ] GCP Firebase接続テストの実行
- [ ] Firestoreセキュリティルールの設定
- [ ] Firebase Authenticationの設定
- [ ] 本番ドメインでの動作確認
- [ ] パフォーマンステストの実施