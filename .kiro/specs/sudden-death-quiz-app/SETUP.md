# QuizOut Setup Guide

QuizOutアプリケーションの初期セットアップとユーザー作成の手順書です。

## 🚀 Quick Start

### 1. アプリケーションの起動

```bash
# Docker Composeでアプリケーションを起動
docker compose up -d

# ログを確認（オプション）
docker compose logs -f
```

### 2. ユーザーアカウントの作成

```bash
# 環境変数ファイルが存在することを確認
ls -la .env

# スクリプトディレクトリに移動
cd scripts/user-management

# 依存関係をインストール
npm install

# ユーザー作成スクリプトを実行
npm run create-users
```

### 3. アプリケーションへのアクセス

**フロントエンド**: http://localhost:3000
**バックエンド**: http://localhost:8080

## 📋 作成されるアカウント

### 🔑 管理者アカウント
- **ユーザー名**: admin
- **パスワード**: admin123
- **アクセスコード**: ADMIN2024
- **権限**: 管理者機能（ユーザー管理、セッション管理）

### 👤 テストアカウント
- **ユーザー名**: testadmin
- **パスワード**: testpass123
- **アクセスコード**: TEST123
- **権限**: 一般ユーザー

### 👥 一般ユーザーアカウント
| ユーザー名 | パスワード | 表示名 | アクセスコード |
|----------|----------|-------|-------------|
| user1 | user123 | テストユーザー1 | TEST123 |
| user2 | user456 | テストユーザー2 | TEST123 |
| demo1 | demo123 | デモユーザー1 | TEST123 |
| demo2 | demo456 | デモユーザー2 | TEST123 |

## 🔐 ログイン手順

1. **アクセスコード入力**
   - http://localhost:3000/access-code にアクセス
   - 適切なアクセスコードを入力（TEST123 または ADMIN2024）

2. **ユーザー認証**
   - http://localhost:3000/login にアクセス
   - ユーザー名とパスワードを入力

3. **アプリケーション利用開始**
   - 認証が完了すると、クイズ選択画面に遷移します

## 🛠️ 開発者向け情報

### スクリプト構成

```
scripts/
├── README.md                    # スクリプト詳細ドキュメント
└── user-management/             # ユーザー管理スクリプト
    ├── package.json            # Node.js依存関係
    ├── create-users.js         # ユーザー作成メインスクリプト
    └── test-creation.js        # 機能テストスクリプト
```

### 利用可能なスクリプトコマンド

```bash
cd scripts/user-management

# ユーザー作成
npm run create-users

# 機能テスト（実際の作成は行わない）
npm run test

# 依存関係インストール
npm run install-deps
```

### カスタマイズ

追加のユーザーを作成したい場合は、`scripts/user-management/create-users.js`を参考に新しいスクリプトを作成してください。

## 🔍 トラブルシューティング

### よくある問題と解決方法

1. **Docker起動エラー**
   ```bash
   # コンテナ状態確認
   docker compose ps
   
   # ログ確認
   docker compose logs backend
   docker compose logs frontend
   ```

2. **Firebase接続エラー**
   - `.env`ファイルのFirebase認証情報を確認
   - インターネット接続を確認

3. **ポート競合エラー**
   ```bash
   # 使用中のポートを確認
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :8080
   ```

4. **依存関係エラー**
   ```bash
   # Node.jsバージョン確認（18.0.0以上が必要）
   node --version
   
   # 依存関係の再インストール
   cd scripts/user-management
   rm -rf node_modules package-lock.json
   npm install
   ```

### ログの確認方法

```bash
# リアルタイムログ確認
docker compose logs -f backend
docker compose logs -f frontend

# 過去のログ確認
docker compose logs --tail=100 backend
```

## 🔒 セキュリティ注意事項

- **本番環境での使用禁止**: このセットアップは開発・テスト環境専用です
- **デフォルトパスワードの変更**: 本番運用時は必ずパスワードを変更してください
- **認証情報の管理**: Firebase認証情報を適切に保護してください
- **アクセス制限**: 必要に応じてファイアウォールやVPNを設定してください

## 📞 サポート

問題が発生した場合は、以下の情報と共に開発チームまでお問い合わせください：

1. エラーメッセージの全文
2. 実行したコマンド
3. 環境情報（OS、Node.jsバージョン、Dockerバージョン）
4. 関連するログファイル

## 🎯 次のステップ

セットアップが完了したら、以下のリソースを参照してください：

- **API仕様書**: 開発チームから提供される API ドキュメント
- **フロントエンド仕様**: `frontend/README.md`
- **バックエンド仕様**: `backend/README.md`
- **詳細なスクリプト仕様**: `scripts/README.md`