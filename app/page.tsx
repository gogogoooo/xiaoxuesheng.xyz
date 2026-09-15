import {ArrowDown} from 'lucide-react';
import {EntryCard} from '@/components/entry-card';
import {SiteShell} from '@/components/site-shell';
import {siteSections} from '@/lib/site-content';

export default function HomePage() {
  return <SiteShell><main><section className="site-hero"><p className="eyebrow">PERSONAL PLAYGROUND · 2026</p><h1>把好奇、创造<br/>和日常作品放在一起。</h1><p className="site-hero__intro">这里是一个会慢慢长大的个人作品门户：给小朋友的互动实验，也给不断出现的小程序、网页和想法。</p><a className="hero-scroll" href="#sections">往下看看 <ArrowDown aria-hidden="true" size={16}/></a><div className="hero-orbit hero-orbit--one"/><div className="hero-orbit hero-orbit--two"/></section><section id="sections" className="site-sections" aria-labelledby="sections-title"><div className="section-heading"><p className="eyebrow">EXPLORE</p><h2 id="sections-title">从这里，走进不同的小世界</h2><p>三个入口，是现在的开始；以后可以自然增加更多作品栏目。</p></div><div className="entry-grid">{siteSections.map((entry) => <EntryCard entry={entry} key={entry.slug}/>)}</div></section></main></SiteShell>;
}
