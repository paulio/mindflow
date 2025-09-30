import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { GraphProvider, useGraph } from '../../src/state/graph-store';
import { GraphCanvas } from '../../src/components/graph/GraphCanvas';

// Lightweight RTL integration proving double-click edit enters input and commits text.

const Harness: React.FC = () => {
  const { graph, newGraph } = useGraph();
  React.useEffect(() => { if (!graph) void newGraph(); }, [graph, newGraph]);
  return <GraphCanvas />;
};

function setup() {
  return render(<GraphProvider><Harness /></GraphProvider>);
}

describe('FR-005a/b double-click edit + commit (RTL harness)', () => {
  it('double-click enters edit mode and Enter commits', async () => {
    const utils = setup();
    // Wait a tick for root node render
    await new Promise(r => setTimeout(r, 0));
    const label = await utils.findByText('New Thought');
    // double click
    fireEvent.doubleClick(label);
    const input = utils.getByLabelText('Edit thought text') as HTMLInputElement;
    expect(input.value).toBe('New Thought');
    // change value
    fireEvent.change(input, { target: { value: 'Reframed Idea' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // Input should disappear and new text appear
    const updated = await utils.findByText('Reframed Idea');
    expect(updated).toBeTruthy();
  });
});
