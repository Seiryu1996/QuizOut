/**
 * QuizOut User Creation Script
 * 
 * このスクリプトは、QuizOutアプリケーション用のユーザーアカウントを
 * Firebase Firestoreに作成するためのものです。
 * 
 * 作成されるアカウント:
 * - 管理者アカウント (admin/admin123)
 * - テストユーザーアカウント (testadmin/testpass123)
 * - 一般ユーザーアカウント (user1, user2, demo1, demo2)
 */

const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const path = require('path');

// 環境変数をロード（プロジェクトルートの.envファイルから）
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

/**
 * 環境変数の検証
 */
function validateEnvironmentVariables() {
  const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 Please check your .env file in the project root.');
    process.exit(1);
  }
}

// 環境変数の検証
validateEnvironmentVariables();

// Firebase Service Account設定（環境変数から）
const serviceAccount = {
  "type": "service_account",
  "project_id": process.env.FIREBASE_PROJECT_ID,
  "private_key": process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID || "14550195301",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`
};

// Firebase Admin初期化
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    console.log('🔥 Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    console.error('\n💡 Please check your Firebase credentials in the .env file.');
    process.exit(1);
  }
}

const db = admin.firestore();

/**
 * 管理者ユーザーを作成
 */
async function createAdminUser() {
  try {
    console.log('🔑 Creating admin user...');
    
    const userId = 'admin_' + crypto.randomBytes(8).toString('hex');
    const username = 'admin';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const batch = db.batch();
    
    // 管理者ユーザー情報
    const userRef = db.collection('users').doc(userId);
    const userData = {
      id: userId,
      username: username,
      displayName: 'Quiz Administrator',
      email: 'admin@quizout.local',
      isAnonymous: false,
      role: 'admin',
      createdAt: admin.firestore.Timestamp.now(),
      lastLoginAt: null
    };
    batch.set(userRef, userData);
    
    // パスワード情報
    const passwordRef = db.collection('user_passwords').doc(userId);
    const passwordData = {
      username: username,
      passwordHash: hashedPassword
    };
    batch.set(passwordRef, passwordData);
    
    await batch.commit();
    
    console.log('✅ Admin user created successfully!');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   User ID: ${userId}`);
    
    return { userId, username, password };
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
}

/**
 * テストユーザーを作成
 */
async function createTestUser() {
  try {
    console.log('👤 Creating test user...');
    
    const userId = 'user_' + crypto.randomBytes(8).toString('hex');
    const username = 'testadmin';
    const password = 'testpass123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const batch = db.batch();
    
    // テストユーザー情報
    const userRef = db.collection('users').doc(userId);
    const userData = {
      id: userId,
      username: username,
      displayName: 'Test Administrator',
      email: 'testadmin@quizout.local',
      isAnonymous: false,
      role: 'user',
      createdAt: admin.firestore.Timestamp.now(),
      lastLoginAt: null
    };
    batch.set(userRef, userData);
    
    // パスワード情報
    const passwordRef = db.collection('user_passwords').doc(userId);
    const passwordData = {
      username: username,
      passwordHash: hashedPassword
    };
    batch.set(passwordRef, passwordData);
    
    await batch.commit();
    
    console.log('✅ Test user created successfully!');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   User ID: ${userId}`);
    
    return { userId, username, password };
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  }
}

/**
 * 一般ユーザーを作成
 */
async function createRegularUsers() {
  try {
    console.log('👥 Creating regular users...');
    
    const users = [
      { username: 'user1', password: 'user123', displayName: 'テストユーザー1' },
      { username: 'user2', password: 'user456', displayName: 'テストユーザー2' },
      { username: 'demo1', password: 'demo123', displayName: 'デモユーザー1' },
      { username: 'demo2', password: 'demo456', displayName: 'デモユーザー2' }
    ];
    
    const batch = db.batch();
    const createdUsers = [];
    
    for (const user of users) {
      const userId = 'user_' + crypto.randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // ユーザー情報
      const userRef = db.collection('users').doc(userId);
      const userData = {
        id: userId,
        username: user.username,
        displayName: user.displayName,
        email: `${user.username}@test.local`,
        isAnonymous: false,
        role: 'user',
        createdAt: admin.firestore.Timestamp.now(),
        lastLoginAt: null
      };
      batch.set(userRef, userData);
      
      // パスワード情報
      const passwordRef = db.collection('user_passwords').doc(userId);
      const passwordData = {
        username: user.username,
        passwordHash: hashedPassword
      };
      batch.set(passwordRef, passwordData);
      
      createdUsers.push({
        userId,
        username: user.username,
        password: user.password,
        displayName: user.displayName
      });
      
      console.log(`   - ${user.username}/${user.password} (${user.displayName})`);
    }
    
    await batch.commit();
    console.log('✅ Regular users created successfully!');
    
    return createdUsers;
    
  } catch (error) {
    console.error('❌ Error creating regular users:', error);
    throw error;
  }
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('🚀 Starting QuizOut user creation...\n');
    
    const adminUser = await createAdminUser();
    console.log('');
    
    const testUser = await createTestUser();
    console.log('');
    
    const regularUsers = await createRegularUsers();
    console.log('');
    
    // 結果サマリー
    console.log('🎯 All accounts created successfully!\n');
    console.log('📋 Account Summary:');
    console.log('================================');
    console.log('🔑 Admin Account:');
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Password: ${adminUser.password}`);
    console.log('   Role: Administrator');
    console.log('');
    console.log('👤 Test User Account:');
    console.log(`   Username: ${testUser.username}`);
    console.log(`   Password: ${testUser.password}`);
    console.log('   Role: User');
    console.log('');
    console.log('👥 Regular User Accounts:');
    regularUsers.forEach(user => {
      console.log(`   ${user.username}/${user.password} (${user.displayName})`);
    });
    console.log('');
    console.log('🔐 Access Codes:');
    console.log('   General: TEST123');
    console.log('   Admin: ADMIN2024');
    console.log('');
    console.log('🌐 Application URLs:');
    console.log('   Frontend: http://localhost:3000');
    console.log('   Backend: http://localhost:8080');
    console.log('');
    console.log('✨ Setup complete! You can now test the application.');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// スクリプトが直接実行された場合のみmain()を実行
if (require.main === module) {
  main();
}

module.exports = {
  createAdminUser,
  createTestUser,
  createRegularUsers
};