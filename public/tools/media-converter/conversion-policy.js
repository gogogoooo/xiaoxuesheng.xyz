export class ConversionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ConversionError';
    this.code = code;
  }
}
export const MAX_FILE_SIZE = 1_000_000_000;
export const MIME_TYPES = Object.freeze({
  mp4: 'video/mp4', webm: 'video/webm', flv: 'video/x-flv', mp3: 'audio/mpeg',
  wav: 'audio/wav', aac: 'audio/aac', flac: 'audio/flac',
});

const INPUT_EXTENSIONS = new Set(['flv', 'mp4', 'mov', 'mkv', 'webm', 'avi', 'mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg']);
const PROFILES = Object.freeze({
  high: { h264Crf: '20', mp4Audio: '192k', vp8Crf: '10', vp8Bitrate: '2500k', audio: '320k', aac: '256k' },
  balanced: { h264Crf: '23', mp4Audio: '160k', vp8Crf: '15', vp8Bitrate: '1500k', audio: '192k', aac: '192k' },
  small: { h264Crf: '28', mp4Audio: '96k', vp8Crf: '25', vp8Bitrate: '800k', audio: '128k', aac: '128k' },
});
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const positive = (value) => {
  const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(number) && number > 0 ? number : null;
};
const warning = (warnings, code, message) => warnings.push({ code, message });

function validateFormat(format) {
  if (typeof format !== 'string' || !hasOwn(MIME_TYPES, format)) {
    throw new ConversionError('INVALID_REQUEST', '请选择支持的输出格式。');
  }
}

export function validateFile(file) {
  if (!file || typeof file.size !== 'number' || !Number.isFinite(file.size) || file.size <= 0 || file.size >= MAX_FILE_SIZE) {
    throw new ConversionError('INVALID_FILE_SIZE', '文件大小必须大于 0 且严格小于 1 GB。');
  }
  const extension = typeof file.name === 'string' ? /\.([a-z0-9]+)$/i.exec(file.name)?.[1].toLowerCase() : null;
  if (!INPUT_EXTENSIONS.has(extension)) {
    throw new ConversionError('UNSUPPORTED_INPUT', '不支持此文件扩展名。');
  }
  return extension;
}

export function normalizeMedia(raw) {
  const streams = Array.isArray(raw?.streams) ? raw.streams.filter((stream) => stream && typeof stream === 'object') : [];
  const videos = streams.filter((stream) => stream.codec_type === 'video' && Number(stream.disposition?.attached_pic) !== 1);
  const audios = streams.filter((stream) => stream.codec_type === 'audio');
  const durations = streams.map((stream) => positive(stream.duration)).filter((value) => value !== null);
  return {
    duration: positive(raw?.format?.duration) ?? (durations.length ? Math.max(...durations) : null),
    video: videos[0] ?? null,
    audio: audios[0] ?? null,
    videoCount: videos.length,
    audioCount: audios.length,
    subtitleCount: streams.filter((stream) => stream.codec_type === 'subtitle').length,
  };
}

function validateRequest(request, paths) {
  if (!request || typeof request !== 'object') throw new ConversionError('INVALID_REQUEST', '转换参数无效。');
  validateFormat(request.format);
  if (!['auto', 'encode'].includes(request.mode) || typeof request.quality !== 'string' || !hasOwn(PROFILES, request.quality) || !['original', '1080', '720'].includes(request.resolution)) {
    throw new ConversionError('INVALID_REQUEST', '转换模式、质量或分辨率无效。');
  }
  if (!paths || ['inputPath', 'outputPath'].some((key) => typeof paths[key] !== 'string' || !paths[key].trim() || paths[key].startsWith('-') || /\p{Cc}/u.test(paths[key])) || (paths.forceEncode !== undefined && typeof paths.forceEncode !== 'boolean')) {
    throw new ConversionError('INVALID_PATH', '转换文件路径无效。');
  }
}

function mapStream(args, stream) {
  if (!Number.isInteger(stream.index) || stream.index < 0) throw new ConversionError('INVALID_MEDIA', '媒体流索引无效。');
  args.push('-map', `0:${stream.index}`);
}

function videoFilter(stream, resolution) {
  let width = positive(stream.width);
  let height = positive(stream.height);
  const rotation = Number(stream.side_data_list?.find((entry) => Number.isFinite(Number(entry.rotation)))?.rotation ?? stream.tags?.rotate ?? 0);
  // FFmpeg's default autorotation runs before the output scale filter.
  if (Math.abs(rotation % 180) === 90) [width, height] = [height, width];
  const short = resolution === '720' ? 720 : 1080;
  const long = resolution === '720' ? 1280 : 1920;
  if (width && height) {
    const factor = resolution === 'original' ? 1 : Math.min(1, long / Math.max(width, height), short / Math.min(width, height));
    return `scale=${Math.max(2, Math.floor(width * factor / 2) * 2)}:${Math.max(2, Math.floor(height * factor / 2) * 2)}`;
  }
  const factor = resolution === 'original' ? '1' : `min(1,min(${long}/max(iw,ih),${short}/min(iw,ih)))`;
  return `scale=w='max(2,trunc(iw*${factor}/2)*2)':h='max(2,trunc(ih*${factor}/2)*2)'`;
}

function audioRepresentation(stream) {
  const codec = stream.codec_name ?? '';
  const pcmBits = /^pcm_[suf](\d+)/.exec(codec)?.[1];
  const isFloat = codec.startsWith('pcm_f');
  const knownBits = positive(stream.bits_per_raw_sample) ?? positive(stream.bits_per_sample) ?? positive(pcmBits);
  // Lossy codecs often decode to fltp; this does not mean a float source file.
  const losslessSampleBits = ['flac', 'alac', 'wavpack'].includes(codec)
    ? ({ u8: 8, u8p: 8, s16: 16, s16p: 16, s32: 32, s32p: 32 }[stream.sample_fmt] ?? null)
    : null;
  return { bits: knownBits ?? losslessSampleBits ?? 16, isFloat };
}

function pcmCodec(representation) {
  if (representation.isFloat) return 'pcm_f32le';
  if (representation.bits > 24) return 'pcm_s32le';
  if (representation.bits > 16) return 'pcm_s24le';
  return 'pcm_s16le';
}

function retainAudioShape(args, stream) {
  const sampleRate = positive(stream.sample_rate);
  const channels = positive(stream.channels);
  if (sampleRate && Number.isInteger(sampleRate)) args.push('-ar', String(sampleRate));
  if (channels && Number.isInteger(channels)) args.push('-ac', String(channels));
}

function checkWavSize(media, codec, warnings) {
  const sampleRate = positive(media.audio.sample_rate);
  const channels = positive(media.audio.channels);
  if (!positive(media.duration) || !sampleRate || !channels) {
    warning(warnings, 'UNKNOWN_OUTPUT_SIZE', '无法估算 WAV 大小；输出可能超过浏览器可处理的范围。');
    return;
  }
  const bytes = codec === 'pcm_s24le' ? 3 : codec === 'pcm_s16le' ? 2 : 4;
  if (media.duration * sampleRate * channels * bytes + 80 >= MAX_FILE_SIZE) {
    throw new ConversionError('OUTPUT_TOO_LARGE', '预计 WAV 输出达到或超过 1 GB，请选择压缩格式。');
  }
}

function encodeAudio(args, stream, format, profile, warnings, videoOutput) {
  let codec;
  if (format === 'mp3') codec = 'libmp3lame';
  else if (['aac', 'mp4', 'flv'].includes(format)) codec = 'aac';
  else if (format === 'webm') codec = 'libopus';
  else if (format === 'wav') codec = pcmCodec(audioRepresentation(stream));
  else codec = 'flac';
  args.push('-c:a', codec);
  if (['mp3', 'aac', 'mp4', 'webm', 'flv'].includes(format)) {
    const bitrate = videoOutput ? profile.mp4Audio : format === 'aac' ? profile.aac : profile.audio;
    args.push('-b:a', bitrate);
  }
  if ((codec === 'libmp3lame' || codec === 'libopus') && positive(stream.channels) > 2) {
    args.push('-ac', '2');
    warning(warnings, 'AUDIO_DOWNMIXED', '此编码将多声道音频下混为双声道。');
  }
  if (format === 'wav' || format === 'flac') retainAudioShape(args, stream);
  if (format === 'flac') {
    const { bits, isFloat } = audioRepresentation(stream);
    const outputBits = isFloat || bits > 16 ? 24 : 16;
    args.push('-sample_fmt', outputBits === 24 ? 's32' : 's16', '-bits_per_raw_sample', String(outputBits));
    if (isFloat || bits > 24) warning(warnings, 'AUDIO_QUANTIZED', '源音频将量化为 24 位整数 PCM 后编码 FLAC。');
  }
}

export function createConversionPlan(request, media, paths) {
  validateRequest(request, paths);
  const { format, quality, mode, resolution } = request;
  const videoOutput = ['mp4', 'webm', 'flv'].includes(format);
  const h264Container = format === 'mp4' || format === 'flv';
  if (videoOutput && !media?.video) throw new ConversionError('NO_VIDEO', '文件中没有可转换的视频轨道。');
  if (!videoOutput && !media?.audio) throw new ConversionError('NO_AUDIO', '文件中没有可提取的音频轨道。');
  const warnings = [];
  if (media.videoCount > 1) warning(warnings, 'MULTIPLE_VIDEO_TRACKS', '只保留第一个视频轨道。');
  if (media.audioCount > 1) warning(warnings, 'MULTIPLE_AUDIO_TRACKS', '只保留第一个音频轨道。');
  if (media.subtitleCount > 0) warning(warnings, 'SUBTITLES_OMITTED', '输出不保留字幕轨道。');
  const args = ['-hide_banner', '-y', '-filter_threads', '1', '-filter_complex_threads', '1', '-threads', '1', '-i', paths.inputPath];
  const force = mode === 'encode' || paths.forceEncode === true;
  let method = 'copy';
  let copyAudio = false;
  if (videoOutput) {
    mapStream(args, media.video);
    if (media.audio) mapStream(args, media.audio);
    const compatibleVideo = h264Container
      ? media.video.codec_name === 'h264' && media.video.pix_fmt === 'yuv420p'
      : ['vp8', 'vp9'].includes(media.video.codec_name);
    const copyVideo = !force && resolution === 'original' && compatibleVideo;
    copyAudio = !force && (h264Container ? media.audio?.codec_name === 'aac' : ['opus', 'vorbis'].includes(media.audio?.codec_name));
    if (copyVideo) args.push('-c:v', 'copy');
    else {
      method = 'encode';
      if (h264Container) args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', PROFILES[quality].h264Crf, '-pix_fmt', 'yuv420p');
      else args.push('-c:v', 'libvpx', '-deadline', 'realtime', '-cpu-used', '5', '-b:v', PROFILES[quality].vp8Bitrate, '-crf', PROFILES[quality].vp8Crf);
      args.push('-vf', videoFilter(media.video, resolution));
    }
    if (media.audio) {
      if (copyAudio) args.push('-c:a', 'copy');
      else {
        if (copyVideo) method = 'audio-encode';
        encodeAudio(args, media.audio, format, PROFILES[quality], warnings, true);
      }
    }
    if (format === 'mp4') args.push('-movflags', '+faststart');
  } else {
    mapStream(args, media.audio);
    args.push('-vn');
    const codec = media.audio.codec_name;
    copyAudio = !force && (codec === format || (format === 'wav' && ['pcm_s16le', 'pcm_s24le', 'pcm_s32le', 'pcm_f32le'].includes(codec)));
    if (format === 'wav') checkWavSize(media, pcmCodec(audioRepresentation(media.audio)), warnings);
    if (copyAudio) args.push('-c:a', 'copy');
    else {
      method = 'audio-encode';
      encodeAudio(args, media.audio, format, PROFILES[quality], warnings, false);
    }
  }
  args.push('-sn', '-dn', '-threads', '1', '-f', format === 'aac' ? 'adts' : format, paths.outputPath);
  return { args, method, mime: MIME_TYPES[format], duration: positive(media.duration), warnings, format };
}

export function outputFilename(sourceName, format) {
  validateFormat(format);
  const cleaned = String(sourceName ?? '').normalize('NFC').replace(/[\\/\p{Cc}<>:"|?*]/gu, '');
  const base = cleaned.replace(/\.[^.]*$/, '').replace(/^[.\s]+|[.\s]+$/g, '');
  const suffix = `_converted.${format}`;
  let bounded = '';
  for (const character of base) {
    if (bounded.length + character.length > 150) break;
    bounded += character;
  }
  return `${bounded || 'media'}${suffix}`;
}
