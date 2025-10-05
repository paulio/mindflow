import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { persistThumbnailFromCanvas } from '../../src/lib/export';
import { THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT } from '../../src/lib/thumbnails';

const putThumbnailMock = vi.fn();

vi.mock('../../src/lib/indexeddb', () => ({
  putThumbnail: (...args: unknown[]) => putThumbnailMock(...args),
}));

class FakeCanvas {
  width: number;
  height: number;
  private ctx: { fillStyle: string; fillRect: () => void; drawImage: () => void };

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.ctx = {
      fillStyle: '#000',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
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
