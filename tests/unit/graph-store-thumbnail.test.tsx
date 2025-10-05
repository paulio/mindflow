import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { type ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { THUMBNAIL_TRIGGERS, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT } from '../../src/lib/thumbnails';

const { nowIso, putThumbnailMock, listThumbnailEntriesMock } = vi.hoisted(() => {
  const nowIso = () => new Date().toISOString();

  const putThumbnailMock = vi.fn(async ({ mapId, trigger }: { mapId: string; trigger: string }) => ({
    entry: {
      mapId,
      status: 'ready',
      blobKey: `${mapId}-blob`,
      width: THUMBNAIL_WIDTH,
      height: THUMBNAIL_HEIGHT,
      byteSize: 10,
      updatedAt: nowIso(),
      lastAccessed: nowIso(),
      sourceExportAt: nowIso(),
      trigger,
      retryCount: 0,
      failureReason: null,
    },
    evicted: [],
    totalBytes: 10,
  }));

  const listThumbnailEntriesMock = vi.fn(async () => []);

  return { nowIso, putThumbnailMock, listThumbnailEntriesMock };
});

vi.mock('../../src/lib/indexeddb', () => ({
  createGraph: vi.fn(async (name?: string) => {
    const now = nowIso();
    return {
      id: `graph-${Math.random().toString(16).slice(2)}`,
      name: name ?? 'Untitled Map',
      created: now,
      lastModified: now,
      lastOpened: now,
      schemaVersion: 1,
      settings: { autoLoadLast: true },
      viewport: { x: 0, y: 0, zoom: 1 },
    };
  }),
  loadGraph: vi.fn(async () => null),
  saveNodes: vi.fn(async () => {}),
  saveEdges: vi.fn(async () => {}),
  deleteGraph: vi.fn(async () => {}),
  updateGraphMeta: vi.fn(async () => {}),
  listGraphs: vi.fn(async () => []),
  cloneGraph: vi.fn(async () => null),
  persistNodeDeletion: vi.fn(async () => {}),
  saveReferences: vi.fn(async () => {}),
  deleteReferences: vi.fn(async () => {}),
  initDB: vi.fn(async () => ({})),
  generateId: vi.fn(() => `node-${Math.random().toString(16).slice(2)}`),
  getGraphSnapshots: vi.fn(async (ids: string[]) => ids.map(id => ({
    graph: {
      id,
      name: 'Snapshot',
      created: nowIso(),
      lastModified: nowIso(),
      lastOpened: nowIso(),
      schemaVersion: 1,
      settings: { autoLoadLast: true },
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    nodes: [],
    edges: [],
    references: [],
  }))),
  getGraphSnapshot: vi.fn(async () => null),
  putThumbnail: putThumbnailMock,
  incrementThumbnailRetry: vi.fn(async () => null),
  listThumbnailEntries: listThumbnailEntriesMock,
  deleteThumbnail: vi.fn(async () => {}),
}));

vi.mock('../../src/lib/thumbnail-generator', () => ({
  generateThumbnailFromSnapshot: vi.fn(async () => ({
    blob: new Blob(['thumbnail'], { type: 'image/png' }),
    durationMs: 5,
    sourceExportAt: nowIso(),
  })),
}));

const useAutosaveMock = vi.hoisted(() => vi.fn(() => ({ pause: vi.fn(), resume: vi.fn(), flush: vi.fn() })));
vi.mock('../../src/hooks/useAutosave', () => ({
  useAutosave: useAutosaveMock,
}));

import { GraphProvider, useGraph } from '../../src/state/graph-store';

const wrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
  <GraphProvider>{children}</GraphProvider>
);

const renderGraph = async () => {
  const hook = renderHook(() => useGraph(), { wrapper });
  await act(async () => {});
  return hook;
};

let autosaveControls: { pause: ReturnType<typeof vi.fn>; resume: ReturnType<typeof vi.fn>; flush: ReturnType<typeof vi.fn> };

beforeEach(() => {
  autosaveControls = { pause: vi.fn(), resume: vi.fn(), flush: vi.fn() };
  useAutosaveMock.mockReset();
  useAutosaveMock.mockReturnValue(autosaveControls);
  putThumbnailMock.mockClear();
  listThumbnailEntriesMock.mockResolvedValue([]);
});

describe('graph-store thumbnail refresh contract', () => {
  it('exposes thumbnailStatuses map on the graph context', async () => {
    const { result } = await renderGraph();
    expect((result.current as any).thumbnailStatuses).toBeDefined();
  });

  it('provides requestThumbnailRefresh action for export completion', async () => {
    const { result } = await renderGraph();
    expect(typeof (result.current as any).requestThumbnailRefresh).toBe('function');
  });

  it('enforces a single retry limit for failed thumbnails', async () => {
    const { result } = await renderGraph();
    expect((result.current as any).thumbnailRetryLimit).toBe(1);
  });

  it('registers a library-open trigger for refresh logging', () => {
    expect(THUMBNAIL_TRIGGERS).toContain('library:open');
  });

  it('wires idle and close triggers into useAutosave', async () => {
    const { result } = await renderGraph();
    await act(async () => { await result.current.newGraph(); });

    const lastCall = useAutosaveMock.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const options = (lastCall as any)?.[0];
    expect(options).toBeDefined();
    expect(typeof options.onIdle).toBe('function');
    expect(typeof options.onBeforeUnload).toBe('function');
  });

  it('queues an idle refresh via useAutosave onIdle callback', async () => {
    const { result } = await renderGraph();
    await act(async () => { await result.current.newGraph(); });
    const graphId = (result.current as any).graph?.id as string;
    const lastCall = useAutosaveMock.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const options = (lastCall as any)?.[0];
    expect(options).toBeDefined();

    putThumbnailMock.mockClear();
    await act(async () => {
      await options.onIdle?.(`${graphId}:1`);
    });

    expect(putThumbnailMock).toHaveBeenCalled();
    const args = putThumbnailMock.mock.calls.at(-1)![0];
    expect(args.trigger).toBe('idle');
  });

  it('queues a close refresh via useAutosave onBeforeUnload callback', async () => {
    const { result } = await renderGraph();
    await act(async () => { await result.current.newGraph(); });
    const lastCall = useAutosaveMock.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const options = (lastCall as any)?.[0];
    expect(options).toBeDefined();

    putThumbnailMock.mockClear();
    await act(async () => {
      await options.onBeforeUnload?.();
    });
    expect(putThumbnailMock).toHaveBeenCalled();
    const args = putThumbnailMock.mock.calls.at(-1)![0];
    expect(args.trigger).toBe('close');
  });
});
