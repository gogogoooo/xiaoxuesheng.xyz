import test from 'node:test';
import assert from 'node:assert/strict';
import {parseProbeResult} from '../public/tools/media-converter/engine/probe-result.js';

const valid = JSON.stringify({streams:[{index:0,codec_type:'video',codec_name:'h264'}],format:{duration:'1.1',size:'50000'}});
test('兼容固定核心成功时返回 -1，但必须有有效媒体流信息', () => {
  assert.equal(parseProbeResult(-1, valid).size, 50000);
  assert.equal(parseProbeResult(0, valid).video.codec_name, 'h264');
  for (const [code, text] of [[1,valid],[-1,'{}'],[-1,'bad json'],[-1,'{"streams":[]}']]) {
    assert.throws(() => parseProbeResult(code,text), {code:'PROBE_FAILED'});
  }
});
