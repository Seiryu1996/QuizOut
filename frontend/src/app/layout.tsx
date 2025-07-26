import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'QuizOut - サドンデス勝ち上がり式クイズ',
  description: 'グループ会社忘年会用リアルタイムクイズアプリケーション',
  icons: {
    icon: '/favicon.svg',
  },
};

export const viewport = 'width=device-width, initial-scale=1, maximum-scale=1';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  );
}