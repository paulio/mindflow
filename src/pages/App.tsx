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
import { Toolbar } from '../components/ui/Toolbar';
import { InteractionModeToggle } from '../components/ui/InteractionModeToggle';
import { UserAvatar } from '../components/ui/UserAvatar';

const SignedOutView: React.FC<{ onSignIn(): void; status: 'idle' | 'error' | 'ready' | 'loading'; error?: string; onRetry(): void; canSignIn: boolean }> = ({ onSignIn, status, error, onRetry, canSignIn }) => (
  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center', color: 'var(--color-text, #f5f5f5)' }}>
    <h1 style={{ fontSize: 24, margin: 0 }}>Mindflow</h1>
    <p style={{ maxWidth: 360, opacity: 0.85 }}>
      Sign in with your Entra ID account to access your maps. Each account is isolated—only your personal workspace will be loaded.
    </p>
    {status === 'error' && canSignIn && (
      <div role="alert" style={{ background: 'rgba(255,79,100,0.16)', border: '1px solid rgba(255,79,100,0.45)', padding: '8px 12px', borderRadius: 6, maxWidth: 360 }}>
        <strong style={{ display: 'block', marginBottom: 4 }}>Unable to reach Azure auth.</strong>
        <span style={{ fontSize: 13 }}>{error ?? 'An unexpected error occurred while loading your session.'}</span>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button type="button" onClick={onRetry} style={{ background: '#2a2d37', color: '#f5f5f5', border: '1px solid #383c48', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>Retry</button>
          <button type="button" onClick={onSignIn} style={{ background: 'var(--color-accent, #4f9dff)', color: '#0a0a0d', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontWeight: 600 }}>Sign in</button>
        </div>
      </div>
    )}
    {!canSignIn && (
      <div style={{ maxWidth: 360, fontSize: 13, lineHeight: 1.6, opacity: 0.85 }}>
        This locally hosted build runs without Entra ID. Use the hosted Azure Static Web Apps deployment to sign in, or load maps manually from exports for support review.
      </div>
    )}
    {canSignIn && status !== 'error' && (
      <button type="button" onClick={onSignIn} style={{ background: 'var(--color-accent, #4f9dff)', color: '#0a0a0d', border: 'none', borderRadius: 6, padding: '8px 20px', cursor: 'pointer', fontWeight: 600 }}>
        Sign in with Entra ID
      </button>
    )}
  </div>
);

const LoadingView: React.FC<{ message?: string }> = ({ message }) => (
  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--color-text, #f5f5f5)' }}>
    <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(79,157,255,0.35)', borderTopColor: 'var(--color-accent, #4f9dff)', animation: 'spin 1.2s linear infinite' }} />
    <p style={{ opacity: 0.8 }}>{message ?? 'Checking session with Azure...'}</p>
    <style>
      {`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
    </style>
  </div>
);

const DisabledAccountView: React.FC<{ onSignOut(): void }> = ({ onSignOut }) => (
  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--color-text, #f5f5f5)' }}>
    <div style={{ maxWidth: 420, background: 'rgba(42,45,55,0.85)', border: '1px solid rgba(150,150,150,0.2)', padding: '24px 28px', borderRadius: 10, boxShadow: '0 18px 40px rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 22 }}>Account disabled</h2>
      <p style={{ margin: 0, opacity: 0.85 }}>
        Hosted access is blocked for this account. Your maps are still safe—support can export them using the local Mindflow workspace.
      </p>
      <button type="button" onClick={onSignOut} style={{ background: 'var(--color-accent, #4f9dff)', color: '#0a0a0d', border: 'none', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontWeight: 600 }}>Sign out</button>
    </div>
  </div>
);

const AppHeader: React.FC<{ onSignOut(): void }> = ({ onSignOut }) => {
  const { identity, lastSessionRevokedAt } = useGraph();
  if (!identity) return null;

  return (
    <header style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #22242e', background: '#12141c', gap: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 0.4 }}>Mindflow</div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {lastSessionRevokedAt && (
          <span style={{ fontSize: 12, color: 'rgba(245,245,245,0.65)' }}>
            Previous session signed out at {new Date(lastSessionRevokedAt).toLocaleTimeString()}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <UserAvatar identity={identity} size={34} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0 }}>
            <strong style={{ fontSize: 13, lineHeight: 1.2 }}>{identity.displayName}</strong>
            {identity.email && <span style={{ fontSize: 11, opacity: 0.7 }}>{identity.email}</span>}
          </div>
          <button
            type="button"
            onClick={onSignOut}
            style={{
              background: '#1f2230',
              color: '#f5f5f5',
              border: '1px solid #2d3040',
              padding: '4px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
};

const CanvasView: React.FC = () => {
  const { graph, openLibrary } = useGraph();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <header style={{ padding: '4px 12px', borderBottom: '1px solid #222', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={openLibrary} style={{ background: '#222', color: '#eee', border: '1px solid #333', padding: '2px 8px', cursor: 'pointer' }}>← Library</button>
        <strong style={{ flex: 1 }}>{graph?.name || 'Untitled'}</strong>
      </header>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <GraphCanvas />
        <GraphMetaPanel />
      </div>
      <UndoRedoBar />
  <Toolbar />
    <InteractionModeToggle />
      <SaveStatus />
      <PerfOverlay />
    </div>
  );
};

const RootView: React.FC = () => {
  const { view } = useGraph();
  return view === 'library' ? <MapLibrary /> : <CanvasView />;
};

const LocalApp: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 18px',
        borderBottom: '1px solid #22242e',
        background: '#12141c',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 0.4 }}>Mindflow</div>
      <span
        style={{
          fontSize: 11,
          color: 'rgba(245,245,245,0.75)',
          background: 'rgba(79,157,255,0.16)',
          border: '1px solid rgba(79,157,255,0.35)',
          borderRadius: 999,
          padding: '2px 10px',
          fontWeight: 500,
        }}
      >
        Local mode · data stays on this device
      </span>
    </header>
    <main style={{ flex: 1, minHeight: 0 }}>
      <RootView />
    </main>
  </div>
);

const AuthenticatedApp: React.FC<{ onSignOut(): void }> = ({ onSignOut }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppHeader onSignOut={onSignOut} />
      <main style={{ flex: 1, minHeight: 0 }}>
        <RootView />
      </main>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { identity, identityStatus, identityError, loadIdentity, clearIdentity, workspace } = useGraph();

  const isHostedEnvironment = React.useMemo(() => {
    if (typeof window === 'undefined') return true;
    const host = window.location.hostname.toLowerCase();
    if (import.meta.env.DEV) return false;
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.local')) {
      return false;
    }
    return true;
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isHostedEnvironment) {
      clearIdentity();
      return;
    }
    const controller = new AbortController();
    void loadIdentity({ signal: controller.signal }).catch((error) => {
      if (error instanceof Error && error.name === 'AbortError') return;
      if (process.env.NODE_ENV !== 'production') {
        const message = error instanceof Error ? error.message : String(error);
        const detail = `Failed to load identity: ${message}`;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mindflow:identity-error', { detail }));
        }
      }
    });
    return () => controller.abort();
  }, [clearIdentity, isHostedEnvironment, loadIdentity]);

  const handleSignIn = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!isHostedEnvironment) {
      return;
    }
    const redirect = window.location.href;
    window.location.href = `/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(redirect)}`;
  }, [isHostedEnvironment]);

  const handleRetry = React.useCallback(() => {
    if (!isHostedEnvironment) return;
    void loadIdentity().catch(() => {/* handled in state */});
  }, [isHostedEnvironment, loadIdentity]);

  const handleSignOut = React.useCallback(() => {
    clearIdentity();
    if (typeof window === 'undefined') return;
    const redirect = `${window.location.origin}/`;
    window.location.href = `/.auth/logout?post_logout_redirect_uri=${encodeURIComponent(redirect)}`;
  }, [clearIdentity]);

  if (identityStatus === 'loading' && !identity) {
    return <LoadingView />;
  }

  if (!isHostedEnvironment) {
    return <LocalApp />;
  }

  if (!identity) {
    return (
      <SignedOutView
        onSignIn={handleSignIn}
        status={identityStatus}
        error={identityError ?? undefined}
        onRetry={handleRetry}
        canSignIn={isHostedEnvironment}
      />
    );
  }

  if (workspace?.disabledAccessFlag) {
    return <DisabledAccountView onSignOut={handleSignOut} />;
  }

  return <AuthenticatedApp onSignOut={handleSignOut} />;
};

const App: React.FC = () => (
  <ThemeProvider>
    <GraphProvider>
      <ReactFlowProvider>
        <AppContent />
      </ReactFlowProvider>
    </GraphProvider>
  </ThemeProvider>
);

export default App;
