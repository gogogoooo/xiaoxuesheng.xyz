import type {ReactNode} from 'react';

export function SiteShell({children}: {children: ReactNode}) {
  return <div className="site-shell"><header className="site-header"><a className="site-logo" href="/" aria-label="回到造物档案馆主页"><span>ZA</span><b>造物档案馆</b></a><nav aria-label="主导航"><a href="/lab">实验室</a><a href="/apps">小工具</a><a href="/works">作品集</a></nav></header>{children}<footer className="site-footer"><span>© {new Date().getFullYear()} 造物档案馆</span><span>xiaoxuesheng.xyz · 静态个人作品陈列</span></footer></div>;
}
