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