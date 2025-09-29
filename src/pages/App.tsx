import React from 'react';
import { GraphProvider, useGraph } from '../state/graph-store';
import { ReactFlowProvider } from 'reactflow';
import { GraphCanvas } from '../components/graph/GraphCanvas';
import { GraphListPanel } from '../components/panels/GraphListPanel';
import { GraphMetaPanel } from '../components/panels/GraphMetaPanel';
import { PerfOverlay } from '../components/ui/PerfOverlay';
import { UndoRedoBar } from '../components/ui/UndoRedoBar';
import { SaveStatus } from '../components/ui/SaveStatus';

const Canvas: React.FC = () => {
  const { graph, newGraph } = useGraph();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ padding: '4px 12px', borderBottom: '1px solid #222', display: 'flex', gap: 8 }}>
        <strong>Mindflow</strong>
        {!graph && <button onClick={() => newGraph()}>New Map</button>}
      </header>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <GraphListPanel />
        <GraphCanvas />
        <GraphMetaPanel />
      </div>
      <UndoRedoBar />
      <SaveStatus />
      <PerfOverlay />
    </div>
  );
};

const App: React.FC = () => (
  <GraphProvider>
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  </GraphProvider>
);

export default App;
