import { describe, it, expect } from 'vitest';
import { ThumbnailCacheEntrySchema } from '../../specs/009-the-home-library/contracts/thumbnail-cache-entry.schema';
import * as indexeddbModule from '../../src/lib/indexeddb';

describe('thumbnail-cache-entry schema contract', () => {
  const baseEntry = {
    mapId: 'graph-123',
    status: 'ready',
    blobKey: 'thumb/graph-123',
    width: 320,
    height: 180,
    byteSize: 24_576,
    updatedAt: '2025-10-05T00:00:00.000Z',
    lastAccessed: '2025-10-05T00:00:00.000Z',
    sourceExportAt: '2025-10-04T23:55:13.000Z',
    trigger: 'export:complete',
    retryCount: 0,
    failureReason: null,
  } satisfies Record<string, unknown>;

  it('accepts a well-formed cache entry', () => {
    const result = ThumbnailCacheEntrySchema.safeParse(baseEntry);
    expect(result.success).toBe(true);
  });

  it('rejects entries missing mapId', () => {
  const { mapId: _mapId, ...rest } = baseEntry;
    const result = ThumbnailCacheEntrySchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects entries with invalid blob metadata', () => {
    const invalid = { ...baseEntry, byteSize: -10 };
    const result = ThumbnailCacheEntrySchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('thumbnail persistence contract', () => {
  const moduleUnderTest = indexeddbModule as Record<string, unknown>;

  it('exposes putThumbnail helper for atomic blob writes', () => {
    expect(typeof moduleUnderTest.putThumbnail).toBe('function');
  });

  it('exposes trimThumbnailsToQuota helper enforcing LRU eviction', () => {
    expect(typeof moduleUnderTest.trimThumbnailsToQuota).toBe('function');
  });
});
