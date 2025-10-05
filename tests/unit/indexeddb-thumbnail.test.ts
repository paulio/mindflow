import { describe, it, expect } from 'vitest';
import * as indexeddbModule from '../../src/lib/indexeddb';

describe('indexeddb thumbnail helper contract', () => {
  const moduleUnderTest = indexeddbModule as Record<string, unknown>;

  it('provides getThumbnailEntry lookup helper', () => {
    expect(typeof moduleUnderTest.getThumbnailEntry).toBe('function');
  });

  it('provides touchThumbnail helper to update lastAccessed timestamps', () => {
    expect(typeof moduleUnderTest.touchThumbnail).toBe('function');
  });

  it('provides incrementThumbnailRetry helper enforcing retry counts', () => {
    expect(typeof moduleUnderTest.incrementThumbnailRetry).toBe('function');
  });
});
