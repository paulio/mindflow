import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { GraphProvider, useGraph } from '../../src/state/graph-store';
import { GraphCanvas } from '../../src/components/graph/GraphCanvas';
import { ReactFlowProvider } from 'reactflow';

// RTL test verifying double-click editing & commit (FR-005a/b)

const Harness: React.FC = () => {
  const { graph, newGraph } = useGraph();
  React.useEffect(() => { if (!graph) void newGraph(); }, [graph, newGraph]);
  return <GraphCanvas />;
};

function setup() {
  return render(
    <GraphProvider>
      <ReactFlowProvider>
        <Harness />
      </ReactFlowProvider>
    </GraphProvider>
  );
}

describe('FR-005a/b double-click edit + commit (RTL harness)', () => {
  it('double-click enters edit mode and Enter commits', async () => {
    const utils = setup();
    await new Promise(r => setTimeout(r, 0));
    const label = await utils.findByText('New Thought');
    fireEvent.doubleClick(label);
    const textarea = utils.getByLabelText('Edit thought text') as HTMLTextAreaElement;
    expect(textarea.value).toBe('New Thought');
    fireEvent.change(textarea, { target: { value: 'Reframed Idea' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    const updated = await utils.findByText('Reframed Idea');
    expect(updated).toBeTruthy();
  });
});