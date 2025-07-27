import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { authService } from '@/services/authService';
import { User } from '@/types/auth';

export const useAdminAuth = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isAuthenticated) {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const response = await authService.getMe();
        setUser(response.user);
        setIsAdmin(response.user.isAdmin || false);
      } catch (error) {
        console.error('Failed to get user info:', error);
        setError('ユーザー情報の取得に失敗しました');
        setUser(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [isAuthenticated, authLoading]);

  return {
    user,
    isAdmin,
    loading: authLoading || loading,
    error,
    isAuthenticated,
  };
};