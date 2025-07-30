# QuizOut Scripts

このディレクトリには、QuizOutアプリケーションの管理・運用に関するスクリプトが含まれています。

## 📁 Directory Structure

```
scripts/
├── README.md                    # このファイル
└── user-management/             # ユーザー管理スクリプト
    ├── package.json            # Node.js依存関係
    └── create-users.js         # ユーザー作成スクリプト
```

## 🔧 Scripts Overview

### User Management Scripts (`user-management/`)

Firebase Firestoreにテストユーザーや管理者アカウントを作成するためのスクリプト群です。

## 📋 Available Scripts

| Script | Description | Usage |
|--------|-------------|-------|
| `create-users.js` | 管理者・テストユーザー・一般ユーザーを一括作成 | `npm run create-users` |

## 🚀 Quick Start

### 1. 環境変数の設定

```bash
# プロジェクトルートで .env ファイルが存在することを確認
ls -la .env

# .env ファイルが存在しない場合は .env.example をコピー
cp .env.example .env
# 必要なFirebase認証情報を .env ファイルに設定
```

### 2. 依存関係のインストール

```bash
# プロジェクトルートから実行
cd scripts/user-management
npm install
```

または

```bash
cd scripts/user-management
npm run install-deps
```

### 3. ユーザー作成スクリプトの実行

```bash
# user-managementディレクトリで実行
npm run create-users
```

または

```bash
node create-users.js
```

## 📖 詳細な実行手順

### ユーザー作成スクリプト実行手順

1. **前提条件の確認**
   - Node.js 18.0.0以上がインストールされていること
   - QuizOutアプリケーションのDockerコンテナが起動していること
   - Firebase認証情報が`.env`ファイルに設定されていること

2. **スクリプトディレクトリに移動**
   ```bash
   cd /path/to/QuizOut/scripts/user-management
   ```

3. **依存関係をインストール**
   ```bash
   npm install
   ```

4. **スクリプトを実行**
   ```bash
   npm run create-users
   ```

5. **実行結果の確認**
   - コンソールに作成されたアカウント情報が表示されます
   - Firebase Firestoreの`users`と`user_passwords`コレクションにデータが保存されます

### 実行例

```bash
$ npm run create-users

> @quizout/user-management@1.0.0 create-users
> node create-users.js

🚀 Starting QuizOut user creation...

🔑 Creating admin user...
✅ Admin user created successfully!
   Username: admin
   Password: admin123
   User ID: admin_a1b2c3d4e5f6g7h8

👤 Creating test user...
✅ Test user created successfully!
   Username: testadmin
   Password: testpass123
   User ID: user_h8g7f6e5d4c3b2a1

👥 Creating regular users...
   - user1/user123 (テストユーザー1)
   - user2/user456 (テストユーザー2)
   - demo1/demo123 (デモユーザー1)
   - demo2/demo456 (デモユーザー2)
✅ Regular users created successfully!

🎯 All accounts created successfully!

📋 Account Summary:
================================
🔑 Admin Account:
   Username: admin
   Password: admin123
   Role: Administrator

👤 Test User Account:
   Username: testadmin
   Password: testpass123
   Role: User

👥 Regular User Accounts:
   user1/user123 (テストユーザー1)
   user2/user456 (テストユーザー2)
   demo1/demo123 (デモユーザー1)
   demo2/demo456 (デモユーザー2)

🔐 Access Codes:
   General: TEST123
   Admin: ADMIN2024

🌐 Application URLs:
   Frontend: http://localhost:3000
   Backend: http://localhost:8080

✨ Setup complete! You can now test the application.
```

## 🛡️ セキュリティについて

- **本番環境では使用しないでください**: これらのスクリプトはテスト・開発環境専用です
- **環境変数の管理**: 
  - `.env`ファイルはGitにコミットしないでください（.gitignoreで除外済み）
  - Firebase認証情報は`.env`ファイルに安全に保存してください
  - `.env.example`を参考に設定してください
- **パスワードの変更**: 本番運用時は必ずデフォルトパスワードを変更してください
- **アクセス制御**: Firebase プロジェクトのIAM設定を適切に管理してください

## 🔍 トラブルシューティング

### よくある問題

1. **Firebase認証エラー**
   ```
   Error: Service account object must contain a string "private_key" property.
   ```
   **解決方法**: `.env`ファイルのFirebase認証情報を確認してください

2. **Permission Denied エラー**
   ```
   Error: 7 PERMISSION_DENIED: Missing or insufficient permissions.
   ```
   **解決方法**: Firebase Service Accountに適切な権限が付与されているか確認してください

3. **ネットワークエラー**
   ```
   Error: getaddrinfo ENOTFOUND firestore.googleapis.com
   ```
   **解決方法**: インターネット接続を確認し、Firebaseサービスにアクセスできることを確認してください

## 📝 カスタマイズ

スクリプトをカスタマイズして、独自のユーザーデータを作成することも可能です。`create-users.js`を参考に、必要に応じて新しいスクリプトを作成してください。

## 🤝 Contributing

スクリプトの改善やバグ修正は歓迎します。変更を行う際は、以下の点にご注意ください：

- コードスタイルの一貫性を保つ
- エラーハンドリングを適切に行う
- 実行前後の状態確認を含める
- ドキュメントの更新も忘れずに

## 📞 Support

問題が発生した場合は、プロジェクトの開発チームまでお問い合わせください。