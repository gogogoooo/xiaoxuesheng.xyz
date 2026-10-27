import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import createCore from '@ffmpeg/core';
import {createConversionPlan} from '../public/tools/media-converter/conversion-policy.js';
import {parseProbeResult} from '../public/tools/media-converter/engine/probe-result.js';

test('固定 Wasm 核心实际生成 FLV，并转换六种输出及选择性音频编码', async (t) => {
  // 仅在 Node 测试进程补充核心所需的脚本地址；生产环境始终在浏览器 Worker。
  globalThis.self = {location:{href:'file:///media-engine-test.js'}};
  const core = await createCore({wasmBinary:await fs.readFile(new URL('../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm',import.meta.url))});
  let logs = [];
  core.setLogger(({message}) => {logs.push(message); logs = logs.slice(-15);});
  const exec = (args) => {
    core.exec(...args);
    const code = core.ret;
    core.reset();
    assert.equal(code,0,logs.join('\n'));
  };
  const probe = (input) => {
    core.ffprobe('-v','error','-count_packets','-show_format','-show_streams','-of','json','-i',input,'-o','info.json');
    const code = core.ret;
    core.reset();
    return parseProbeResult(code,core.FS.readFile('info.json',{encoding:'utf8'}));
  };
  exec(['-f','lavfi','-i','testsrc=size=128x96:rate=10','-f','lavfi','-i','sine=frequency=440:sample_rate=44100','-t','1','-threads','1','-filter_threads','1','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','source.flv']);
  const media = probe('source.flv');
  assert.equal(media.video.codec_name,'h264');
  assert.equal(media.audio.codec_name,'aac');
  for (const format of ['mp4','webm','mp3','wav','aac','flac']) {
    await t.test(format, () => {
      const outputPath = `result.${format}`;
      const plan = createConversionPlan({format,mode:'auto',quality:'balanced',resolution:'original'},media,{inputPath:'source.flv',outputPath});
      exec(plan.args);
      const actual = probe(outputPath);
      assert.ok(actual.duration > .8 && actual.duration < 1.3);
      assert.ok(core.FS.readFile(outputPath).length > 100);
      assert.equal((actual.video || actual.audio).codec_name, {mp4:'h264',webm:'vp8',mp3:'mp3',wav:'pcm_s16le',aac:'aac',flac:'flac'}[format]);
      core.FS.unlink(outputPath);
    });
  }
  exec(['-i','source.flv','-c:v','copy','-c:a','libmp3lame','mp3-source.flv']);
  await t.test('MP4 → FLV → MP4 往返及 FLV 重新编码', () => {
    const request = {mode:'auto',quality:'balanced',resolution:'original'};
    exec(createConversionPlan({...request,format:'mp4'},media,{inputPath:'source.flv',outputPath:'roundtrip.mp4'}).args);
    const originalMp4 = probe('roundtrip.mp4');
    const toFlv = createConversionPlan({...request,format:'flv'},originalMp4,{inputPath:'roundtrip.mp4',outputPath:'roundtrip.flv'});
    assert.equal(toFlv.method,'copy');
    exec(toFlv.args);
    assert.deepEqual([...core.FS.readFile('roundtrip.flv').subarray(0,3)],[70,76,86]);
    const flv = probe('roundtrip.flv');
    assert.equal(flv.video.codec_name,'h264');
    assert.equal(flv.audio.codec_name,'aac');
    exec(createConversionPlan({...request,format:'mp4'},flv,{inputPath:'roundtrip.flv',outputPath:'roundtrip-back.mp4'}).args);
    const back = probe('roundtrip-back.mp4');
    assert.ok(Math.abs(back.duration - originalMp4.duration) < .05, JSON.stringify({original:originalMp4.duration,back:back.duration}));
    assert.ok(Number(back.video.nb_read_packets) > 0);
    assert.equal(back.video.nb_read_packets,originalMp4.video.nb_read_packets);
    assert.equal(back.audio.nb_read_packets,originalMp4.audio.nb_read_packets);
    exec(createConversionPlan({...request,format:'flv',mode:'encode'},media,{inputPath:'source.flv',outputPath:'encoded.flv'}).args);
    assert.equal(probe('encoded.flv').video.codec_name,'h264');
    assert.equal(probe('encoded.flv').audio.codec_name,'aac');
  });
  const plan = createConversionPlan({format:'mp4',mode:'auto',quality:'balanced',resolution:'original'},probe('mp3-source.flv'),{inputPath:'mp3-source.flv',outputPath:'result.mp4'});
  assert.equal(plan.method,'audio-encode');
  exec(plan.args);
  assert.equal(probe('result.mp4').audio.codec_name,'aac');
  core.FS.writeFile('broken.flv',new TextEncoder().encode('broken media'));
  assert.throws(() => probe('broken.flv'),{code:'PROBE_FAILED'});
});
