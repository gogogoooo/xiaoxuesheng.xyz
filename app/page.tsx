import {ArrowRight, MoveDownRight, Sparkles} from 'lucide-react';
import {EntryCard} from '@/components/entry-card';
import {SiteShell} from '@/components/site-shell';
import {siteSections} from '@/lib/site-content';

export default function HomePage() {
  return <SiteShell><main className="gallery-main"><section className="gallery-hero"><div className="gallery-hero__copy"><p className="gallery-kicker"><Sparkles size={14} aria-hidden="true"/> XIAOXUESHENG / ARCHIVE 01</p><h1>作品不该<br/><em>躺在文件夹里。</em></h1><p>一个慢慢生长的个人作品展示门户。收集好奇心、动手实验，以及每一次把想法变成现实的过程。</p><a href="#gallery">浏览作品入口 <ArrowRight size={17} aria-hidden="true"/></a></div><div className="gallery-stage" aria-hidden="true"><span className="stage-number">01</span><span className="stage-orbit stage-orbit--a"/><span className="stage-orbit stage-orbit--b"/><span className="stage-orbit stage-orbit--c"/><span className="stage-core"/><span className="stage-label stage-label--top">CURIOUS<br/>MAKERS</span><span className="stage-label stage-label--bottom">PLAY · MAKE<br/>SHOW</span></div></section><section id="gallery" className="gallery-section" aria-labelledby="gallery-title"><div className="gallery-section__heading"><p className="gallery-kicker">SELECT AN ENTRY</p><h2 id="gallery-title">从一件作品，<br/>走进一个小世界。</h2><p>现在有三条探索路径。新的栏目会以同样的方式，在这里继续展开。</p><MoveDownRight size={30} aria-hidden="true"/></div><div className="gallery-card-grid">{siteSections.map((entry) => <EntryCard entry={entry} key={entry.slug}/>)}</div></section></main></SiteShell>;
}
