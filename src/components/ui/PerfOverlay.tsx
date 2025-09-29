import React, { useEffect, useState } from 'react';
import { observeFrames } from '../../lib/metrics';

interface PerfSample { fps: number; };

export const PerfOverlay: React.FC = () => {
  const [fps, setFps] = useState<number>(0);
  useEffect(() => {
    observeFrames(f => setFps(Math.round(f)));
  }, []);
  return (
    <div style={{ position: 'fixed', top: 8, right: 8, background: '#000a', padding: 8, fontSize: 12, fontFamily: 'monospace', border: '1px solid #333', borderRadius: 4 }}>
      <div>FPS: {fps}</div>
    </div>
  );
};
