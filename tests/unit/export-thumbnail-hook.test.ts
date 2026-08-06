import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportGraphAsPng, persistThumbnailFromCanvas } from '../../src/lib/export';
import { THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT } from '../../src/lib/thumbnails';

const putThumbnailMock = vi.fn();

vi.mock('../../src/lib/indexeddb', () => ({
  putThumbnail: (...args: unknown[]) => putThumbnailMock(...args),
}));

class FakeCanvas {
  width: number;
  height: number;
  readonly ctx: {
    fillStyle: string; strokeStyle: string; lineWidth: number; font: string; textAlign: string; textBaseline: string;
    fillRect: () => void; drawImage: () => void; measureText: (text: string) => { width: number };
    beginPath: () => void; moveTo: () => void; lineTo: () => void; quadraticCurveTo: () => void;
    bezierCurveTo: () => void; closePath: () => void; fill: () => void; fillText: () => void; stroke: () => void;
    scale: (x: number, y: number) => void;
  };

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.ctx = {
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      measureText: (text: string) => ({ width: text.length * 7 }),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      fillText: vi.fn(),
      stroke: vi.fn(),
      scale: vi.fn(),
    };
  }

  getContext(type: string) {
    if (type === '2d') {
      return this.ctx;
    }
    return null;
  }

  toBlob(callback: (blob: Blob | null) => void) {
    callback(new Blob(['thumbnail'], { type: 'image/png' }));
  }
}

const originalCreateElement = document.createElement.bind(document);

describe('persistThumbnailFromCanvas', () => {
  beforeEach(() => {
    putThumbnailMock.mockReset();
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'canvas') {
        return new FakeCanvas(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT) as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tag as keyof HTMLElementTagNameMap);
    }) as typeof document.createElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes a thumbnail to the cache using putThumbnail', async () => {
    const now = new Date().toISOString();
    putThumbnailMock.mockResolvedValue({
      entry: {
        mapId: 'graph-1',
        status: 'ready',
        blobKey: 'graph-1/key',
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
        byteSize: 128,
        updatedAt: now,
        lastAccessed: now,
        sourceExportAt: now,
        trigger: 'export',
        retryCount: 0,
        failureReason: null,
      },
      evicted: [],
      totalBytes: 128,
    });

    await persistThumbnailFromCanvas(new FakeCanvas(640, 360) as unknown as HTMLCanvasElement, {
      mapId: 'graph-1',
      trigger: 'export',
    });

    expect(putThumbnailMock).toHaveBeenCalledTimes(1);
    const [payload] = putThumbnailMock.mock.calls[0];
    expect(payload.mapId).toBe('graph-1');
    expect(payload.trigger).toBe('export');
    expect(payload.status).toBe('ready');
    expect(payload.retryCount).toBe(0);
    expect(payload.blob).toBeInstanceOf(Blob);
  });

  it('swallows errors from putThumbnail and logs failure', async () => {
    putThumbnailMock.mockRejectedValueOnce(new Error('db unavailable'));

    await expect(
      persistThumbnailFromCanvas(new FakeCanvas(640, 360) as unknown as HTMLCanvasElement, {
        mapId: 'graph-2',
        trigger: 'export',
      }),
    ).resolves.toBeUndefined();

    expect(putThumbnailMock).toHaveBeenCalledTimes(1);
  });
});

describe('exportGraphAsPng', () => {
  const graph = { id: 'graph-1', name: 'Graph', created: '2026-01-01', lastModified: '2026-01-01', lastOpened: '2026-01-01', schemaVersion: 3 };
  const makeNode = (id: string, x: number, y: number, width = 100, height = 40) => ({ id, graphId: graph.id, text: id, x, y, width, height, created: '2026-01-01', lastModified: '2026-01-01' });

  it('draws directional Bezier edges and skips missing endpoints', async () => {
    const canvases: FakeCanvas[] = [];
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'canvas') { const canvas = new FakeCanvas(640, 360); canvases.push(canvas); return canvas as unknown as HTMLCanvasElement; }
      return originalCreateElement(tag as keyof HTMLElementTagNameMap);
    }) as typeof document.createElement);
    const source = makeNode('source', -200, -50);
    const target = makeNode('target', 100, 100);
    const blob = await exportGraphAsPng(graph, [source, target], [
      { id: 'valid', graphId: graph.id, sourceNodeId: 'source', targetNodeId: 'target', sourceHandleId: 'e', targetHandleId: 'w', created: '2026-01-01', undirected: true },
      { id: 'missing', graphId: graph.id, sourceNodeId: 'source', targetNodeId: 'none', created: '2026-01-01', undirected: true },
    ]);
    const canvas = canvases.at(-1)!;
    expect(blob).toBeInstanceOf(Blob);
    expect(canvas.ctx.moveTo).toHaveBeenNthCalledWith(1, 132, 52);
    expect(canvas.ctx.bezierCurveTo).toHaveBeenCalledWith(232, 52, 232, 202, 332, 202);
    expect(canvas.ctx.bezierCurveTo).toHaveBeenCalledTimes(1);
  });

  it('uses a live DOM rectangle over persisted dimensions and scales oversized exports', async () => {
    const canvases: FakeCanvas[] = [];
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'canvas') { const canvas = new FakeCanvas(640, 360); canvases.push(canvas); return canvas as unknown as HTMLCanvasElement; }
      return originalCreateElement(tag as keyof HTMLElementTagNameMap);
    }) as typeof document.createElement);
    vi.spyOn(document, 'querySelector').mockImplementation((selector: string) => selector.includes('source') ? ({ getBoundingClientRect: () => ({ width: 180, height: 140 }) } as unknown as Element) : null);
    const source = makeNode('source', 0, 0, 500, 40);
    const target = makeNode('target', 12_000, 9_000);
    await exportGraphAsPng(graph, [source, target], [{ id: 'edge', graphId: graph.id, sourceNodeId: 'source', targetNodeId: 'target', sourceHandleId: 'e', targetHandleId: 'w', created: '2026-01-01', undirected: true }]);
    const canvas = canvases.at(-1)!;
    expect(canvas.width).toBeLessThanOrEqual(8000);
    expect(canvas.height).toBeLessThanOrEqual(8000);
    expect(canvas.ctx.scale).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
    expect(canvas.ctx.moveTo).toHaveBeenNthCalledWith(1, 212, 102);
  });
});
