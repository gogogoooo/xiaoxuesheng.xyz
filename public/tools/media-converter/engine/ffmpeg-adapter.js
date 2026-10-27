import {loadCoreResources} from './core-loader.js';
import {withDeadline} from './deadline.js';
import {parseProbeResult} from './probe-result.js';
import {ConversionError, MAX_FILE_SIZE, validateFile, createConversionPlan, outputFilename} from '../conversion-policy.js';

const cancelled = () => new DOMException('任务已取消', 'AbortError');

export class FFmpegAdapter {
  constructor() {
    this.ffmpeg = null;
    this.resources = null;
    this.terminated = false;
    this.logs = [];
    this.stage = 'loading-engine';
  }

  dispose() {
    this.terminated = true;
    if (this.ffmpeg) {
      this.ffmpeg.terminate();
      this.ffmpeg = null;
    }
    this.resources?.release();
    this.resources = null;
  }

  async convert(request, {taskId, signal, onEvent}) {
    const extension = validateFile(request.file);
    const emit = (event) => {
      if (!this.terminated && !signal.aborted) onEvent({taskId, ...event});
    };
    const check = () => {
      if (signal.aborted || this.terminated) throw cancelled();
    };
    const stage = (value) => {
      check();
      this.stage = value;
      emit({type: 'stage', stage: value});
    };
    let mounted = false;
    let ffmpeg;
    let media;
    let ratio = 0;
    try {
      stage('loading-engine');
      this.resources = await loadCoreResources({signal, onProgress: (value) => emit({type: 'progress', stage: 'loading-engine', ratio: value})});
      check();
      ffmpeg = new this.resources.FFmpeg();
      this.ffmpeg = ffmpeg;
      ffmpeg.on('log', ({message}) => {
        this.logs.push(String(message).slice(0, 1200));
        if (this.logs.length > 120) this.logs.shift();
      });
      ffmpeg.on('progress', ({progress}) => {
        if (this.stage !== 'converting') return;
        const known = Number.isFinite(media?.duration) && media.duration > 0;
        if (known && Number.isFinite(progress) && progress >= 0) ratio = Math.max(ratio, Math.min(.99, progress));
        emit({type: 'progress', stage: 'converting', ratio: known ? ratio : null});
      });
      const {coreURL, wasmURL, classWorkerURL} = this.resources;
      emit({type: 'progress', stage: 'loading-engine', ratio: null});
      await withDeadline(ffmpeg.load({coreURL, wasmURL, classWorkerURL}, {signal}), 90000, '引擎初始化超时，请检查网络并重新开始。');
      check();
      await ffmpeg.createDir('/input');
      await ffmpeg.createDir('/output');
      const sourceName = `source.${extension}`;
      const inputPath = `/input/${sourceName}`;
      const outputPath = `/output/result.${request.format}`;
      stage('probing');
      const mountResult = await ffmpeg.mount(this.resources.FFFSType.WORKERFS, {blobs: [{name: sourceName, data: request.file}]}, '/input');
      if (!mountResult) throw new ConversionError('MOUNT_FAILED', '当前引擎无法挂载本地文件，请刷新页面后重试。');
      mounted = true;

      const probe = async (file, name) => {
        check();
        const metadataPath = `/output/${name}.json`;
        const code = await ffmpeg.ffprobe(['-v', 'error', '-show_format', '-show_streams', '-of', 'json', '-i', file, '-o', metadataPath], 30000);
        check();
        const text = await ffmpeg.readFile(metadataPath, 'utf8');
        await ffmpeg.deleteFile(metadataPath);
        return parseProbeResult(code, text);
      };

      media = await probe(inputPath, 'source-info');
      stage('planning');
      let plan = createConversionPlan(request, media, {inputPath, outputPath});
      const reportPlan = () => {
        emit({type: 'plan', method: plan.method, media, warnings: plan.warnings});
      };
      reportPlan();
      stage('converting');
      let exitCode = await ffmpeg.exec(plan.args);
      check();
      const recent = this.logs.slice(-30).join('\n');
      const copyFailure = /not (?:currently )?supported in container|could not find tag for codec|codec .*not supported/i.test(recent);
      const fatal = /out of memory|memory access|cannot allocate|invalid data found|moov atom not found/i.test(recent);
      if (exitCode !== 0 && request.mode === 'auto' && plan.method !== 'encode' && copyFailure && !fatal) {
        await ffmpeg.deleteFile(outputPath).catch(() => {});
        plan = createConversionPlan(request, media, {inputPath, outputPath, forceEncode: true});
        ratio = 0;
        emit({type: 'warning', code: 'ENCODE_FALLBACK', message: '该文件无法直接换封装，正在改用重新编码。'});
        reportPlan();
        stage('converting');
        exitCode = await ffmpeg.exec(plan.args);
      }
      check();
      if (exitCode !== 0) throw new ConversionError('CONVERSION_FAILED', '转换没有完成。请检查文件编码，或尝试较小的文件及较低分辨率。');
      stage('finalizing');
      const outputMedia = await probe(outputPath, 'result-info');
      const outputIsVideo = ['mp4', 'webm'].includes(request.format);
      if (outputIsVideo ? !outputMedia.video : !outputMedia.audio) {
        throw new ConversionError('INVALID_OUTPUT', '输出文件未通过检查，请更换输出格式后重试。');
      }
      if (outputMedia.size >= MAX_FILE_SIZE) throw new ConversionError('OUTPUT_TOO_LARGE', '输出文件已达到本工具的内存保护上限。请降低质量或选择压缩格式。');
      const data = await ffmpeg.readFile(outputPath);
      check();
      if (!(data instanceof Uint8Array) || data.byteLength === 0) throw new ConversionError('EMPTY_OUTPUT', '输出文件是空的，请更换输出格式后重试。');
      if (data.byteLength >= MAX_FILE_SIZE) throw new ConversionError('OUTPUT_TOO_LARGE', '输出文件已达到本工具的内存保护上限。请降低质量或选择压缩格式。');
      const blob = new Blob([data], {type: plan.mime});
      return {
        taskId, blob, mime: plan.mime, size: blob.size,
        filename: outputFilename(request.file.name, request.format),
        method: plan.method, inputMedia: media, outputMedia,
      };
    } catch (error) {
      if (signal.aborted || this.terminated || error?.name === 'AbortError') throw cancelled();
      const detail = typeof error === 'string' ? error : error?.message || '';
      const context = `${detail}\n${this.logs.slice(-30).join('\n')}`;
      if (/out of memory|memory access|cannot allocate|allocation failed/i.test(context)) {
        throw new ConversionError('ENGINE_MEMORY', '浏览器可用内存不足。请使用更小的文件、较低分辨率，或在电脑端重试。');
      }
      if (error instanceof ConversionError) throw error;
      const message = this.stage === 'loading-engine'
        ? `转换引擎加载失败：${detail || '请刷新页面后重试。'}`
        : '转换引擎遇到异常。请重新开始，或尝试其他文件。';
      throw new ConversionError('ENGINE_FAILED', message);
    } finally {
      if (!this.terminated && ffmpeg?.loaded && mounted) await ffmpeg.unmount('/input').catch(() => {});
      this.dispose();
    }
  }
}
