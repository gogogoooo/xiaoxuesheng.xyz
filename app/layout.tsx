import type { Metadata } from 'next';
import './globals.css';


export const metadata: Metadata = {
  title: '小小电路实验室',
  description: '拿出电池、灯泡和开关，自由连接，观察电路的变化。',
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
