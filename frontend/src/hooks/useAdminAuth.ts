import { useEffect, useState } from 'react';
import { authService } from '@/services/authService';
import { User } from '@/types/auth';

export const useAdminAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setError(null);
        setLoading(true);
        
        // セッションベース認証でユーザー情報を取得
        const response = await authService.getMe();
        
        setUser(response.user);
        setIsAdmin(response.user.isAdmin || false);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to get user info:', error);
        setError('ユーザー情報の取得に失敗しました');
        setUser(null);
        setIsAdmin(false);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  return {
    user,
    isAdmin,
    loading,
    error,
    isAuthenticated,
  };
};