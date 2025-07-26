'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    checkUserAuth();
  }, [router]);

  const checkUserAuth = async () => {
    try {
      // アクセスコードをチェック
      const accessCode = authService.getAccessCodeFromStorage();
      
      if (!accessCode) {
        // アクセスコードがない場合はアクセスコード入力ページにリダイレクト
        router.push('/access-code');
        return;
      }

      // 認証状態をチェック
      if (authService.isAuthenticated()) {
        // ログイン済みの場合はクイズ選択画面を表示
        router.push('/quiz-selection');
      } else {
        // ログインしていない場合はログインページにリダイレクト
        router.push('/login');
      }
    } catch (error) {
      // エラーの場合はログインページにリダイレクト
      router.push('/login');
    }
  };

  // ローディング画面を表示
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">認証状態を確認中...</p>
      </div>
    </div>
  );
}