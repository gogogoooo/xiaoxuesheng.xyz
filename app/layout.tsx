import type { Metadata } from 'next';
import './globals.css';
import './site.css';


export const metadata: Metadata = {
  title: '小学生的作品',
  description: '小朋友实验室、小程序与网页作品的个人展示门户。',
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
