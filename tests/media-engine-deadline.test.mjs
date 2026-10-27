import test from 'node:test';
import assert from 'node:assert/strict';
import {withDeadline} from '../public/tools/media-converter/engine/deadline.js';

test('引擎无响应会超时，正常完成及原始异常均保留', async () => {
  await assert.rejects(withDeadline(new Promise(() => {}), 15, '加载超时'), /加载超时/);
  assert.equal(await withDeadline(Promise.resolve('ready'), 100, 'timeout'), 'ready');
  const failure = new Error('broken worker');
  await assert.rejects(withDeadline(Promise.reject(failure), 100, 'timeout'), (error) => error === failure);
});
