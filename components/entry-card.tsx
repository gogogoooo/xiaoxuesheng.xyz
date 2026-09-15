import Link from 'next/link';
import {ArrowUpRight, Atom, CircuitBoard, Sparkles, Wrench} from 'lucide-react';
import type {EntryCard as Entry} from '@/lib/site-content';

const icons = {lab: Atom, apps: Wrench, works: Sparkles, circuits: CircuitBoard, physics: Sparkles, chemistry: Atom, 'little-circuit': CircuitBoard};

export function EntryCard({entry}: {entry: Entry}) {
  const Icon = icons[entry.slug as keyof typeof icons] ?? Sparkles;
  return <article className={`entry-card entry-card--${entry.accent}`}><div className="entry-card__top"><span className="entry-card__icon"><Icon aria-hidden="true" size={24}/></span><span className="entry-card__label">{entry.label}</span></div><h2>{entry.title}</h2><p>{entry.description}</p><Link href={entry.href} className="entry-card__link">进入看看 <ArrowUpRight aria-hidden="true" size={18}/></Link></article>;
}
