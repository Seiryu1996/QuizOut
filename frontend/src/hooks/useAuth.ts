import { useEffect, useState } from 'react';
import { signInAnonymously, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useUserStore } from '@/store/userStore';

export const useAuth = () => {
  const [loading, setLoading] = useState(true);
  const { 
    user, 
    setUser, 
    setAuthToken, 
    setIsAuthenticated, 
    setIsAnonymous,
    logout 
  } = useUserStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          // Firebase認証トークン取得
          const token = await firebaseUser.getIdToken();
          
          // ユーザー情報を状態に保存
          const userData = {
            id: firebaseUser.uid,
            displayName: firebaseUser.displayName || '匿名ユーザー',
            email: firebaseUser.email || '',
            isAnonymous: firebaseUser.isAnonymous,
            createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
            lastLoginAt: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
          };

          setUser(userData);
          setAuthToken(token);
          setIsAuthenticated(true);
          setIsAnonymous(firebaseUser.isAnonymous);
        } else {
          // ログアウト状態
          setUser(null);
          setAuthToken(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        logout();
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setUser, setAuthToken, setIsAuthenticated, setIsAnonymous, logout]);

  const signInAnonymous = async (): Promise<boolean> => {
    try {
      setLoading(true);
      await signInAnonymously(auth);
      return true;
    } catch (error) {
      console.error('Anonymous sign in error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await auth.signOut();
      logout();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const refreshToken = async (): Promise<string | null> => {
    try {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken(true);
        setAuthToken(token);
        return token;
      }
      return null;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  };

  return {
    user,
    loading,
    isAuthenticated: useUserStore(state => state.isAuthenticated),
    isAnonymous: useUserStore(state => state.isAnonymous),
    authToken: useUserStore(state => state.authToken),
    signInAnonymous,
    signOut,
    refreshToken,
  };
};