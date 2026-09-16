import type { Metadata } from 'next';
import './globals.css';
import './site.css';
import './gallery-overrides.css';


export const metadata: Metadata = {
  title: '造物档案馆',
  description: '收集作品、实验和每一个逐渐成形的想法。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
      </body>
    </html>
  );
}
