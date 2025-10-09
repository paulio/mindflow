import { afterEach, describe, expect, it } from 'vitest';
import {
  configureWorkspace,
  createGraph,
  initDB,
  resetWorkspaceConfiguration,
} from '../../src/lib/indexeddb';
import {
  createMapWorkspace,
  markWorkspaceDisabled,
  type MapWorkspace,
} from '../../src/lib/workspace/map-workspace';
import type { UserIdentity } from '../../src/lib/auth/user-identity';

function makeIdentity(overrides: Partial<UserIdentity> = {}): UserIdentity {
  return {
    subjectId: 'sub-123',
    tenantId: 'tenant-001',
    displayName: 'Test User',
    lastLogin: '2024-01-01T00:00:00.000Z',
    sessionState: 'active',
    roles: [],
    ...overrides,
  };
}

async function deleteDatabase(name: string) {
  if (!('indexedDB' in globalThis)) return;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onblocked = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function disposeDb(name: string | undefined) {
  if (!name) return;
  await deleteDatabase(name);
}

const openedDbNames = new Set<string>();

afterEach(async () => {
  resetWorkspaceConfiguration();
  for (const name of openedDbNames) {
    await disposeDb(name);
  }
  openedDbNames.clear();
});

describe('indexeddb workspace configuration', () => {
  it('opens a namespaced database per workspace isolation tag', async () => {
    const workspace = createMapWorkspace(makeIdentity());
    configureWorkspace(workspace);

    const db = await initDB();
    expect(db.name).toBe(`mindflow-${workspace.isolationTag}`);
    openedDbNames.add(db.name);
    db.close();
  });

  it('blocks write operations when workspace is disabled', async () => {
    const workspace: MapWorkspace = markWorkspaceDisabled(createMapWorkspace(makeIdentity({ subjectId: 'blocked-user' })));
    configureWorkspace(workspace);

    await expect(createGraph('Blocked graph')).rejects.toThrow(/Workspace is disabled/);
  });

  it('allows writes again after reconfiguring to an enabled workspace', async () => {
    const baseWorkspace = markWorkspaceDisabled(createMapWorkspace(makeIdentity({ subjectId: 'first-user' })));
    configureWorkspace(baseWorkspace);
    await expect(createGraph('Should fail')).rejects.toThrow();

    const enabledWorkspace = createMapWorkspace(makeIdentity({ subjectId: 'second-user' }));
    configureWorkspace(enabledWorkspace);
    const record = await createGraph('Allowed');
    expect(record.name).toBe('Allowed');

    const db = await initDB();
    expect(db.name).toBe(`mindflow-${enabledWorkspace.isolationTag}`);
    openedDbNames.add(db.name);
    db.close();
  });
});
