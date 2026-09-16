import {ArrowUpRight, Atom, CircuitBoard, Sparkles, Wrench} from 'lucide-react';
import type {EntryCard as Entry} from '@/lib/site-content';

const icons = {lab: Atom, apps: Wrench, works: Sparkles, circuits: CircuitBoard, physics: Sparkles, chemistry: Atom, 'little-circuit': CircuitBoard};
const subjectArt = {circuits: '0% 50%', physics: '50% 50%', chemistry: '100% 50%'};

export function EntryCard({entry}: {entry: Entry}) {
  const Icon = icons[entry.slug as keyof typeof icons] ?? Sparkles;
  const artPosition = subjectArt[entry.slug as keyof typeof subjectArt];
  return <article className={`entry-card entry-card--${entry.accent} ${artPosition ? 'entry-card--subject' : ''}`}><div className="entry-card__top"><span className="entry-card__icon"><Icon aria-hidden="true" size={24}/></span><span className="entry-card__label">{entry.label}</span></div>{artPosition && <span className="entry-card__art" aria-hidden="true" style={{backgroundPosition: artPosition}}/>}<h2>{entry.title}</h2><p>{entry.description}</p><a href={entry.href} className="entry-card__link">进入看看 <ArrowUpRight aria-hidden="true" size={18}/></a></article>;
}
