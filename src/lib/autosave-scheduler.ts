export type AutosaveTask = () => Promise<void> | void;

export interface AutosaveSchedulerOptions { debounceMs?: number; idleMs?: number; }

export class AutosaveScheduler {
  private timer: any = null;
  private lastRun = 0;
  private pending = false;
  private readonly debounceMs: number;
  private readonly idleMs: number;
  private flushTimer: any = null;
  constructor(private task: AutosaveTask, opts?: AutosaveSchedulerOptions) {
    this.debounceMs = opts?.debounceMs ?? 500;
    this.idleMs = opts?.idleMs ?? 2000;
  }
  request() {
    this.pending = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.run(), this.debounceMs);
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.run(), this.idleMs);
  }
  private async run() {
    if (!this.pending) return;
    this.pending = false;
    this.lastRun = Date.now();
    await this.task();
  }
  getLastRun() { return this.lastRun; }
}
