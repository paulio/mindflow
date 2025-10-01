import { describe, it, expect, beforeEach } from 'vitest';
import { createGraphStore } from '../../src/state/graph-store';

// NOTE: These tests are authored TDD-first; implementation for multi-select
// selection state may not yet exist. They define the required contract.

function initStore() {
  // Assuming a factory exists or we can directly invoke the exported hook-less store creator.
  // If not present, implementation task T002 will add required exports.
  // @ts-ignore - until implemented
  return createGraphStore();
}

describe('multi-select selection state', () => {
  let store: ReturnType<typeof initStore>;

  beforeEach(() => {
    store = initStore();
  });

  it('starts with an empty selection', () => {
    // @ts-ignore until selection implemented
    expect(store.getState().selectedNodeIds).toEqual([]);
  });

  it('replaceSelection sets exact ids', () => {
    // @ts-ignore
    store.getState().replaceSelection(['a','b']);
    // @ts-ignore
    expect(store.getState().selectedNodeIds).toEqual(['a','b']);
  });

  it('addToSelection appends unique ids without duplicates', () => {
    // @ts-ignore
    store.getState().replaceSelection(['a']);
    // @ts-ignore
    store.getState().addToSelection(['a','b','c']);
    // @ts-ignore
    expect(store.getState().selectedNodeIds).toEqual(['a','b','c']);
  });

  it('toggleSelection adds when absent and removes when present', () => {
    // @ts-ignore
    store.getState().toggleSelection('x');
    // @ts-ignore
    expect(store.getState().selectedNodeIds).toEqual(['x']);
    // @ts-ignore
    store.getState().toggleSelection('x');
    // @ts-ignore
    expect(store.getState().selectedNodeIds).toEqual([]);
  });

  it('clearSelection empties selection', () => {
    // @ts-ignore
    store.getState().replaceSelection(['n1','n2']);
    // @ts-ignore
    store.getState().clearSelection();
    // @ts-ignore
    expect(store.getState().selectedNodeIds).toEqual([]);
  });
});
