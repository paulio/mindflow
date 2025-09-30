import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';

// Atomic invariant tests for FR-004

describe('Atomic node+edge creation invariant (FR-004)', () => {
  it('prevents self edges (baseline)', async () => {
    const actual = await import('../../src/lib/graph-domain');
    const { createNode, createEdge } = actual as any;
    const gid = 'g';
    const a = createNode({ graphId: gid, x:0, y:0 });
    expect(() => createEdge({ graphId: gid, sourceNodeId: a.id, targetNodeId: a.id })).toThrow();
  });

  it('rolls back node when edge creation fails (no orphan node added)', async () => {
    vi.resetModules();
    // Deterministic id generator for clarity
    let idCounter = 0;
    vi.doMock('../../src/lib/indexeddb', () => ({
      listGraphs: async () => [],
      createGraph: async (name: string) => ({ id: 'g1', name, created: new Date().toISOString(), lastModified: new Date().toISOString(), lastOpened: new Date().toISOString(), schemaVersion: 1 }),
      loadGraph: async () => null,
      saveNodes: async () => {},
      saveEdges: async () => {},
      deleteGraph: async () => {},
      updateGraphMeta: async () => {},
      generateId: () => `id-${++idCounter}`
    }));
    vi.doMock('../../src/lib/graph-domain', async () => {
      const actual = await vi.importActual<any>('../../src/lib/graph-domain');
      return {
        ...actual,
        // Force edge creation failure to exercise atomic rollback
        createEdge: () => { throw new Error('forced edge failure'); }
      };
    });
    const { GraphProvider, useGraph } = await import('../../src/state/graph-store');
    const results: any = { phase: 'init' };
    const Test: React.FC = () => {
      const g = useGraph();
      const [initialized, setInitialized] = React.useState(false);

      // First effect: create new graph once
      React.useEffect(() => {
        (async () => {
          if (!initialized) {
            await g.newGraph();
            setInitialized(true);
          }
        })();
      }, [initialized, g]);

      // Second effect: once root node present, attempt atomic creation
      React.useEffect(() => {
        if (!initialized) return;
        if (g.nodes.length !== 1) return; // wait until root node is visible in state
        if (results.phase === 'done') return;
        const root = g.nodes[0];
        const beforeNodes = g.nodes.length; // should be 1
        const beforeEdges = g.edges.length; // should be 0
        const created = g.addConnectedNode(root.id, 100, 100);
        results.created = created;
        results.beforeNodes = beforeNodes;
        results.beforeEdges = beforeEdges;
        results.afterNodes = g.nodes.length;
        results.afterEdges = g.edges.length;
        results.phase = 'done';
      }, [initialized, g.nodes, g.edges]);
      return null;
    };
    render(<GraphProvider><Test /></GraphProvider>);
    await waitFor(() => expect(results.phase).toBe('done'));
    expect(results.created).toBeFalsy();
    expect(results.beforeNodes).toBe(1);
    expect(results.afterNodes).toBe(1);
    expect(results.beforeEdges).toBe(0);
    expect(results.afterEdges).toBe(0);
  });
});
