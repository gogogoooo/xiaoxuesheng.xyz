import {EntryCard} from '@/components/entry-card';
import {SiteShell} from '@/components/site-shell';
import {reportEntries} from '@/lib/site-content';

export default function WorksPage() {
  return <SiteShell><main className="collection-page"><p className="eyebrow">WEB · SITES · STORIES</p><h1>把想法做成页面，<br/>也把故事讲清楚。</h1><p>网页作品、网站原型和汇报材料会在这里归档。它们既是一次次尝试，也是一座持续整理中的个人作品陈列室。</p><div className="entry-grid collection-grid">{reportEntries.map((entry) => <EntryCard entry={entry} key={entry.slug}/>)}</div></main></SiteShell>;
}
