import {ConversionController} from './converter-controller.js';
import {MAX_FILE_SIZE, outputFilename} from './conversion-policy.js';
const LARGE_FILE_SIZE = 300_000_000;
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg']);
const VIDEO_EXTENSIONS = new Set(['flv', 'mp4', 'mov', 'mkv', 'webm', 'avi']);
const FORMAT_OPTIONS = {
  video: [
    {value: 'mp4', title: 'MP4', detail: '兼容性优先'},
    {value: 'webm', title: 'WebM', detail: '适合网页播放'},
  ],
  audio: [
    {value: 'mp3', title: 'MP3', detail: '日常聆听'},
    {value: 'wav', title: 'WAV', detail: '无压缩音频'},
    {value: 'aac', title: 'AAC', detail: '轻巧音频'},
    {value: 'flac', title: 'FLAC', detail: '无损音频'},
  ],
};

const elements = Object.fromEntries([
  'file-input', 'choose-file', 'replace-file', 'remove-file', 'dropzone',
  'selected-file', 'source-name', 'source-size', 'source-duration', 'source-extension',
  'source-icon', 'file-error', 'memory-notice', 'video-tab', 'audio-tab',
  'format-options', 'format-note', 'processing-mode', 'mode-explanation', 'quality',
  'quality-label', 'resolution', 'output-name', 'engine-note', 'convert-button',
  'announcement', 'runtime', 'task-stage', 'task-method', 'task-file', 'task-progress',
  'task-progress-fill', 'task-ratio', 'task-note', 'task-warnings', 'cancel-conversion',
  'result-download', 'result-preview', 'result-info', 'result-video', 'result-audio', 'preview-error',
].map((id) => [id, document.getElementById(id)]));

let selectedFile = null;
let outputType = 'video';
let selectedFormat = 'mp4';
let metadataCleanup = null;
let dragDepth = 0;
let busy = false;
let generation = 0;
let lastProgressPaint = 0;
let currentWarnings = new Set();
const controller = new ConversionController();

function extensionFor(name) {
  return name.includes('.') ? name.split('.').pop().toLowerCase() : '';
}

function formatSize(bytes) {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1_000))} KB`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '时长暂无法读取';
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const remainder = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function announce(message) {
  elements.announcement.textContent = message;
}

function showError(message) {
  elements['file-error'].textContent = message;
  elements['file-error'].hidden = false;
  announce(message);
}

function clearError() {
  elements['file-error'].hidden = true;
  elements['file-error'].textContent = '';
}

function updateOutputName() {
  const stem = selectedFile ? outputFilename(selectedFile.name, selectedFormat).replace(/\.[^.]+$/, '') : '';
  elements['output-name'].replaceChildren();
  elements['output-name'].append(document.createTextNode(stem || '选择文件后显示名称'));
  const suffix = document.createElement('span');
  suffix.textContent = `.${selectedFormat}`;
  elements['output-name'].append(suffix);
  elements['engine-note'].textContent = selectedFile
    ? '文件已就位 · 全程在本机处理'
    : '选择文件后开始 · 建议使用电脑浏览器';
  elements['convert-button'].disabled = busy || !selectedFile;
}

function renderFormats() {
  elements['format-options'].replaceChildren();
  elements['format-options'].classList.toggle('is-audio', outputType === 'audio');
  for (const format of FORMAT_OPTIONS[outputType]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'format-option';
    button.setAttribute('aria-pressed', String(selectedFormat === format.value));
    button.setAttribute('aria-label', `输出为 ${format.title}`);
    const title = document.createElement('b');
    title.textContent = format.title;
    const detail = document.createElement('span');
    detail.textContent = format.detail;
    button.append(title, detail);
    button.addEventListener('click', () => {
      if (busy) return;
      invalidateResult();
      selectedFormat = format.value;
      for (const candidate of elements['format-options'].children) {
        candidate.setAttribute('aria-pressed', String(candidate === button));
      }
      updateOutputName();
      updateQualityState();
    });
    elements['format-options'].append(button);
  }
  updateOutputName();
  updateQualityState();
}

function updateQualityState() {
  const audio = outputType === 'audio';
  const lossless = audio && ['wav', 'flac'].includes(selectedFormat);
  elements['quality-label'].textContent = audio ? '音频质量' : '重新编码画质';
  elements.quality.disabled = lossless;
  const labels = audio
    ? [lossless ? (selectedFormat === 'wav' ? '无压缩音频' : '无损压缩') : '标准 · 192 kbps', '高音质 · 320 kbps', '较小文件 · 128 kbps']
    : ['均衡 · 推荐', '高画质 · 文件更大', '较小文件 · 画质降低'];
  Array.from(elements.quality.options).forEach((option, index) => { option.textContent = labels[index]; });
  if (lossless) elements.quality.value = 'balanced';
}

function updateModeExplanation() {
  const encode = elements['processing-mode'].value === 'encode';
  elements['mode-explanation'].textContent = encode
    ? '重新生成音视频数据，耗时通常更长，质量和文件大小受下方设置影响。'
    : outputType === 'audio'
      ? '音频编码兼容时优先直接提取；改变编码格式时需要重新编码。'
      : '编码兼容时直接换封装，保留原始画质；不兼容时需要重新编码。';
}

function setOutputType(type) {
  if (busy) return;
  invalidateResult();
  outputType = type;
  selectedFormat = FORMAT_OPTIONS[type][0].value;
  elements['video-tab'].setAttribute('aria-pressed', String(type === 'video'));
  elements['audio-tab'].setAttribute('aria-pressed', String(type === 'audio'));
  elements['format-note'].textContent = type === 'audio' ? '提取声音，或转换音频文件' : '适合日常播放与分享';
  elements.resolution.closest('details').hidden = type === 'audio';
  renderFormats();
  updateModeExplanation();
}

function readDuration(file, extension) {
  if (metadataCleanup) metadataCleanup();
  const media = document.createElement(AUDIO_EXTENSIONS.has(extension) ? 'audio' : 'video');
  const url = URL.createObjectURL(file);
  let done = false;
  let timeout;
  function finish(durationText) {
    if (done) return;
    done = true;
    clearTimeout(timeout);
    media.onloadedmetadata = null;
    media.onerror = null;
    media.removeAttribute('src');
    media.load();
    URL.revokeObjectURL(url);
    metadataCleanup = null;
    if (selectedFile === file) elements['source-duration'].textContent = durationText;
  }
  metadataCleanup = () => finish('时长暂无法读取');
  media.preload = 'metadata';
  media.onloadedmetadata = () => finish(formatDuration(media.duration));
  media.onerror = () => finish('浏览器无法预读时长');
  timeout = setTimeout(() => finish('时长暂无法读取'), 4000);
  media.src = url;
}

function chooseFile(file) {
  if (!file) return;
  if (busy) return;
  clearError();
  const extension = extensionFor(file.name);
  if (!AUDIO_EXTENSIONS.has(extension) && !VIDEO_EXTENSIONS.has(extension)) {
    showError('暂不支持这种文件类型。请选择 FLV、MP4、MOV、MKV、WebM、AVI 或常见音频文件。');
    return;
  }
  if (file.size === 0) {
    showError('这个文件是空的，请重新选择。');
    return;
  }
  if (file.size >= MAX_FILE_SIZE) {
    showError(`文件大小为 ${formatSize(file.size)}，请选择小于 1 GB 的文件。`);
    return;
  }
  if (metadataCleanup) metadataCleanup();
  invalidateResult();
  selectedFile = file;
  elements['source-name'].textContent = file.name;
  elements['source-size'].textContent = formatSize(file.size);
  elements['source-duration'].textContent = '正在读取时长…';
  elements['source-extension'].textContent = extension.toUpperCase();
  elements['source-icon'].querySelector('use').setAttribute('href', AUDIO_EXTENSIONS.has(extension) ? '#i-audio' : '#i-video');
  elements.dropzone.hidden = true;
  elements['selected-file'].hidden = false;
  elements['memory-notice'].hidden = file.size < LARGE_FILE_SIZE;
  elements['video-tab'].disabled = AUDIO_EXTENSIONS.has(extension);
  if (AUDIO_EXTENSIONS.has(extension)) setOutputType('audio');
  updateOutputName();
  readDuration(file, extension);
  announce(`已选择 ${file.name}。设置输出格式后即可开始转换。`);
}

function removeFile() {
  if (busy) return;
  invalidateResult();
  selectedFile = null;
  if (metadataCleanup) metadataCleanup();
  elements['file-input'].value = '';
  elements['selected-file'].hidden = true;
  elements.dropzone.hidden = false;
  elements['memory-notice'].hidden = true;
  elements['video-tab'].disabled = false;
  clearError();
  updateOutputName();
  announce('文件已移除。');
}

function openFileDialog() {
  if (busy) return;
  elements['file-input'].value = '';
  elements['file-input'].click();
}

elements['choose-file'].addEventListener('click', openFileDialog);
elements['replace-file'].addEventListener('click', openFileDialog);
elements['remove-file'].addEventListener('click', removeFile);
elements['file-input'].addEventListener('change', (event) => chooseFile(event.target.files[0]));
elements['video-tab'].addEventListener('click', () => setOutputType('video'));
elements['audio-tab'].addEventListener('click', () => setOutputType('audio'));
elements['processing-mode'].addEventListener('change', () => { invalidateResult(); updateModeExplanation(); });
elements.quality.addEventListener('change', invalidateResult);
elements.resolution.addEventListener('change', () => {
  invalidateResult();
  if (elements.resolution.value !== 'original') {
    elements['processing-mode'].value = 'encode';
    updateModeExplanation();
  }
});

elements.dropzone.addEventListener('dragenter', (event) => {
  event.preventDefault();
  dragDepth += 1;
  elements.dropzone.classList.add('is-dragging');
});
elements.dropzone.addEventListener('dragover', (event) => event.preventDefault());
elements.dropzone.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) elements.dropzone.classList.remove('is-dragging');
});
elements.dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dragDepth = 0;
  elements.dropzone.classList.remove('is-dragging');
  const files = event.dataTransfer.files;
  if (files.length !== 1) {
    showError('请一次选择一个文件。');
    return;
  }
  chooseFile(files[0]);
});

function releasePlayers() {
  for (const player of [elements['result-video'], elements['result-audio']]) {
    player.pause();
    player.removeAttribute('src');
    player.load();
    player.hidden = true;
  }
}

function invalidateResult() {
  if (busy) return;
  releasePlayers();
  controller.clearResult();
  elements.runtime.hidden = true;
  elements['result-preview'].hidden = true;
  elements['result-download'].hidden = true;
  elements['result-download'].removeAttribute('href');
  elements['preview-error'].hidden = true;
  currentWarnings.clear();
}

function setBusy(value) {
  busy = value;
  for (const control of document.querySelectorAll('select, .format-option, #choose-file, #replace-file, #remove-file, #file-input, #video-tab, #audio-tab')) {
    control.disabled = value;
  }
  if (!value) {
    elements['video-tab'].disabled = Boolean(selectedFile && AUDIO_EXTENSIONS.has(extensionFor(selectedFile.name)));
    updateQualityState();
  }
  elements['convert-button'].disabled = value || !selectedFile;
  elements['convert-button'].firstChild.textContent = value ? '正在处理，请稍候 ' : '开始转换 ';
  elements['cancel-conversion'].hidden = !value;
  elements.runtime.setAttribute('aria-busy', String(value));
}

function showProgress(ratio, stage) {
  const progress = elements['task-progress'];
  const known = ratio !== null && Number.isFinite(ratio);
  progress.classList.toggle('is-indeterminate', !known);
  if (known) {
    const percentage = Math.max(0, Math.min(100, Math.floor(ratio * 100)));
    elements['task-progress-fill'].style.width = `${percentage}%`;
    elements['task-ratio'].textContent = `${percentage}%`;
    progress.setAttribute('aria-valuenow', String(percentage));
    progress.setAttribute('aria-valuetext', `${stage || '当前阶段'} ${percentage}%`);
  } else {
    elements['task-ratio'].textContent = '…';
    progress.removeAttribute('aria-valuenow');
    progress.setAttribute('aria-valuetext', stage || '正在处理');
  }
}

const STAGES = {
  'loading-engine': ['正在加载转换程序', '首次使用需下载约 32 MB。下载的是程序，不是你的视频。'],
  probing: ['正在检测文件', '读取真实编码、音轨和时长，选择适合的处理方式。'],
  planning: ['正在准备转换', '根据源文件编码及输出设置制定处理方式。'],
  converting: ['正在转换文件', '请保持页面打开。处理时间取决于文件和设备性能，可以随时取消。'],
  finalizing: ['正在整理转换结果', '检查输出文件并准备下载，完成后才会开放下载按钮。'],
};

function showWarnings() {
  elements['task-warnings'].textContent = [...currentWarnings].join('\n');
  elements['task-warnings'].hidden = !currentWarnings.size;
}

function onConversionEvent(event) {
  if (event.type === 'stage') {
    const [title, detail] = STAGES[event.stage];
    elements['task-stage'].textContent = title;
    elements['task-note'].textContent = detail;
    showProgress(null, title);
    lastProgressPaint = 0;
    announce(title);
  } else if (event.type === 'progress') {
    const now = performance.now();
    if (now - lastProgressPaint < 150 && event.ratio !== 1) return;
    lastProgressPaint = now;
    showProgress(event.ratio, STAGES[event.stage]?.[0]);
    if (event.stage === 'loading-engine' && event.ratio === 1) {
      elements['task-note'].textContent = '程序下载完成，正在初始化本机转换引擎。';
    }
  } else if (event.type === 'warning') {
    currentWarnings.add(event.message);
    showWarnings();
  } else if (event.type === 'plan') {
    const names = {copy: '快速转封装', 'audio-encode': '音频编码', encode: '重新编码'};
    const codecs = [event.media.video?.codec_name, event.media.audio?.codec_name].filter(Boolean).join(' / ').toUpperCase();
    elements['task-method'].textContent = `${names[event.method]}${codecs ? ` · ${codecs}` : ''}`;
    if (metadataCleanup) metadataCleanup();
    elements['source-duration'].textContent = formatDuration(event.media.duration);
    for (const warning of event.warnings) currentWarnings.add(warning.message);
    showWarnings();
  }
}

async function startConversion() {
  if (busy || !selectedFile) return;
  invalidateResult();
  clearError();
  const attempt = ++generation;
  const request = {
    file: selectedFile,
    format: selectedFormat,
    mode: elements['processing-mode'].value,
    quality: elements.quality.value,
    resolution: outputType === 'audio' ? 'original' : elements.resolution.value,
  };
  elements.runtime.hidden = false;
  elements.runtime.dataset.status = 'running';
  elements['task-file'].textContent = `${selectedFile.name} → ${selectedFormat.toUpperCase()}`;
  elements['task-method'].textContent = '本机处理';
  elements['task-warnings'].hidden = true;
  setBusy(true);
  elements.runtime.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest'});
  try {
    const result = await controller.start(request, onConversionEvent);
    if (attempt !== generation) return;
    elements.runtime.dataset.status = 'complete';
    elements['task-stage'].textContent = '转换完成，可以带走了。';
    elements['task-note'].textContent = '结果已通过媒体检查。请及时下载，关闭或刷新页面后不会保留。';
    elements['task-file'].textContent = result.filename;
    elements['result-download'].href = result.url;
    elements['result-download'].download = result.filename;
    elements['result-download'].querySelector('span').textContent = `下载 ${request.format.toUpperCase()}`;
    elements['result-download'].hidden = false;
    elements['result-info'].textContent = `${formatSize(result.size)} · ${formatDuration(result.outputMedia.duration)} · 本机生成`;
    elements['result-preview'].hidden = false;
    const player = result.mime.startsWith('video/') ? elements['result-video'] : elements['result-audio'];
    player.src = result.url;
    player.hidden = false;
    showProgress(1, '转换完成');
    announce(`转换完成。${result.filename} 已准备好下载。`);
  } catch (error) {
    if (attempt !== generation) return;
    const wasCancelled = error.name === 'AbortError';
    elements.runtime.dataset.status = wasCancelled ? 'cancelled' : 'error';
    elements['task-stage'].textContent = wasCancelled ? '任务已取消' : '这次没有完成转换。';
    elements['task-note'].textContent = wasCancelled ? '任务已经停止，可以调整设置后重新开始。' : error.message;
    showProgress(0, wasCancelled ? '已取消' : '转换失败');
    elements['task-ratio'].textContent = '—';
    announce(elements['task-note'].textContent);
  } finally {
    if (attempt === generation) setBusy(false);
  }
}

elements['convert-button'].addEventListener('click', startConversion);
elements['cancel-conversion'].addEventListener('click', () => {
  if (!busy) return;
  generation += 1;
  controller.cancel();
  elements.runtime.dataset.status = 'cancelled';
  elements['task-stage'].textContent = '任务已取消';
  elements['task-note'].textContent = '任务已经停止。修改设置或点击开始转换即可重试。';
  showProgress(0, '已取消');
  elements['task-ratio'].textContent = '—';
  setBusy(false);
  announce('任务已取消。');
});
for (const player of [elements['result-video'], elements['result-audio']]) {
  player.addEventListener('error', () => {
    if (player.getAttribute('src')) elements['preview-error'].hidden = false;
  });
}
window.addEventListener('pagehide', () => {
  generation += 1;
  controller.cancel();
  setBusy(false);
  invalidateResult();
  controller.dispose();
});

renderFormats();
