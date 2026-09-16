import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('站点入口固定为三个可用栏目', async () => {
  const {siteSections} = await import('../lib/site-content.ts');

  assert.equal(siteSections.length, 3);
  assert.deepEqual(siteSections.map((item) => item.href), ['/lab', '/apps', '/works']);
});

test('实验室包含三个可扩展学科及电路实验入口', async () => {
  const {experimentsBySubject, labSubjects} = await import('../lib/site-content.ts');

  assert.deepEqual(labSubjects.map((item) => item.slug), ['circuits', 'physics', 'chemistry']);
  assert.equal(experimentsBySubject.circuits[0].href, '/lab/circuits/little-circuit');
});

test('首页由站点入口数据生成，而不是写死实验室界面', () => {
  const source = fs.readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

  assert.match(source, /siteSections/);
  assert.match(source, /EntryCard/);
});

test('实验室目录与电路实验拥有独立页面', () => {
  const paths = [
    'app/lab/page.tsx',
    'app/lab/[subject]/page.tsx',
    'app/lab/circuits/little-circuit/page.tsx',
    'app/lab/circuits/little-circuit/circuit-lab.tsx',
  ];

  paths.forEach((path) => assert.ok(fs.existsSync(path), `${path} 应存在`));
});

test('首页其余两个作品入口都有落地页', () => {
  assert.ok(fs.existsSync('app/apps/page.tsx'));
  assert.ok(fs.existsSync('app/works/page.tsx'));
});

test('小程序页提供车辆调度演示入口与体验版二维码', () => {
  const source = fs.readFileSync(new URL('../app/apps/page.tsx', import.meta.url), 'utf8');

  assert.match(source, /\/demos\/vehicle-dispatch\//);
  assert.match(source, /vehicle-dispatch-experience-qr\.png/);
  assert.match(source, /体验版/);
  assert.ok(fs.existsSync('public/demos/vehicle-dispatch/index.html'));
  assert.ok(fs.existsSync('public/vehicle-dispatch-experience-qr.png'));
});

test('体验二维码按原图比例完整展示，不裁切为正方形', () => {
  const css = fs.readFileSync(new URL('../app/site.css', import.meta.url), 'utf8');

  assert.match(css, /\.app-demo-card__qr img\{[^}]*width:100%[^}]*height:auto[^}]*object-fit:contain/);
});

test('首页使用数字作品展厅结构，入口仍由数据驱动', () => {
  const source = fs.readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

  assert.match(source, /gallery-hero/);
  assert.match(source, /gallery-stage/);
  assert.match(source, /siteSections\.map/);
});

test('站点品牌统一为造物档案馆，入口使用原生链接保障 Pages 跳转', () => {
  const shell = fs.readFileSync(new URL('../components/site-shell.tsx', import.meta.url), 'utf8');
  const card = fs.readFileSync(new URL('../components/entry-card.tsx', import.meta.url), 'utf8');
  const layout = fs.readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');

  assert.match(shell, /造物档案馆/);
  assert.match(layout, /造物档案馆/);
  assert.doesNotMatch(shell, /小学生的作品/);
  assert.match(card, /<a href=\{entry\.href\}/);
});

test('展厅样式同时覆盖不等宽网格与减少动态效果偏好', () => {
  const css = fs.readFileSync(new URL('../app/site.css', import.meta.url), 'utf8');

  assert.match(css, /gallery-card-grid/);
  assert.match(css, /prefers-reduced-motion/);
});

test('实验室分类卡使用儿童可识别的图画素材', () => {
  const source = fs.readFileSync(new URL('../components/entry-card.tsx', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../app/site.css', import.meta.url), 'utf8');

  assert.match(source, /subjectArt/);
  assert.match(css, /lab-subjects-v2\.png/);
  assert.ok(fs.existsSync('public/lab-subjects-v2.png'));
});

test('实验室目录拥有独立网格，不继承首页首卡放大规则', () => {
  const css = fs.readFileSync(new URL('../app/site.css', import.meta.url), 'utf8');

  assert.match(css, /\.collection-grid\s*\{[^}]*grid-template-columns/);
  assert.match(css, /\.collection-grid\s+\.entry-card:first-child/);
});

test('Pages 发布配置启用静态导出并覆盖实验室动态页面参数', () => {
  const config = fs.readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8');
  const subjectPage = fs.readFileSync(new URL('../app/lab/[subject]/page.tsx', import.meta.url), 'utf8');

  assert.match(config, /output:\s*['"]export['"]/);
  assert.match(subjectPage, /generateStaticParams/);
  assert.match(subjectPage, /labSubjects\.map/);
});
