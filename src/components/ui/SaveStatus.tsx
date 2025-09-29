import React, { useEffect, useState } from 'react';
import { events } from '../../lib/events';

export const SaveStatus: React.FC = () => {
  const [status, setStatus] = useState<'idle'|'saving'|'error'|'ok'>('idle');
  useEffect(() => {
    const offSuccess = events.on('autosave:success', () => setStatus('ok'));
    const offFailure = events.on('autosave:failure', () => setStatus('error'));
    return () => { offSuccess(); offFailure(); };
  }, []);
  return (
    <div style={{ position: 'fixed', bottom: 8, right: 8, fontSize: 12 }}>
      {status === 'ok' && <span style={{ color: '#4f9dff' }}>Saved</span>}
      {status === 'error' && <span style={{ color: '#ff4f64' }}>Save Failed</span>}
      {status === 'idle' && <span>Idle</span>}
    </div>
  );
};
