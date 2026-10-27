import assert from 'node:assert/strict';
import test from 'node:test';
import {ConversionController} from '../public/tools/media-converter/converter-controller.js';

const file = new File(['audio'], '测试.wav', {type: 'audio/wav'});
const request = {file, format: 'mp3', mode: 'auto', quality: 'balanced', resolution: 'original'};

test('取消会终止适配器，旧任务的延迟事件不覆盖新任务，且允许重新开始', async () => {
  const jobs = [];
  const controller = new ConversionController({adapterFactory: () => {
    const job = {disposed: false};
    jobs.push(job);
    return {
      convert: (_, context) => new Promise((resolve, reject) => {
        Object.assign(job, {resolve, reject, context});
        context.signal.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError')));
      }),
      dispose: () => { job.disposed = true; },
    };
  }});
  const firstEvents = [];
  const first = controller.start(request, (event) => firstEvents.push(event));
  await assert.rejects(controller.start(request), (error) => error.code === 'BUSY');
  controller.cancel();
  await assert.rejects(first, {name: 'AbortError'});
  assert.equal(jobs[0].disposed, true);
  const secondEvents = [];
  const second = controller.start(request, (event) => secondEvents.push(event));
  jobs[0].context.onEvent({type: 'stage', stage: 'converting'});
  assert.equal(firstEvents.length, 0);
  jobs[1].context.onEvent({type: 'stage', stage: 'probing'});
  assert.equal(secondEvents.length, 1);
  jobs[1].resolve({blob: new Blob(['mp3']), filename: '测试_converted.mp3'});
  const result = await second;
  assert.ok(result.url.startsWith('blob:'));
  assert.equal(controller.busy, false);
  assert.equal(jobs[1].disposed, true);
  controller.dispose();
});

test('成功结果只保留一个下载 URL，重置后不能再使用旧结果', async () => {
  const controller = new ConversionController({adapterFactory: () => ({
    convert: async () => ({blob: new Blob(['mp3']), filename: '测试_converted.mp3'}),
    dispose() {},
  })});
  const result = await controller.start(request);
  assert.equal((await fetch(result.url)).status, 200);
  controller.clearResult();
  await assert.rejects(fetch(result.url));
  controller.dispose();
});
