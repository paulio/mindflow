import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGraph } from '../../state/graph-store';
import type { ImportSummary } from '../../lib/export';
import { EXPORT_MANIFEST_VERSION } from '../../lib/export';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose?: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '24px',
};

const dialogStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: '0 20px 48px rgba(0,0,0,0.45)',
  padding: '20px 24px',
  width: 'min(460px, 100%)',
  maxHeight: '85vh',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const Modal: React.FC<ModalProps> = ({ title, children, footer, onClose }) => {
  return (
  <div style={overlayStyle} role="presentation" onMouseDown={onClose ? () => onClose() : undefined}>
      <div
        style={dialogStyle}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onMouseDown={event => event.stopPropagation()}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <strong style={{ fontSize: 18 }}>{title}</strong>
          {onClose && (
            <button onClick={onClose} aria-label="Close dialog" style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
          )}
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {children}
        </div>
        {footer && (
          <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};

function formatDateTime(iso?: string): string {
  if (!iso) return 'Unknown';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

interface ExportProgressState {
  visible: boolean;
  status: 'running' | 'ready' | 'error';
  message: string;
  fileName?: string;
  downloadUrl?: string;
  error?: string;
}

interface ImportProgressState {
  visible: boolean;
  status: 'running' | 'complete' | 'error' | 'cancelled';
  message: string;
  processed: number;
  total: number;
  details: string[];
  summary?: ImportSummary;
}

export const MapLibrary: React.FC = () => {
  const {
    graphs,
    newGraph,
    selectGraph,
    selectedLibraryIds,
    addLibrarySelection,
    toggleLibrarySelection,
    replaceLibrarySelection,
    clearLibrarySelection,
    exportMaps,
    stageImport,
    importContext,
    resolveImportConflict,
    finalizeImportSession,
    clearImportSession,
  } = useGraph();

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgressState | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [activeConflictIndex, setActiveConflictIndex] = useState<number>(-1);
  const [importProgress, setImportProgress] = useState<ImportProgressState | null>(null);
  const [importResult, setImportResult] = useState<ImportSummary | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const progressDetailKeys = useRef<Set<string>>(new Set());

  const selectedMaps = useMemo(
    () => graphs.filter(graph => selectedLibraryIds.includes(graph.id)),
    [graphs, selectedLibraryIds]
  );

  const importEntries = importContext?.session.entries ?? [];
  const isImportSummaryOpen = importContext?.session.status === 'pending';
  const manifestVersion = importContext?.manifest.manifestVersion ?? null;
  const manifestNeedsMigration = (manifestVersion ?? EXPORT_MANIFEST_VERSION) < EXPORT_MANIFEST_VERSION;
  const currentConflictEntry = activeConflictIndex >= 0 ? importEntries[activeConflictIndex] : undefined;

  useEffect(() => {
    if (!toastMessage) return;
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 4000);
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, [toastMessage]);

  useEffect(() => {
    return () => {
      if (exportProgress?.downloadUrl) URL.revokeObjectURL(exportProgress.downloadUrl);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, [exportProgress]);

  useEffect(() => {
    if (exportProgress?.status === 'ready' && exportProgress.downloadUrl && exportProgress.fileName) {
      const anchor = document.createElement('a');
      anchor.href = exportProgress.downloadUrl;
      anchor.download = exportProgress.fileName;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }
  }, [exportProgress?.status, exportProgress?.downloadUrl, exportProgress?.fileName]);

  const unresolvedConflicts = useMemo(
    () => importEntries.filter(entry => entry.conflict && !entry.resolution),
    [importEntries]
  );

  const beginExport = async () => {
    const count = selectedMaps.length;
    setExportDialogOpen(false);
    if (!count) return;
    setExportProgress({ visible: true, status: 'running', message: `Preparing ${count} ${count === 1 ? 'map' : 'maps'}...` });
    try {
      const result = await exportMaps(selectedLibraryIds);
      const url = URL.createObjectURL(result.blob);
      setExportProgress({
        visible: true,
        status: 'ready',
        message: 'Download ready',
        fileName: result.fileName,
        downloadUrl: url,
      });
    } catch (error) {
      setExportProgress({
        visible: true,
        status: 'error',
        message: 'Export failed',
        error: error instanceof Error ? error.message : 'An unknown error occurred during export.',
      });
    }
  };

  const handleExportCancel = () => {
    if (exportProgress?.downloadUrl) {
      URL.revokeObjectURL(exportProgress.downloadUrl);
    }
    setExportProgress(null);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      await stageImport(file);
      setImportError(null);
      setActiveConflictIndex(-1);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to inspect archive.';
      setImportError(message);
      clearImportSession();
    }
  };

  const closeImportError = () => {
    setImportError(null);
    clearImportSession();
  };

  const computeDuplicateName = (baseName: string): string => {
    const taken = new Set(graphs.map(g => g.name.toLowerCase()));
    importEntries.forEach(entry => {
      taken.add(entry.snapshot.name.toLowerCase());
      if (entry.resolution?.resolvedName) {
        taken.add(entry.resolution.resolvedName.toLowerCase());
      }
    });
    let idx = 1;
    let candidate = `${baseName} (${idx})`;
    while (taken.has(candidate.toLowerCase())) {
      idx += 1;
      candidate = `${baseName} (${idx})`;
    }
    return candidate;
  };

  const startConflictFlow = () => {
    if (!importContext) return;
    const firstConflict = importEntries.findIndex(entry => entry.conflict && !entry.resolution);
    if (firstConflict >= 0) {
      setActiveConflictIndex(firstConflict);
    } else {
      applyImport();
    }
  };

  const applyImport = async () => {
    if (!importContext) return;
    const total = importEntries.length;
    progressDetailKeys.current = new Set();
    const details: string[] = [];
    if (importContext.manifest.manifestVersion < EXPORT_MANIFEST_VERSION) {
      details.push(`Migrating manifest version ${importContext.manifest.manifestVersion}`);
      progressDetailKeys.current.add(`manifest:${importContext.manifest.manifestVersion}`);
    }
    importEntries.forEach(entry => {
      if (entry.migrationAttempted) {
        const key = `upgrade:${entry.snapshot.id}`;
        if (!progressDetailKeys.current.has(key)) {
          progressDetailKeys.current.add(key);
          details.push(`Upgrading map ${entry.snapshot.id}`);
        }
      }
    });

    setImportProgress({
      visible: true,
      status: 'running',
      message: total ? `Processing 1 of ${total}` : 'No maps to import',
      processed: total ? 1 : 0,
      total,
      details,
    });

    try {
      const summary = await finalizeImportSession('commit', {
        onProgress: event => {
          setImportProgress(prev => {
            if (!prev) return prev;
            const nextDetails = [...prev.details];
            if (event.entry && event.entry.migrationAttempted) {
              const key = `upgrade:${event.entry.snapshot.id}`;
              if (!progressDetailKeys.current.has(key)) {
                progressDetailKeys.current.add(key);
                nextDetails.push(`Upgrading map ${event.entry.snapshot.id}`);
              }
              event.entry.migrationNotes?.forEach(note => {
                const noteKey = `${key}:${note}`;
                if (!progressDetailKeys.current.has(noteKey)) {
                  progressDetailKeys.current.add(noteKey);
                  nextDetails.push(note);
                }
              });
            }
            const status = event.stage === 'applying'
              ? 'running'
              : event.stage === 'failed'
                ? 'error'
                : event.stage === 'cancelled'
                  ? 'cancelled'
                  : 'complete';
            const processedIndex = event.stage === 'applying'
              ? Math.min(event.processed + 1, event.total)
              : event.processed;
            return {
              visible: true,
              status,
              message: event.message ?? prev.message,
              processed: processedIndex,
              total: event.total,
              details: nextDetails,
              summary: event.summary ?? prev.summary,
            };
          });
        },
      });
      if (summary) {
        setImportResult(summary);
        if (summary.failed) {
          setToastMessage('Import completed with errors');
        } else {
          setToastMessage('Import complete');
        }
      }
      setActiveConflictIndex(-1);
    } catch (error) {
      setImportProgress({
        visible: true,
        status: 'error',
        message: error instanceof Error ? error.message : 'Import failed unexpectedly.',
        processed: 0,
        total: importEntries.length,
        details: [],
      });
      setToastMessage('Import failed');
    }
  };

  const handleConflictDecision = async (decision: 'add' | 'overwrite') => {
    if (activeConflictIndex < 0) return;
    const entry = importEntries[activeConflictIndex];
    if (!entry) return;
    const timestamp = new Date().toISOString();
    resolveImportConflict(entry.snapshot.id, {
      mapId: entry.snapshot.id,
      action: decision,
      resolvedName: decision === 'add' ? computeDuplicateName(entry.snapshot.name) : undefined,
      timestamp,
    });
    const next = importEntries.findIndex((candidate, index) => index > activeConflictIndex && candidate.conflict && !candidate.resolution);
    if (next >= 0) {
      setActiveConflictIndex(next);
    } else {
      setActiveConflictIndex(-1);
      applyImport();
    }
  };

  const handleCancelImport = async () => {
    try {
      await finalizeImportSession('cancel');
      setToastMessage('Import cancelled');
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Failed to cancel import');
    } finally {
      setActiveConflictIndex(-1);
      clearImportSession();
      setImportProgress(null);
    }
  };

  const closeImportResult = () => {
    setImportResult(null);
    setImportProgress(null);
    clearImportSession();
  };

  const hasSelection = selectedLibraryIds.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <header style={{ padding: '8px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <strong style={{ fontSize: 20, flex: 1 }}>Mindflow Library</strong>
        <button onClick={() => newGraph()} style={{ padding: '6px 12px' }}>New Map</button>
        <button onClick={() => setExportDialogOpen(true)} disabled={!hasSelection} style={{ padding: '6px 12px' }}>Export</button>
        <button onClick={handleImportClick} style={{ padding: '6px 12px' }}>Import</button>
        <input ref={fileInputRef} type="file" accept="application/zip,.zip" style={{ display: 'none' }} onChange={handleFileChange} />
      </header>
      <main style={{ flex: 1, display: 'flex', gap: 24, padding: '16px', overflow: 'auto' }}>
        <section style={{ flex: 1, minWidth: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Saved Maps</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => replaceLibrarySelection(graphs.map(g => g.id))} disabled={!graphs.length}>Select all</button>
              <button onClick={() => clearLibrarySelection()} disabled={!hasSelection}>Clear</button>
            </div>
          </div>
          {graphs.length === 0 && <div style={{ opacity: 0.6, fontSize: 14 }}>No maps yet. Create one to begin.</div>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {graphs.map(graph => {
              const checked = selectedLibraryIds.includes(graph.id);
              return (
                <li key={graph.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="checkbox"
                      aria-label={graph.name}
                      checked={checked}
                      onChange={event => {
                        if (event.target.checked) addLibrarySelection([graph.id]);
                        else toggleLibrarySelection(graph.id);
                      }}
                    />
                    <button
                      onClick={() => selectGraph(graph.id)}
                      style={{
                        background: 'transparent',
                        color: 'inherit',
                        border: 'none',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: 15,
                        cursor: 'pointer',
                        flex: 1,
                      }}
                    >
                      {graph.name}
                    </button>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    Last opened: {formatDateTime(graph.lastOpened)}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
        <section style={{ maxWidth: 420 }}>
          <h4 style={{ margin: '8px 0' }}>How it works</h4>
          <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, margin: 0 }}>
            <li>Select one or more maps using the checkboxes.</li>
            <li>Use Export to download a ZIP backup of your selection.</li>
            <li>Use Import to restore maps from a previous export.</li>
            <li>Conflicts are handled per map so you never lose data.</li>
          </ol>
        </section>
      </main>

      {toastMessage && (
        <div role="status" aria-live="polite" style={{ position: 'fixed', bottom: 24, right: 24, background: 'rgba(20,20,24,0.92)', color: '#fff', padding: '12px 16px', borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
          {toastMessage}
        </div>
      )}

      {exportDialogOpen && (
        <Modal
          title="Export maps"
          onClose={() => setExportDialogOpen(false)}
          footer={(
            <>
              <button onClick={() => setExportDialogOpen(false)}>Cancel</button>
              <button onClick={beginExport}>Download ZIP</button>
            </>
          )}
        >
          <p>You&rsquo;re about to export {selectedMaps.length} {selectedMaps.length === 1 ? 'map' : 'maps'}.</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {selectedMaps.map(map => (
              <li key={map.id}>{map.name}</li>
            ))}
          </ul>
        </Modal>
      )}

      {exportProgress?.visible && (
        <Modal
          title={exportProgress.status === 'error' ? 'Export failed' : 'Exporting maps'}
          onClose={exportProgress.status === 'running' ? undefined : handleExportCancel}
          footer={exportProgress.status === 'running' ? undefined : (
            <button onClick={handleExportCancel}>Close</button>
          )}
        >
          <div role="status">{exportProgress.message}</div>
          {exportProgress.status === 'error' && (
            <p style={{ color: 'var(--color-danger, #ff8389)' }}>{exportProgress.error}</p>
          )}
        </Modal>
      )}

      {!!importError && (
        <Modal
          title="Import failed"
          onClose={closeImportError}
          footer={<button onClick={closeImportError}>Close</button>}
        >
          <p>{importError}</p>
        </Modal>
      )}

      {isImportSummaryOpen && importContext && (
        <Modal
          title="Import summary"
          onClose={() => { clearImportSession(); }}
          footer={(
            <>
              <button onClick={() => { clearImportSession(); }}>Cancel</button>
              <button onClick={() => { unresolvedConflicts.length ? startConflictFlow() : applyImport(); }}>
                {unresolvedConflicts.length ? 'Continue' : 'Import maps'}
              </button>
            </>
          )}
        >
          <p>Detected {importEntries.length} {importEntries.length === 1 ? 'map' : 'maps'} in the archive.</p>
          {manifestNeedsMigration && (
            <p style={{ color: 'var(--color-warning, #ffd166)' }}>Migration required for manifest version {manifestVersion ?? 'unknown'}.</p>
          )}
          <ul style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {importEntries.map(entry => (
              <li key={entry.snapshot.id}>
                <strong>{entry.snapshot.name}</strong>
                {entry.conflict && <span style={{ marginLeft: 8, color: 'var(--color-warning, #ffd166)' }}>(Conflict)</span>}
                {entry.migrationAttempted && entry.migrationSucceeded && <span style={{ marginLeft: 8, color: 'var(--color-accent, #72f1b8)' }}>(Migrated)</span>}
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {currentConflictEntry && (
        <Modal
          title="Conflict detected"
          onClose={() => setActiveConflictIndex(-1)}
          footer={(
            <>
              <button onClick={handleCancelImport}>Cancel import</button>
              <button onClick={() => handleConflictDecision('add')}>Add</button>
              <button onClick={() => handleConflictDecision('overwrite')}>Overwrite</button>
            </>
          )}
        >
          <p>The map &ldquo;{currentConflictEntry.snapshot.name}&rdquo; already exists in your library.</p>
          <p>Choose whether to keep both copies or overwrite the existing map.</p>
        </Modal>
      )}

      {importProgress?.visible && (
        <Modal
          title={importProgress.status === 'error' ? 'Import failed' : importProgress.status === 'complete' ? 'Import complete' : importProgress.status === 'cancelled' ? 'Import cancelled' : 'Importing maps'}
          onClose={importProgress.status === 'running' ? undefined : () => { setImportProgress(null); clearImportSession(); }}
          footer={importProgress.status === 'running' ? undefined : (
            <button onClick={() => { setImportProgress(null); clearImportSession(); }}>Close</button>
          )}
        >
          <div role="status">{importProgress.message}</div>
          {importProgress.total > 0 && (
            <div style={{ fontSize: 13, opacity: 0.8 }}>Processing {importProgress.processed} of {importProgress.total}</div>
          )}
          <ul style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
            {importProgress.details.map(detail => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        </Modal>
      )}

      {importResult && (
        <Modal
          title="Import complete"
          onClose={closeImportResult}
          footer={<button onClick={closeImportResult}>Close</button>}
        >
          <p>Processed {importResult.totalProcessed} {importResult.totalProcessed === 1 ? 'map' : 'maps'}.</p>
          <ul style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {importResult.messages.map((message, index) => (
              <li key={`${message.mapId}-${index}`}>{message.detail}</li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  );
};