const MANIFEST_URL = new URL('./engine-manifest.json', import.meta.url);
const MAX_PART_SIZE = 16 * 1024 * 1024;

function abortIfNeeded(signal) {
  if (signal?.aborted) throw new DOMException('任务已取消', 'AbortError');
}

function resourceURL(relative) {
  const url = new URL(relative, MANIFEST_URL);
  const root = new URL('../', MANIFEST_URL).pathname;
  if (url.origin !== location.origin || !url.pathname.startsWith(`${root}vendor/`)) {
    throw new Error('引擎资源路径不正确，请刷新页面后重试。');
  }
  return url.href;
}

async function hash(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function fetchPart(part, signal, onBytes) {
  if (!Number.isSafeInteger(part.size) || part.size <= 0 || part.size > MAX_PART_SIZE) throw new Error('转换引擎资源清单无效。');
  const response = await fetch(resourceURL(part.url), {signal});
  if (!response.ok) throw new Error(`转换引擎下载失败（${response.status}），请检查网络后重试。`);
  const buffer = new Uint8Array(part.size);
  let offset = 0;
  const reader = response.body?.getReader();
  if (!reader) throw new Error('当前浏览器不支持所需的文件读取能力。');
  try {
    while (true) {
      abortIfNeeded(signal);
      const {done, value} = await reader.read();
      if (done) break;
      if (offset + value.byteLength > part.size) throw new Error('引擎资源大小异常，请重新加载。');
      buffer.set(value, offset);
      offset += value.byteLength;
      onBytes(value.byteLength);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  if (offset !== part.size || await hash(buffer) !== part.sha256) throw new Error('引擎资源校验失败，请刷新后重新加载。');
  return new Blob([buffer]);
}

export async function loadCoreResources({signal, onProgress = () => {}} = {}) {
  if (!isSecureContext || !globalThis.WebAssembly || !globalThis.Worker || !crypto.subtle) {
    throw new Error('请使用 HTTPS 或 localhost，并在新版电脑浏览器中打开本工具。');
  }
  abortIfNeeded(signal);
  const response = await fetch(MANIFEST_URL, {signal, cache: 'no-cache'});
  if (!response.ok) throw new Error('转换引擎尚未就绪，请重新加载页面。');
  const manifest = await response.json();
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.core?.parts) || !manifest.core.parts.length || manifest.core.parts.length > 8) {
    throw new Error('转换引擎资源清单无效。');
  }
  const total = manifest.core.parts.reduce((sum, part) => sum + part.size, 0);
  if (!Number.isSafeInteger(total) || total !== manifest.core.size || total > 128 * 1024 * 1024) throw new Error('转换引擎资源清单无效。');
  let loaded = 0;
  onProgress(0);
  const parts = [];
  for (const part of manifest.core.parts) {
    parts.push(await fetchPart(part, signal, (bytes) => { loaded += bytes; onProgress(loaded / total); }));
  }
  const blob = new Blob(parts, {type: 'application/wasm'});
  if (await hash(await blob.arrayBuffer()) !== manifest.core.sha256) throw new Error('转换核心整体校验失败。');
  abortIfNeeded(signal);
  const module = await import(resourceURL(manifest.wrapper.module));
  abortIfNeeded(signal);
  const wasmURL = URL.createObjectURL(blob);
  let released = false;
  return {
    FFmpeg: module.FFmpeg,
    FFFSType: module.FFFSType,
    coreURL: resourceURL(manifest.core.script),
    classWorkerURL: resourceURL(manifest.wrapper.worker),
    wasmURL,
    release() {
      if (released) return;
      released = true;
      URL.revokeObjectURL(wasmURL);
    },
  };
}
