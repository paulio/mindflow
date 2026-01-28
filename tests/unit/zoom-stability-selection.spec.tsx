import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { act, render, waitFor } from '@testing-library/react';

// Capture the last props passed to ReactFlow so we can assert config.
let lastReactFlowProps: any | null = null;

vi.mock('reactflow', async () => {
  const React = (await import('react')) as typeof import('react');

  const ReactFlow = (props: any) => {
    lastReactFlowProps = props;
    return React.createElement('div', { 'data-testid': 'reactflow-mock' }, props.children);
  };

  return {
    __esModule: true,
    default: ReactFlow,
    // Components used in GraphCanvas JSX
    Background: () => null,
    Controls: () => null,
    Handle: () => null,
    // Minimal enums / helpers referenced by GraphCanvas
    Position: { Top: 'top', Right: 'right', Bottom: 'bottom', Left: 'left' },
    MarkerType: { ArrowClosed: 'ArrowClosed' },
    applyNodeChanges: (_changes: any, nodes: any) => nodes,
    // Hook used by GraphCanvas to manage viewport conversions
    useReactFlow: () => ({
      setViewport: vi.fn(),
      screenToFlowPosition: (pt: { x: number; y: number }) => pt,
      getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
    }),
  };
});

import { events } from '../../src/lib/events';
import { GraphProvider, useGraph } from '../../src/state/graph-store';
import { GraphCanvas } from '../../src/components/graph/GraphCanvas';

const Harness: React.FC = () => {
  const { graph, newGraph, updateViewport } = useGraph() as any;
  const didSetViewport = React.useRef(false);
  React.useEffect(() => {
    if (!graph) {
      void newGraph();
    }
  }, [graph, newGraph, updateViewport]);

  React.useEffect(() => {
    if (!graph) return;
    if (didSetViewport.current) return;
    didSetViewport.current = true;
    updateViewport(12, 34, 2);
  }, [graph, updateViewport]);

  return <GraphCanvas />;
};

describe('GraphCanvas zoom stability', () => {
  it('does not auto-fit view and preserves stored viewport across selection-driven rerenders', async () => {
    render(
      <GraphProvider>
        <Harness />
      </GraphProvider>
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    await waitFor(() => {
      expect(lastReactFlowProps).toBeTruthy();
      expect(lastReactFlowProps?.defaultViewport?.zoom).toBe(2);
    });

    expect(lastReactFlowProps?.fitView).toBeUndefined();
    expect(lastReactFlowProps?.defaultViewport).toMatchObject({ x: 12, y: 34, zoom: 2 });

    // Trigger a selectionVersion bump (GraphCanvas remounts ReactFlow via key).
    await act(async () => {
      events.emit('reference:styleChanged', { id: 'ref-1', style: 'double' });
      await new Promise(r => setTimeout(r, 0));
    });

    expect(lastReactFlowProps?.defaultViewport).toMatchObject({ x: 12, y: 34, zoom: 2 });
  });
});
