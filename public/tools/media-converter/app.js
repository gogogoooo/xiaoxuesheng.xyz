'use strict';

// This first iteration is an interactive design preview. No file is uploaded,
// no conversion progress is fabricated, and no placeholder file is downloaded.
const MAX_FILE_SIZE = 1_000_000_000;
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
  'announcement', 'show-states', 'state-preview',
].map((id) => [id, document.getElementById(id)]));

let selectedFile = null;
let outputType = 'video';
let selectedFormat = 'mp4';
let metadataCleanup = null;
let dragDepth = 0;

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
  const stem = selectedFile ? selectedFile.name.replace(/\.[^.]+$/, '') : '';
  elements['output-name'].replaceChildren();
  elements['output-name'].append(document.createTextNode(stem || '选择文件后显示名称'));
  const suffix = document.createElement('span');
  suffix.textContent = `.${selectedFormat}`;
  elements['output-name'].append(suffix);
  elements['engine-note'].textContent = selectedFile
    ? '文件已就位 · 真实转换引擎尚未接入'
    : '设计阶段 · 转换功能待接入';
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
  announce(`已选择 ${file.name}。可以设置输出格式；此版本暂未接入真实转换。`);
}

function removeFile() {
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
  elements['file-input'].value = '';
  elements['file-input'].click();
}

elements['choose-file'].addEventListener('click', openFileDialog);
elements['replace-file'].addEventListener('click', openFileDialog);
elements['remove-file'].addEventListener('click', removeFile);
elements['file-input'].addEventListener('change', (event) => chooseFile(event.target.files[0]));
elements['video-tab'].addEventListener('click', () => setOutputType('video'));
elements['audio-tab'].addEventListener('click', () => setOutputType('audio'));
elements['processing-mode'].addEventListener('change', updateModeExplanation);
elements.resolution.addEventListener('change', () => {
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

elements['show-states'].addEventListener('click', () => {
  elements['state-preview'].hidden = !elements['state-preview'].hidden;
  elements['show-states'].setAttribute('aria-expanded', String(!elements['state-preview'].hidden));
  if (!elements['state-preview'].hidden) {
    elements['state-preview'].scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
  }
});
elements['show-states'].setAttribute('aria-controls', 'state-preview');
elements['show-states'].setAttribute('aria-expanded', 'false');
document.querySelectorAll('[data-state]').forEach((button) => {
  button.addEventListener('click', () => {
    const state = button.dataset.state;
    for (const candidate of document.querySelectorAll('[data-state]')) {
      candidate.setAttribute('aria-pressed', String(candidate === button));
    }
    for (const example of ['processing', 'completed', 'error']) {
      document.getElementById(`${example}-example`).hidden = example !== state;
    }
  });
});

renderFormats();
