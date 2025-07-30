import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'quiz-app-dev.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'quiz-app-dev',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'quiz-app-dev.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// エミュレータ設定は現在無効（本番Firebase使用）
// 本番環境では以下のエミュレータ接続をコメントアウト
/*
if (process.env.NODE_ENV === 'development') {
  // ブラウザサイドでのみエミュレータに接続（サーバーサイドでは不要）
  if (typeof window !== 'undefined') {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      console.log('Firebase Auth emulator connected to: http://localhost:9099');
    } catch (error) {
      console.log('Firebase Auth emulator already connected:', error);
    }
    
    try {
      connectFirestoreEmulator(db, 'localhost', 8081);
      console.log('Firestore emulator connected to: localhost:8081');
    } catch (error) {
      console.log('Firestore emulator already connected:', error);
    }
  }
}
*/

console.log('Firebase initialized with production configuration:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain
});

export default app;