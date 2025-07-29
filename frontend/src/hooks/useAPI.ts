import { useMemo } from 'react';
import { useUserStore } from '@/store/userStore';
import { createAPIClient } from '@/services/api';

export const useAPI = () => {
  const authToken = useUserStore(state => state.authToken);
  
  const apiClient = useMemo(() => {
    return createAPIClient(() => authToken);
  }, [authToken]);

  return apiClient;
};

// 管理者画面専用のAPI（認証トークンなし、セッションベース認証のみ）
export const useAdminAPI = () => {
  const apiClient = useMemo(() => {
    return createAPIClient(() => null); // トークンなし
  }, []);

  return apiClient;
};