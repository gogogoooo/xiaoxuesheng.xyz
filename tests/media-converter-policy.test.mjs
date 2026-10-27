import test from 'node:test';
import assert from 'node:assert/strict';
import { ConversionError, MAX_FILE_SIZE, MIME_TYPES, validateFile, normalizeMedia, createConversionPlan, outputFilename } from '../public/tools/media-converter/conversion-policy.js';

const video = (codec_name = 'h264', extra = {}) => ({ index: 0, codec_type: 'video', codec_name, pix_fmt: 'yuv420p', width: 1920, height: 1080, ...extra });
const audio = (codec_name = 'aac', extra = {}) => ({ index: 1, codec_type: 'audio', codec_name, sample_rate: '48000', channels: 2, ...extra });
const media = (...streams) => normalizeMedia({ format: { duration: '10' }, streams });
const plan = (streams, request = {}, paths = {}) => createConversionPlan({ format: 'mp4', mode: 'auto', quality: 'balanced', resolution: 'original', ...request }, media(...streams), { inputPath: 'input.flv', outputPath: 'output.bin', ...paths });
const option = (p, key) => p.args[p.args.indexOf(key) + 1];
const hasWarning = (p, code) => p.warnings.some((w) => w.code === code && w.message);
const fails = (fn, code) => assert.throws(fn, (error) => error instanceof ConversionError && error.code === code);

test('file validation enforces the strict decimal 1 GB boundary and extension allowlist', () => {
  assert.equal(MAX_FILE_SIZE, 1_000_000_000);
  assert.equal(validateFile({ name: '中文.FLV', size: MAX_FILE_SIZE - 1 }), 'flv');
  for (const size of [0, -1, NaN, Infinity, MAX_FILE_SIZE, MAX_FILE_SIZE + 1]) fails(() => validateFile({ name: 'a.mp4', size }), 'INVALID_FILE_SIZE');
  for (const name of ['a.exe', 'mp4', 'a.mp4.exe', 'a.mp4\0']) fails(() => validateFile({ name, size: 1 }), 'UNSUPPORTED_INPUT');
  for (const ext of ['flv', 'mp4', 'mov', 'mkv', 'webm', 'avi', 'mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg']) assert.equal(validateFile({ name: `a.${ext}`, size: 1 }), ext);
});

test('normalization excludes cover art, selects real stream indices, and derives positive duration', () => {
  const cover = video('mjpeg', { disposition: { attached_pic: 1 } });
  const main = video('h264', { index: 4, duration: '25' });
  const sound = audio('aac', { index: 7, duration: '30' });
  const result = normalizeMedia({ format: { duration: 'N/A' }, streams: [cover, main, sound, video('vp9', { index: 9 }), { codec_type: 'subtitle' }] });
  assert.equal(result.video, main);
  assert.equal(result.audio, sound);
  assert.equal(result.videoCount, 2);
  assert.equal(result.audioCount, 1);
  assert.equal(result.subtitleCount, 1);
  assert.equal(result.duration, 30);
  assert.equal(normalizeMedia({ streams: [cover] }).video, null);
  assert.equal(normalizeMedia({ format: { duration: '-3' } }).duration, null);
});

test('H264/AAC FLV remuxes to MP4 with explicit stream maps and faststart', () => {
  const p = plan([video('h264', { index: 3 }), audio('aac', { index: 5 })]);
  assert.equal(p.method, 'copy');
  assert.equal(option(p, '-c:v'), 'copy');
  assert.equal(option(p, '-c:a'), 'copy');
  assert.deepEqual(p.args.flatMap((arg, i) => arg === '-map' ? [p.args[i + 1]] : []), ['0:3', '0:5']);
  assert.equal(option(p, '-movflags'), '+faststart');
  assert.equal(p.mime, 'video/mp4');
  assert.equal(p.duration, 10);
});

test('compatible video preserves quality while only incompatible MP3 audio is encoded', () => {
  const p = plan([video(), audio('mp3')]);
  assert.equal(p.method, 'audio-encode');
  assert.equal(option(p, '-c:v'), 'copy');
  assert.equal(option(p, '-c:a'), 'aac');
  assert.equal(option(p, '-b:a'), '160k');
  assert.ok(!p.args.includes('-vf'));
});

test('VP8/Opus and VP9/Vorbis WebM remux, and compatible silent video remuxes', () => {
  for (const [v, a] of [['vp8', 'opus'], ['vp9', 'vorbis']]) assert.equal(plan([video(v), audio(a)], { format: 'webm' }).method, 'copy');
  assert.equal(plan([video()]).method, 'copy');
  assert.equal(plan([video()]).args.includes('-c:a'), false);
});

test('encode mode, forceEncode, incompatible pixel format, and resize force video encoding', () => {
  for (const p of [plan([video(), audio()], { mode: 'encode' }), plan([video(), audio()], {}, { forceEncode: true }), plan([video('h264', { pix_fmt: 'yuv420p10le' }), audio()]), plan([video(), audio()], { resolution: '720' })]) {
    assert.equal(p.method, 'encode');
    assert.equal(option(p, '-c:v'), 'libx264');
    assert.equal(option(p, '-pix_fmt'), 'yuv420p');
    assert.equal(option(p, '-preset'), 'ultrafast');
    assert.equal(option(p, '-crf'), '23');
    assert.equal(option(p, '-threads'), '1');
  }
  assert.equal(option(plan([video('hevc'), audio()]), '-c:a'), 'copy');
  assert.equal(option(plan([video(), audio()], { mode: 'encode' }), '-c:a'), 'aac');
});

test('MP4 and realtime WebM encoding apply each quality profile', () => {
  for (const [quality, crf, bitrate] of [['high', '20', '192k'], ['balanced', '23', '160k'], ['small', '28', '96k']]) {
    const p = plan([video(), audio()], { mode: 'encode', quality });
    assert.equal(option(p, '-crf'), crf);
    assert.equal(option(p, '-b:a'), bitrate);
  }
  for (const [quality, crf, bitrate] of [['high', '10', '2500k'], ['balanced', '15', '1500k'], ['small', '25', '800k']]) {
    const p = plan([video(), audio()], { format: 'webm', mode: 'encode', quality });
    assert.equal(option(p, '-c:v'), 'libvpx');
    assert.equal(option(p, '-deadline'), 'realtime');
    assert.equal(option(p, '-cpu-used'), '5');
    assert.equal(option(p, '-crf'), crf);
    assert.equal(option(p, '-b:v'), bitrate);
    assert.equal(option(p, '-c:a'), 'libopus');
  }
});

test('resolution respects rotation, aspect ratio, even sizes, and no upscaling', () => {
  assert.equal(option(plan([video()], { resolution: '720' }), '-vf'), 'scale=1280:720');
  assert.equal(option(plan([video('h264', { side_data_list: [{ rotation: -90 }] })], { resolution: '720' }), '-vf'), 'scale=720:1280');
  assert.equal(option(plan([video('h264', { width: 641, height: 361 })], { resolution: '1080' }), '-vf'), 'scale=640:360');
  assert.equal(option(plan([video('h264', { width: 1919, height: 1079 })], { mode: 'encode' }), '-vf'), 'scale=1918:1078');
  const unknown = option(plan([video('h264', { width: undefined, height: undefined })], { resolution: '720' }), '-vf');
  assert.match(unknown, /iw/);
  assert.match(unknown, /ih/);
  assert.doesNotMatch(unknown, /NaN|undefined/);
});

test('audio extraction requires audio and video output requires real video', () => {
  fails(() => plan([video()], { format: 'mp3' }), 'NO_AUDIO');
  fails(() => plan([audio()]), 'NO_VIDEO');
  fails(() => plan([video('mjpeg', { disposition: { attached_pic: 1 } }), audio()]), 'NO_VIDEO');
  const p = plan([video(), audio('mp3', { index: 8 })], { format: 'mp3' });
  assert.equal(p.method, 'copy');
  assert.equal(option(p, '-map'), '0:8');
  assert.ok(!p.args.includes('-c:v'));
  assert.equal(option(p, '-c:a'), 'copy');
});

test('MP3/AAC encoding uses bounded profiles and AAC ADTS; matching AAC extracts', () => {
  for (const [quality, mp3, aac] of [['high', '320k', '256k'], ['balanced', '192k', '192k'], ['small', '128k', '128k']]) {
    const p = plan([audio('flac')], { format: 'mp3', quality });
    assert.equal(option(p, '-c:a'), 'libmp3lame');
    assert.equal(option(p, '-b:a'), mp3);
    const q = plan([audio('flac')], { format: 'aac', quality });
    assert.equal(option(q, '-c:a'), 'aac');
    assert.equal(option(q, '-b:a'), aac);
    assert.equal(option(q, '-f'), 'adts');
  }
  assert.equal(plan([audio()], { format: 'aac' }).method, 'copy');
});

test('WAV preserves PCM representation, sample rate, channels and compressed default', () => {
  for (const [source, extra, expected] of [['pcm_s16le', {}, 'pcm_s16le'], ['flac', { bits_per_raw_sample: '24' }, 'pcm_s24le'], ['pcm_s32le', {}, 'pcm_s32le'], ['pcm_f32le', {}, 'pcm_f32le'], ['aac', { sample_fmt: 'fltp' }, 'pcm_s16le']]) {
    const p = plan([audio(source, { sample_rate: '96000', channels: 6, ...extra })], { format: 'wav', mode: 'encode' });
    assert.equal(option(p, '-c:a'), expected);
    assert.equal(option(p, '-ar'), '96000');
    assert.equal(option(p, '-ac'), '6');
  }
});

test('WAV rejects predicted output at or above 1GB and warns for unknown duration', () => {
  const sound = audio('pcm_s16le', { channels: 2, sample_rate: '50000' });
  const exact = normalizeMedia({ format: { duration: '5000' }, streams: [sound] });
  fails(() => createConversionPlan({ format: 'wav', mode: 'encode', quality: 'balanced', resolution: 'original' }, exact, { inputPath: 'a', outputPath: 'b' }), 'OUTPUT_TOO_LARGE');
  const unknown = normalizeMedia({ streams: [sound] });
  assert.ok(hasWarning(createConversionPlan({ format: 'wav', mode: 'encode', quality: 'balanced', resolution: 'original' }, unknown, { inputPath: 'a', outputPath: 'b' }), 'UNKNOWN_OUTPUT_SIZE'));
});

test('FLAC preserves 24-bit audio and warns when float or 32-bit PCM is quantized', () => {
  const p = plan([audio('pcm_s24le', { bits_per_raw_sample: '24', channels: 6 })], { format: 'flac' });
  assert.equal(option(p, '-c:a'), 'flac');
  assert.equal(option(p, '-sample_fmt'), 's32');
  assert.equal(option(p, '-bits_per_raw_sample'), '24');
  assert.equal(option(p, '-ac'), '6');
  for (const source of ['pcm_f32le', 'pcm_s32le']) assert.ok(hasWarning(plan([audio(source)], { format: 'flac' }), 'AUDIO_QUANTIZED'));
  assert.equal(plan([audio('flac')], { format: 'flac' }).method, 'copy');
});

test('MP3/Opus encoding downmixes multichannel sources while copy never changes channels', () => {
  for (const p of [plan([audio('flac', { channels: 6 })], { format: 'mp3' }), plan([video(), audio('aac', { channels: 6 })], { format: 'webm' })]) {
    assert.equal(option(p, '-ac'), '2');
    assert.ok(hasWarning(p, 'AUDIO_DOWNMIXED'));
  }
  const p = plan([audio('mp3', { channels: 6 })], { format: 'mp3' });
  assert.ok(!p.args.includes('-ac'));
  assert.ok(!p.args.includes('-ar'));
});

test('multi video/audio tracks and subtitles generate visible warnings', () => {
  const p = plan([video(), audio(), video('vp9', { index: 3 }), audio('aac', { index: 4 }), { index: 5, codec_type: 'subtitle' }]);
  assert.ok(hasWarning(p, 'MULTIPLE_VIDEO_TRACKS'));
  assert.ok(hasWarning(p, 'MULTIPLE_AUDIO_TRACKS'));
  assert.ok(hasWarning(p, 'SUBTITLES_OMITTED'));
  assert.ok(!p.args.includes('0'));
});

test('configuration values reject unsupported options and injection strings', () => {
  for (const request of [{ format: '../mp4' }, { mode: 'copy' }, { quality: '-y' }, { resolution: '720;echo x' }, { format: 'MP4' }]) fails(() => plan([video(), audio()], request), 'INVALID_REQUEST');
  for (const paths of [{ forceEncode: 'yes' }, { inputPath: '-i' }, { outputPath: 'out\0.mp4' }]) fails(() => plan([video(), audio()], {}, paths), 'INVALID_PATH');
  assert.deepEqual(Object.keys(MIME_TYPES).sort(), ['aac', 'flac', 'mp3', 'mp4', 'wav', 'webm']);
  for (const format of Object.keys(MIME_TYPES)) assert.equal(plan([video(), audio()], { format }).format, format);
});

test('quality rejects coerced objects, stream indices must be valid, and Unicode names stay bounded', () => {
  fails(() => plan([video(), audio()], { quality: { toString: () => 'high' } }), 'INVALID_REQUEST');
  fails(() => plan([video('h264', { index: undefined }), audio()]), 'INVALID_MEDIA');
  fails(() => plan([video('h264', { index: -1 }), audio()]), 'INVALID_MEDIA');
  assert.ok(outputFilename('🎬'.repeat(300) + '.mov', 'mp4').length <= 180);
});

test('single-thread bounds apply to decoding, encoding, and video filters', () => {
  const p = plan([video(), audio()], { mode: 'encode' });
  assert.equal(p.args[p.args.indexOf('-i') - 2], '-threads');
  assert.equal(p.args[p.args.indexOf('-i') - 1], '1');
  assert.equal(option(p, '-filter_threads'), '1');
  assert.equal(option(p, '-filter_complex_threads'), '1');
  assert.equal(p.args.lastIndexOf('-threads') > p.args.indexOf('-i'), true);
});

test('download names preserve Chinese, strip paths/control characters and bound length', () => {
  assert.equal(outputFilename('假期录像.FLV', 'mp4'), '假期录像_converted.mp4');
  const result = outputFilename('../目录\\测\u0000试.mp4', 'mp3');
  assert.doesNotMatch(result, /[\\/\p{Cc}]/u);
  assert.match(result, /测试_converted\.mp3$/);
  assert.ok(outputFilename('中'.repeat(300) + '.flv', 'webm').length <= 180);
  assert.equal(outputFilename('.flv', 'wav'), 'media_converted.wav');
  fails(() => outputFilename('a.flv', '../mp4'), 'INVALID_REQUEST');
});
