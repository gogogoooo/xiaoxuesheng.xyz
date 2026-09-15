import assert from 'node:assert/strict';
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
