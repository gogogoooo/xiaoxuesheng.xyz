import {ConversionError, normalizeMedia} from '../conversion-policy.js';

export function parseProbeResult(code, text) {
  const failed = () => new ConversionError('PROBE_FAILED', '无法读取文件信息。文件可能已损坏，或使用了当前引擎不支持的编码。');
  // core 0.12.10 的 ffprobe 成功后 ret 仍为初始 -1；不能仅以退出码判断。
  if (![0, -1].includes(code) || typeof text !== 'string' || text.length > 2_000_000) throw failed();
  try {
    const info = JSON.parse(text);
    const media = normalizeMedia(info);
    if (!media.video && !media.audio) throw failed();
    const size = Number(info.format?.size);
    return {...media, size: Number.isSafeInteger(size) && size > 0 ? size : null};
  } catch {
    throw failed();
  }
}
