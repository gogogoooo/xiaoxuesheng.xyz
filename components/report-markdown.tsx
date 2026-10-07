'use client';

import {useEffect, useState} from 'react';

const imageByName: Record<string, {src: string; alt: string}> = {
  '总技术图谱.png': {src: '/reports/2026-national-day/total-technology-map.png', alt: '总技术图谱'},
  'enta-next.png': {src: '/reports/2026-national-day/enta-next.png', alt: 'ENTA Next 技术图'},
  'Skill Studio AI.png': {src: '/reports/2026-national-day/skill-studio-ai.png', alt: 'Skill Studio AI 技术图'},
  'AIGov Insight.png': {src: '/reports/2026-national-day/aigov-insight.png', alt: 'AIGov Insight 技术图'},
};

function inlineText(value: string) {
  return value.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith('**') && part.endsWith('**')
    ? <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
    : <span key={`${part}-${index}`}>{part}</span>);
}

function renderBlock(block: string, index: number) {
  const text = block.trim();
  if (!text) return null;
  if (text.startsWith('## ')) return <h2 key={index}>{inlineText(text.slice(3))}</h2>;
  if (text.startsWith('# ')) return <h1 key={index}>{inlineText(text.slice(2))}</h1>;
  const imageName = Object.keys(imageByName).find((name) => text.includes(name));
  if (text.startsWith('【展示') && imageName) {
    const image = imageByName[imageName];
    return <figure key={index}><img src={image.src} alt={image.alt} loading="lazy"/><figcaption>{inlineText(text)}</figcaption></figure>;
  }
  return <p key={index}>{inlineText(text.replace(/\n/g, ''))}</p>;
}

export function ReportMarkdown() {
  const [source, setSource] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/reports/2026-national-day/report.md')
      .then((response) => response.ok ? response.text() : Promise.reject(new Error('load failed')))
      .then(setSource)
      .catch(() => setError('汇报材料暂时无法加载，请稍后再试。'));
  }, []);

  if (error) return <p className="report-error">{error}</p>;
  if (!source) return <p className="report-loading">正在加载汇报正文…</p>;
  return <article className="report-document">{source.split(/\n\s*\n/).map(renderBlock)}</article>;
}
