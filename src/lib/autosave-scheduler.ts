export type AutosaveTask = () => Promise<void> | void;

export interface AutosaveSchedulerOptions { debounceMs?: number; idleMs?: number; }

export class AutosaveScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastRun = 0;
  private pending = false;
  private paused = false;
  private readonly debounceMs: number;
  constructor(private task: AutosaveTask, opts?: AutosaveSchedulerOptions) {
    this.debounceMs = opts?.debounceMs ?? 500;
  }
  request() {
    this.pending = true;
    if (this.paused) return;
    this.schedule();
  }
  pause() {
    this.paused = true;
    this.clearTimer();
  }
  resume() {
    if (!this.paused) return;
    this.paused = false;
    if (this.pending) {
      this.schedule();
    }
  }
  cancel() {
    this.pending = false;
    this.clearTimer();
  }
  async flush() {
    if (!this.pending) return;
    await this.run();
  }
  private schedule() {
    this.pending = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.run(), this.debounceMs);
  }
  private async run() {
    if (!this.pending) return;
    this.pending = false;
    this.lastRun = Date.now();
    await this.task();
    this.clearTimer();
  }
  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
  getLastRun() { return this.lastRun; }
}
