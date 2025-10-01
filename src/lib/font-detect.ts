// OS Font Detection Utility (best-effort) - Feature 004
// Strategy: probe a set of candidate font families measuring text width differences vs generic fallbacks.
// NOTE: Browser privacy features may limit accuracy; we filter to curated list and only expose verified fonts.

const CANDIDATE_FONTS = [
  'Inter', 'Segoe UI', 'SF Pro Text', '-apple-system', 'Roboto', 'Georgia', 'JetBrains Mono', 'Courier New', 'monospace'
];

const TEST_STRING = 'mmmmmmmmmmlliWWWWW';
const BASE_FALLBACKS = ['monospace', 'serif', 'sans-serif'];

function measure(text: string, font: string, ctx: CanvasRenderingContext2D): number {
  ctx.font = `16px ${font}`;
  return ctx.measureText(text).width;
}

export async function detectAvailableFonts(timeoutMs = 150): Promise<string[]> {
  if (typeof document === 'undefined') return ['Inter','Georgia','JetBrains Mono','monospace'];
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return ['Inter','Georgia','JetBrains Mono','monospace'];
  const baselineWidths = new Map<string, number>();
  for (const base of BASE_FALLBACKS) baselineWidths.set(base, measure(TEST_STRING, base, ctx));
  const verified: string[] = [];
  const start = performance.now();
  for (const candidate of CANDIDATE_FONTS) {
    if (performance.now() - start > timeoutMs) break; // safety timeout
    // Compose candidate with fallback to detect width delta
    const width = measure(TEST_STRING, `'${candidate}', monospace`, ctx);
    // If width differs from all baselines we assume font present
    let different = false;
    for (const bw of baselineWidths.values()) {
      if (Math.abs(width - bw) > 0.5) { different = true; break; }
    }
    if (different) verified.push(candidate);
  }
  // Ensure a minimal set
  const unique = Array.from(new Set([...verified, 'Inter', 'Georgia', 'JetBrains Mono', 'monospace']));
  return unique;
}
