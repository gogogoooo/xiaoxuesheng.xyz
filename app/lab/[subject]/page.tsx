import {notFound} from 'next/navigation';
import {EntryCard} from '@/components/entry-card';
import {SiteShell} from '@/components/site-shell';
import {experimentsBySubject, isSubjectSlug, labSubjects} from '@/lib/site-content';

export function generateStaticParams() {
  return labSubjects.map(({slug}) => ({subject: slug}));
}

export default async function SubjectPage({params}: {params: Promise<{subject: string}>}) {
  const {subject} = await params;
  if (!isSubjectSlug(subject)) notFound();
  const current = labSubjects.find((item) => item.slug === subject)!;
  const experiments = experimentsBySubject[subject];
  return <SiteShell><main className="collection-page"><p className="eyebrow">小朋友实验室 · {current.title}</p><h1>{current.title}</h1><p>{current.description}</p>{experiments.length ? <div className="entry-grid collection-grid">{experiments.map((experiment) => <EntryCard entry={experiment} key={experiment.slug}/>)}</div> : <section className="coming-soon"><span>✦</span><h2>这个实验区正在慢慢准备</h2><p>新的玩法会在这里出现。先去电路实验室玩一玩吧。</p></section>}</main></SiteShell>;
}
