import React from 'react';
import { GraphProvider, useGraph } from '../state/graph-store';
import { ThemeProvider } from '../state/theme-store';
import { ReactFlowProvider } from 'reactflow';
import { GraphCanvas } from '../components/graph/GraphCanvas';
import { GraphMetaPanel } from '../components/panels/GraphMetaPanel';
import { PerfOverlay } from '../components/ui/PerfOverlay';
import { UndoRedoBar } from '../components/ui/UndoRedoBar';
import { SaveStatus } from '../components/ui/SaveStatus';
import { MapLibrary } from '../components/pages/MapLibrary';

const CanvasView: React.FC = () => {
  const { graph, openLibrary } = useGraph();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ padding: '4px 12px', borderBottom: '1px solid #222', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={openLibrary} style={{ background: '#222', color: '#eee', border: '1px solid #333', padding: '2px 8px', cursor: 'pointer' }}>← Library</button>
        <strong style={{ flex: 1 }}>{graph?.name || 'Untitled'}</strong>
      </header>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <GraphCanvas />
        <GraphMetaPanel />
      </div>
      <UndoRedoBar />
      <SaveStatus />
      <PerfOverlay />
    </div>
  );
};

const RootView: React.FC = () => {
  const { view } = useGraph();
  return view === 'library' ? <MapLibrary /> : <CanvasView />;
};

const App: React.FC = () => (
  <ThemeProvider>
    <GraphProvider>
      <ReactFlowProvider>
        <RootView />
      </ReactFlowProvider>
    </GraphProvider>
  </ThemeProvider>
);

export default App;
