import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AHP Decision Hub | AHP 설문 제작 및 실시간 일관성 분석 플랫폼',
  description: '계층화 의사결정 프로세스(AHP) 설문 제작, 배포, 실시간 일관성 검증 및 집단 분석 플랫폼',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
