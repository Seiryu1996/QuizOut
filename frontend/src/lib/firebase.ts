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

// 開発環境でエミュレータに接続
if (process.env.NODE_ENV === 'development') {
  try {
    // Auth エミュレータに接続
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    console.log('Firebase Auth emulator connected');
  } catch (error) {
    console.log('Firebase Auth emulator already connected or failed to connect:', error);
  }
  
  try {
    // Firestore エミュレータに接続
    connectFirestoreEmulator(db, 'localhost', 8081);
    console.log('Firestore emulator connected');
  } catch (error) {
    console.log('Firestore emulator already connected or failed to connect:', error);
  }
}

export default app;