import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { act, render } from '@testing-library/react';

let lastReactFlowProps: any | null = null;

const mocks = vi.hoisted(() => ({
  createReference: vi.fn(),
  addConnectedNode: vi.fn(),
  repositionReference: vi.fn(),
}));

vi.mock('reactflow', async () => {
  const React = (await import('react')) as typeof import('react');

  const ReactFlow = (props: any) => {
    lastReactFlowProps = props;
    return React.createElement('div', { 'data-testid': 'reactflow-mock' }, props.children);
  };

  return {
    __esModule: true,
    default: ReactFlow,
    Background: () => null,
    Controls: () => null,
    Handle: () => null,
    Position: { Top: 'top', Right: 'right', Bottom: 'bottom', Left: 'left' },
    MarkerType: { ArrowClosed: 'ArrowClosed' },
    applyNodeChanges: (_changes: any, nodes: any) => nodes,
    useReactFlow: () => ({
      setViewport: vi.fn(),
      screenToFlowPosition: (pt: { x: number; y: number }) => ({ x: pt.x, y: pt.y }),
      getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
    }),
  };
});

vi.mock('../../src/state/graph-store', () => {
  const stableNodes = [{ id: 'a', x: 0, y: 0, text: 'A', nodeKind: 'thought', created: 1 }];
  const stableEdges: any[] = [];
  const stableReferences: any[] = [];
  const stableSelectedNodeIds: string[] = [];
  const stableGraph = { id: 'g1', viewport: { x: 0, y: 0, zoom: 1 } };
  const graphApi = {
    nodes: stableNodes,
    edges: stableEdges,
    references: stableReferences,
    selectedReferenceId: null,
    selectReference: vi.fn(),
    deleteReference: vi.fn(),
    startEditing: vi.fn(),
    editingNodeId: null,
    moveNode: vi.fn(),
    addEdge: vi.fn(),
    addConnectedNode: mocks.addConnectedNode,
    graph: stableGraph,
    updateViewport: vi.fn(),
    selectNode: vi.fn(),
    activeTool: null,
    addAnnotation: vi.fn(),
    updateEdgeHandles: vi.fn(),
    createReference: mocks.createReference,
    repositionReference: mocks.repositionReference,
    selectedNodeIds: stableSelectedNodeIds,
    replaceSelection: vi.fn(),
    addToSelection: vi.fn(),
    marquee: null,
    beginMarquee: vi.fn(),
    updateMarquee: vi.fn(),
    endMarquee: vi.fn(),
    cancelMarquee: vi.fn(),
    activateMarquee: vi.fn(),
    interactionMode: 'select',
  };

  return {
    __esModule: true,
    useGraph: () => graphApi,
  };
});

import { GraphCanvas } from '../../src/components/graph/GraphCanvas';

function paneEvent(clientX: number, clientY: number) {
  return {
    target: {
      classList: {
        contains: (cls: string) => cls === 'react-flow__pane',
      },
    },
    clientX,
    clientY,
  } as any;
}

describe('Connector drag behavior', () => {
  it('does not create a new node when a connector-to-connector connection succeeds', async () => {
    mocks.createReference.mockClear();
    mocks.addConnectedNode.mockClear();

    render(<GraphCanvas />);

    await act(async () => {
      // Start a connector drag from node a
      lastReactFlowProps.onConnectStart({ clientX: 10, clientY: 10 } as any, { nodeId: 'a', handleId: 'e', handleType: 'source' } as any);

      // Successful connect to node b (simulated)
      lastReactFlowProps.onConnect({ source: 'a', target: 'b', sourceHandle: 'e', targetHandle: 'w' });

      // React Flow still calls onConnectEnd; some browsers report the pane as event.target.
      lastReactFlowProps.onConnectEnd(paneEvent(200, 200));

      await new Promise(r => setTimeout(r, 0));
    });

    expect(mocks.createReference).toHaveBeenCalledTimes(1);
    expect(mocks.addConnectedNode).not.toHaveBeenCalled();
  });

  it('does not create a new node when reconnecting an existing edge endpoint succeeds', async () => {
    mocks.repositionReference.mockClear();
    mocks.addConnectedNode.mockClear();

    render(<GraphCanvas />);

    await act(async () => {
      lastReactFlowProps.onConnectStart({ clientX: 10, clientY: 10 } as any, { nodeId: 'a', handleId: 'e', handleType: 'source' } as any);

      // Simulate updating an existing reference edge to point to a different node.
      lastReactFlowProps.onEdgeUpdate(
        { id: 'ref-1', data: { ref: true } },
        { source: 'a', target: 'b', sourceHandle: 'e', targetHandle: 'w' }
      );

      // Even if connectEnd reports pane, it must not spawn a new node.
      lastReactFlowProps.onConnectEnd(paneEvent(200, 200));
      await new Promise(r => setTimeout(r, 0));
    });

    expect(mocks.repositionReference).toHaveBeenCalledTimes(1);
    expect(mocks.addConnectedNode).not.toHaveBeenCalled();
  });
});
