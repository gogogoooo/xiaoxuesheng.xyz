import {FFmpegAdapter} from './engine/ffmpeg-adapter.js?v=20261027-flv';
import {ConversionError, validateFile} from './conversion-policy.js?v=20261027-flv';

export class ConversionController {
  constructor({adapterFactory = () => new FFmpegAdapter()} = {}) {
    this.adapterFactory = adapterFactory;
    this.active = null;
    this.resultURL = null;
    this.sequence = 0;
  }

  get busy() { return this.active !== null; }

  clearResult() {
    if (this.resultURL) URL.revokeObjectURL(this.resultURL);
    this.resultURL = null;
  }

  async start(request, onEvent = () => {}) {
    if (this.active) throw new ConversionError('BUSY', '已有一个任务正在处理，请先取消或等待完成。');
    validateFile(request.file);
    this.clearResult();
    const task = {
      id: `media-${++this.sequence}`,
      adapter: this.adapterFactory(),
      abort: new AbortController(),
    };
    this.active = task;
    try {
      const result = await task.adapter.convert(request, {
        taskId: task.id,
        signal: task.abort.signal,
        onEvent: (event) => {
          if (this.active === task && !task.abort.signal.aborted) onEvent({...event, taskId: task.id});
        },
      });
      if (this.active !== task || task.abort.signal.aborted) throw new DOMException('任务已取消', 'AbortError');
      this.resultURL = URL.createObjectURL(result.blob);
      return {...result, taskId: task.id, url: this.resultURL};
    } finally {
      task.adapter.dispose();
      if (this.active === task) this.active = null;
    }
  }

  cancel() {
    const task = this.active;
    if (!task) return;
    this.active = null;
    task.abort.abort();
    task.adapter.dispose();
  }

  dispose() {
    this.cancel();
    this.clearResult();
  }
}
