import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportGraphAsPng } from '../../src/lib/export';

class Fake2DContext {
  strokeStyle: any = '#000';
  fillStyle: any = '#000';
  lineWidth = 1;
  font = '';
  textAlign: any = 'left';
  textBaseline: any = 'alphabetic';

  // Track strokes by linewidth so we can distinguish structural edges (1) vs references (2)
  strokesByWidth = new Map<number, number>();

  beginPath = vi.fn();
  moveTo = vi.fn();
  lineTo = vi.fn();
  quadraticCurveTo = vi.fn();
  closePath = vi.fn();
  fillRect = vi.fn();
  fill = vi.fn();
  fillText = vi.fn();

  stroke = vi.fn(() => {
    this.strokesByWidth.set(this.lineWidth, (this.strokesByWidth.get(this.lineWidth) ?? 0) + 1);
  });

  measureText(text: string) {
    // simple deterministic width
    return { width: text.length * 7 } as TextMetrics;
  }
}

class FakeCanvas {
  width: number;
  height: number;
  ctx: Fake2DContext;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.ctx = new Fake2DContext();
  }

  getContext(type: string) {
    if (type === '2d') return this.ctx as unknown as CanvasRenderingContext2D;
    return null;
  }

  toBlob(callback: (blob: Blob | null) => void) {
    callback(new Blob(['png'], { type: 'image/png' }));
  }
}

const originalCreateElement = document.createElement.bind(document);

describe('exportGraphAsPng reference connectors', () => {
  beforeEach(() => {
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'canvas') {
        return new FakeCanvas(800, 600) as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tag as keyof HTMLElementTagNameMap);
    }) as typeof document.createElement);

    vi.spyOn(window, 'getComputedStyle').mockImplementation(() => {
      // Minimal theme vars used by resolveThemeFromDOM
      return {
        getPropertyValue: (name: string) => {
          if (name === '--mf-node-bg') return '#1b1b1f';
          if (name === '--mf-node-border') return '#2a2a30';
          if (name === '--mf-node-text') return '#f5f5f5';
          if (name === '--mf-node-border-selected') return '#4f9dff';
          if (name === '--color-bg') return '#111';
          if (name === '--mf-node-border-width') return '1';
          return '';
        },
      } as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('draws reference connectors as well as structural edges', async () => {
    const graph: any = { id: 'g1', name: 'G' };
    const nodes: any[] = [
      { id: 'a', x: 0, y: 0, text: 'A', created: '1' },
      { id: 'b', x: 200, y: 0, text: 'B', created: '2' },
    ];
    const edges: any[] = [
      { id: 'e1', graphId: 'g1', sourceNodeId: 'a', targetNodeId: 'b', created: '1', undirected: true },
    ];
    const references: any[] = [
      { id: 'r1', graphId: 'g1', sourceNodeId: 'a', targetNodeId: 'b', style: 'single', created: '1', lastModified: '1' },
    ];

    const blob = await exportGraphAsPng(graph, nodes, edges, { references });
    expect(blob).toBeInstanceOf(Blob);

    const created = (document.createElement as any).mock.results
      .map((r: any) => r.value)
      .filter((v: any) => v && typeof v === 'object' && 'ctx' in v) as FakeCanvas[];
    const canvas = created[created.length - 1];
    const ctx = canvas.ctx;

    // Structural edges use lineWidth=1, references use lineWidth=2
    expect(ctx.strokesByWidth.get(1) ?? 0).toBeGreaterThanOrEqual(1);
    expect(ctx.strokesByWidth.get(2) ?? 0).toBeGreaterThanOrEqual(1);
  });
});
