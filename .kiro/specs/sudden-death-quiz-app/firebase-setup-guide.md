# Firebase 設定手順

## 1. Firebase プロジェクト作成

### Firebase Console でプロジェクト作成
1. https://console.firebase.google.com/ にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名: `quizout-app` (任意の名前)
4. Google Analytics: 有効化を推奨

### Authentication 設定
1. Authentication → Sign-in method
2. 「匿名」を有効化 (必須)
3. Email/Password も有効化 (推奨)

### Firestore Database 作成
1. Firestore Database → データベースを作成
2. 「テストモードで開始」を選択
3. リージョン: `asia-northeast1` (東京)

## 2. サービスアカウント設定

### 秘密鍵の生成
1. プロジェクト設定 (⚙️ アイコン)
2. 「サービス アカウント」タブ
3. 「新しい秘密鍵の生成」→ JSON ダウンロード

### ウェブアプリの追加
1. プロジェクト設定 → 全般
2. 「アプリを追加」→ Web (</>) を選択
3. アプリ名: `QuizOut Frontend`
4. Firebase SDK設定をコピー

## 3. 環境変数設定

### バックエンド用設定 (.env)
```bash
# サービスアカウントJSONファイルから取得
FIREBASE_PROJECT_ID=actual-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n実際の秘密鍵\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@project-id.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://project-id-default-rtdb.firebaseio.com
FIREBASE_STORAGE_BUCKET=project-id.appspot.com
```

### フロントエンド用設定 (.env)
```bash
# Firebase SDK設定から取得
NEXT_PUBLIC_FIREBASE_PROJECT_ID=actual-project-id
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC_actual_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://project-id-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## 4. Firestore セキュリティルール

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザードキュメント: 認証済みユーザーのみ読み書き可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // セッション/ゲーム: 認証済みユーザーのみ読み取り可能、管理者のみ書き込み可能
    match /sessions/{sessionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.token.admin == true || request.auth.uid in resource.data.adminIds);
    }
    
    // 参加者: 認証済みユーザーのみアクセス可能
    match /participants/{participantId} {
      allow read, write: if request.auth != null;
    }
    
    // 問題: 認証済みユーザーのみ読み取り可能
    match /questions/{questionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // 回答: 認証済みユーザーのみアクセス可能
    match /answers/{answerId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

## 5. 動作確認

### バックエンド確認
```bash
# Dockerで起動
docker-compose up backend

# ヘルスチェック
curl http://localhost:8080/health
```

### フロントエンド確認
```bash
# 開発サーバー起動
cd frontend && npm run dev

# ブラウザで確認
http://localhost:3000
```

## 6. トラブルシューティング

### よくあるエラーと対処法

**Firebase初期化エラー**
- PROJECT_ID が正しく設定されているか確認
- PRIVATE_KEY の改行文字 `\n` が正しく設定されているか確認

**認証エラー**
- サービスアカウントに適切な権限があるか確認
- Authentication が有効化されているか確認

**Firestore接続エラー**
- Firestoreデータベースが作成されているか確認
- セキュリティルールが適切に設定されているか確認

**CORS エラー**
- フロントエンドの origin が許可されているか確認
- 開発時は `http://localhost:3000` を許可

## 7. 本番環境用設定

### セキュリティ強化
1. Firestore セキュリティルールを本番用に更新
2. 環境変数をサーバーの環境変数に設定 (`.env` ファイルは削除)
3. Firebase プロジェクトを本番用に分離

### パフォーマンス最適化
1. Firestore インデックスの作成
2. Cloud Functions でのバックグラウンド処理
3. Firebase Hosting でのフロントエンド配信