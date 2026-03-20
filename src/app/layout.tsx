import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '스마트 배송 플랫폼',
  description: 'AI 기반 라스트마일 배송 최적화',
};

export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false, themeColor: '#1D4ED8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-50 max-w-md mx-auto min-h-screen`}>{children}</body>
    </html>
  );
}
