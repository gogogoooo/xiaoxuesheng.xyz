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

test('首页使用数字作品展厅结构，入口仍由数据驱动', () => {
  const source = fs.readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

  assert.match(source, /gallery-hero/);
  assert.match(source, /gallery-stage/);
  assert.match(source, /siteSections\.map/);
});

test('展厅样式同时覆盖不等宽网格与减少动态效果偏好', () => {
  const css = fs.readFileSync(new URL('../app/site.css', import.meta.url), 'utf8');

  assert.match(css, /gallery-card-grid/);
  assert.match(css, /prefers-reduced-motion/);
});
