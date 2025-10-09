import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, waitFor, cleanup, act } from '@testing-library/react';
import { GraphProvider, useGraph } from '../../src/state/graph-store';
import type { StaticWebAppsProfile, ClientPrincipal, Claim } from '../../src/lib/auth/user-identity';
import { initDB } from '../../src/lib/indexeddb';

type GraphContextValue = ReturnType<typeof useGraph>;

const GraphHarness = React.forwardRef<GraphContextValue | null>((_, ref) => {
  const ctx = useGraph();
  React.useImperativeHandle(ref, () => ctx, [ctx]);
  return null;
});
GraphHarness.displayName = 'GraphHarness';

const baseClaims: Claim[] = [
  { typ: 'name', val: 'Adele Vance' },
  { typ: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress', val: 'adele@contoso.com' },
  { typ: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier', val: '00000000-0000-4000-8000-000000000001' },
  { typ: 'http://schemas.microsoft.com/identity/claims/tenantid', val: '11111111-2222-3333-4444-555555555555' },
  { typ: 'picture', val: 'https://graph.microsoft.com/v1.0/me/photo/$value' },
];

function makeProfile(overrides: Partial<ClientPrincipal> = {}): StaticWebAppsProfile {
  const basePrincipal: ClientPrincipal = {
    identityProvider: 'aad',
    userId: '00000000-0000-4000-8000-000000000001',
    userDetails: 'Adele Vance',
    userRoles: ['authenticated'],
    claims: baseClaims.map(claim => ({ ...claim })),
  };
  const merged: ClientPrincipal = {
    ...basePrincipal,
    ...overrides,
    userRoles: overrides.userRoles ? [...overrides.userRoles] : [...basePrincipal.userRoles],
    claims: overrides.claims ? overrides.claims.map(claim => ({ ...claim })) : basePrincipal.claims.map(claim => ({ ...claim })),
  };
  return { clientPrincipal: merged };
}

async function deleteDatabase(name: string) {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onblocked = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function wipeAllDatabases() {
  if (typeof indexedDB.databases === 'function') {
    const registrations = await indexedDB.databases();
    for (const info of registrations) {
      if (info?.name) {
        await deleteDatabase(info.name);
      }
    }
  } else {
    await deleteDatabase('mindflow');
  }
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(async () => {
  cleanup();
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
  }
  await wipeAllDatabases();
  vi.restoreAllMocks();
});

async function renderGraphProvider() {
  const ref = React.createRef<GraphContextValue>();
  render(
    <GraphProvider>
      <GraphHarness ref={ref} />
    </GraphProvider>
  );
  await waitFor(() => {
    expect(ref.current).not.toBeNull();
  });
  return {
    getContext: () => {
      const ctx = ref.current;
      if (!ctx) {
        throw new Error('Graph context unavailable');
      }
      return ctx;
    },
  };
}

describe('graph store identity integration', () => {
  it('applies a hosted identity profile and configures workspace isolation', async () => {
    const { getContext } = await renderGraphProvider();
    const profile = makeProfile();

    await act(async () => {
      await getContext().applyIdentityFromProfile(profile);
    });

    const ctx = getContext();
    expect(ctx.identity?.displayName).toBe('Adele Vance');
    expect(ctx.identityStatus).toBe('ready');
    expect(ctx.workspace?.workspaceId).toBe('00000000-0000-4000-8000-000000000001');
    expect(ctx.workspace?.isolationTag).toMatch(/^user_[0-9a-f]{12}$/);
    expect(ctx.sessionNonce).toBeTruthy();
  });

  it('loads identity via /.auth/me and revokes previous session', async () => {
  const { getContext } = await renderGraphProvider();
  const originalFetch = globalThis.fetch;
    const firstProfile = makeProfile();
    const secondProfile = makeProfile({ userDetails: 'Adele Reloaded' });

    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => firstProfile,
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => secondProfile,
      } as unknown as Response);

    await act(async () => {
      await getContext().loadIdentity();
    });

    const firstNonce = getContext().sessionNonce;
    expect(getContext().identity?.displayName).toBe('Adele Vance');

    await act(async () => {
      await getContext().loadIdentity();
    });

    const ctx = getContext();
    expect(ctx.identity?.displayName).toBe('Adele Reloaded');
    expect(ctx.sessionNonce).toBeTruthy();
    expect(ctx.sessionNonce).not.toBe(firstNonce);
    expect(ctx.lastSessionRevokedAt).toBeTruthy();

  globalThis.fetch = originalFetch;
  });

  it('clears hosted identity and restores base workspace', async () => {
    const { getContext } = await renderGraphProvider();
    const profile = makeProfile();

    await act(async () => {
      await getContext().applyIdentityFromProfile(profile);
    });

    await act(async () => {
      getContext().clearIdentity();
    });

    const ctx = getContext();
    expect(ctx.identity).toBeNull();
    expect(ctx.workspace).toBeNull();
    expect(ctx.identityStatus).toBe('idle');
    expect(ctx.sessionNonce).toBeNull();

    const db = await initDB();
    expect(db.name).toBe('mindflow');
    db.close();
  });

  it('disables workspace access when requested', async () => {
    const { getContext } = await renderGraphProvider();
    const profile = makeProfile();

    await act(async () => {
      await getContext().applyIdentityFromProfile(profile);
    });

    await act(async () => {
      getContext().setWorkspaceDisabled(true);
    });

    const ctx = getContext();
    expect(ctx.workspace?.disabledAccessFlag).toBe(true);
    await expect(getContext().newGraph()).rejects.toThrow(/Workspace is disabled/);
  });
});
