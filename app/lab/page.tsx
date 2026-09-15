import {EntryCard} from '@/components/entry-card';
import {SiteShell} from '@/components/site-shell';
import {labSubjects} from '@/lib/site-content';

export default function LabPage() {
  return <SiteShell><main className="collection-page"><p className="eyebrow">LITTLE SCIENCE LAB</p><h1>每个好奇，<br/>都值得动手试一试。</h1><p>实验不堆在同一张桌面上。先选一个学科，再进入一个专注、好玩的独立小实验。</p><div className="entry-grid collection-grid">{labSubjects.map((subject) => <EntryCard entry={subject} key={subject.slug}/>)}</div></main></SiteShell>;
}
