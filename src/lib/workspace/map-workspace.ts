import type { UserIdentity } from '../auth/user-identity';

export interface MapWorkspace {
  workspaceId: string;
  mapsStore: string;
  isolationTag: string;
  lastSynced: string;
  disabledAccessFlag: boolean;
}

function deriveIsolationTag(subjectId: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;

  for (const char of subjectId) {
    hash ^= BigInt(char.charCodeAt(0));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }

  const hex = hash.toString(16).padStart(16, '0').slice(0, 12);
  return `user_${hex}`;
}

export function createMapWorkspace(identity: UserIdentity): MapWorkspace {
  const isolationTag = deriveIsolationTag(identity.subjectId);
  const timestamp = new Date().toISOString();

  return {
    workspaceId: identity.subjectId,
    isolationTag,
    mapsStore: `maps_${isolationTag}`,
    lastSynced: timestamp,
    disabledAccessFlag: false,
  };
}

export function markWorkspaceDisabled(workspace: MapWorkspace): MapWorkspace {
  return {
    ...workspace,
    disabledAccessFlag: true,
  };
}
