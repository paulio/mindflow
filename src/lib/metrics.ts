/** Performance metrics helper skeleton */
interface MarkRecord { name: string; start: number; end?: number; }
const marks: MarkRecord[] = [];

export function markStart(name: string) {
  marks.push({ name, start: performance.now() });
}

export function markEnd(name: string) {
  const rec = [...marks].reverse().find(m => m.name === name && m.end === undefined);
  if (rec) rec.end = performance.now();
}

export function getDurations() {
  return marks.filter(m => m.end !== undefined).map(m => ({ name: m.name, ms: (m.end! - m.start) }));
}

export function observeFrames(callback: (fps: number) => void) {
  let last = performance.now();
  let frames = 0;
  function loop(now: number) {
    frames++;
    if (now - last >= 1000) {
      callback(frames * 1000 / (now - last));
      frames = 0;
      last = now;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
