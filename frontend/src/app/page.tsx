'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // アクセスコードが設定されているかチェック
    const accessCode = authService.getAccessCodeFromStorage();
    
    if (!accessCode) {
      // アクセスコードがない場合はアクセスコード入力ページにリダイレクト
      router.push('/access-code');
    } else {
      // アクセスコードがある場合はユーザー認証状態を確認
      checkUserAuth();
    }
  }, [router]);

  const checkUserAuth = async () => {
    try {
      // ユーザー情報を取得してログイン状態を確認
      await authService.getMe();
      // ログイン済みの場合はクイズ選択画面を表示
      router.push('/quiz-selection');
    } catch (error) {
      // ログインしていない場合はログインページにリダイレクト
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