import Link from 'next/link';
import type {ReactNode} from 'react';

export function SiteShell({children}: {children: ReactNode}) {
  return <div className="site-shell"><header className="site-header"><Link className="site-logo" href="/" aria-label="回到小学生的作品主页"><span>XS</span><b>小学生的作品</b></Link><nav aria-label="主导航"><Link href="/lab">实验室</Link><Link href="/apps">小工具</Link><Link href="/works">作品集</Link></nav></header>{children}<footer className="site-footer"><span>© {new Date().getFullYear()} 小学生的作品</span><span>xiaoxuesheng.xyz · 静态个人作品门户</span></footer></div>;
}
