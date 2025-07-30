# サドンデス勝ち上がり式クイズアプリケーション

グループ会社忘年会用の200人同時参加対応リアルタイムクイズシステム

## 技術スタック

- **バックエンド**: Go + Gin + WebSocket
- **フロントエンド**: Next.js + TypeScript + Tailwind CSS
- **データベース**: Firebase Firestore
- **AI API**: Gemini + OpenAI + Claude (フォールバック)
- **インフラ**: Docker + GCP Cloud Run

## 機能

- サドンデス形式クイズ進行
- AI自動問題生成（Gemini/OpenAI/Claude）
- リアルタイムWebSocket通信
- 敗者復活戦システム
- 管理者ダッシュボード
- CSV結果エクスポート

## 🚀 クイックスタート

**詳細なセットアップ手順は [SETUP.md](./SETUP.md) を参照してください。**

### 1. アプリケーション起動

```bash
docker compose up -d
```

### 2. テストユーザー作成

```bash
cd scripts/user-management
npm install
npm run create-users
```

### 3. アプリケーションにアクセス

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8080

**ログイン情報**:
- 管理者: `admin/admin123` (アクセスコード: ADMIN2024)
- テストユーザー: `testadmin/testpass123` (アクセスコード: TEST123)

## 開発環境セットアップ

### 1. 環境変数設定

```bash
make setup
# .env ファイルを編集して API キーを設定
```

### 2. Docker で起動

```bash
# すべてのサービスを起動
make up

# 開発モード（ログ表示）
make dev
```

## 利用可能なコマンド

```bash
make help          # ヘルプ表示
make build         # Docker イメージビルド
make up            # サービス起動
make dev           # 開発モード起動
make down          # サービス停止
make logs          # ログ表示
make clean         # コンテナ・ボリューム削除
make test-backend  # バックエンドテスト実行
make test-frontend # フロントエンドテスト実行
```

## プロジェクト構造

```
├── backend/           # Go バックエンド
│   ├── cmd/server/    # メインアプリケーション
│   ├── internal/      # 内部パッケージ
│   └── pkg/           # 共通パッケージ
├── frontend/          # Next.js フロントエンド
│   └── src/           # ソースコード
├── infra/             # インフラ設定
│   ├── docker/        # Docker 設定
│   └── firebase/      # Firebase 設定
└── docker-compose.yml # Docker Compose 設定
```