import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { GraphProvider, useGraph } from '../../src/state/graph-store';

const Capture: React.FC = () => {
  const { newGraph, nodes, graph } = useGraph();
  React.useEffect(() => { (async () => { await newGraph(); })(); }, [newGraph]);
  return <div data-testid="snapshot" data-count={nodes.length} data-has={graph ? 'y' : 'n'} />;
};

describe('newGraph initial node', () => {
  it('creates a graph with one initial node', async () => {
    render(<GraphProvider><Capture /></GraphProvider>);
    await waitFor(() => {
      const div = document.querySelector('[data-testid="snapshot"]')!;
      expect(div.getAttribute('data-has')).toBe('y');
      expect(div.getAttribute('data-count')).toBe('1');
    });
  });
});
