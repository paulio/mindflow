import { describe, expect, it } from 'vitest';
import { parseUserIdentity } from '../../src/lib/auth/user-identity';
import { createMapWorkspace, markWorkspaceDisabled } from '../../src/lib/workspace/map-workspace';

interface Claim {
  typ: string;
  val: string;
}

interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles?: string[] | null;
  claims?: Claim[] | null;
}

const baseProfile: ClientPrincipal = {
  identityProvider: 'aad',
  userId: '00000000-0000-4000-8000-000000000001',
  userDetails: 'Adele Vance',
  userRoles: ['authenticated'],
  claims: [
    { typ: 'name', val: 'Adele Vance' },
    { typ: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress', val: 'adele@contoso.com' },
    { typ: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier', val: '00000000-0000-4000-8000-000000000001' },
    { typ: 'http://schemas.microsoft.com/identity/claims/tenantid', val: '11111111-2222-3333-4444-555555555555' },
    { typ: 'picture', val: 'https://graph.microsoft.com/v1.0/me/photo/$value' },
  ],
};

describe('UserIdentity parsing', () => {
  it('extracts required fields and normalizes avatar', () => {
    const identity = parseUserIdentity({ clientPrincipal: baseProfile });
    expect(identity.subjectId).toBe(baseProfile.userId);
    expect(identity.tenantId).toBe('11111111-2222-3333-4444-555555555555');
    expect(identity.displayName).toBe('Adele Vance');
    expect(identity.email).toBe('adele@contoso.com');
    expect(identity.avatarUrl).toBe('https://graph.microsoft.com/v1.0/me/photo/$value');
    expect(identity.sessionState).toBe('active');
  });

  it('drops non-https avatar URLs and missing claims', () => {
    const identity = parseUserIdentity({
		clientPrincipal: {
			...baseProfile,
			userDetails: 'No Avatar User',
      claims: (baseProfile.claims ?? [])
				.filter((claim: Claim) => claim.typ !== 'picture')
				.concat({
					typ: 'picture',
					val: 'http://insecure/avatar.png',
				}),
		},
	});

    expect(identity.avatarUrl).toBeUndefined();
  });

  it('retains data URI avatars', () => {
    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
    const identity = parseUserIdentity({
      clientPrincipal: {
        ...baseProfile,
        userDetails: 'Data Uri User',
        claims: (baseProfile.claims ?? [])
          .filter((claim: Claim) => claim.typ !== 'picture')
          .concat({
            typ: 'picture',
            val: dataUri,
          }),
      },
    });

    expect(identity.avatarUrl).toBe(dataUri);
  });

  it('gracefully handles profiles without claims or roles', () => {
    const identity = parseUserIdentity({
      clientPrincipal: {
        identityProvider: 'aad',
        userId: baseProfile.userId,
        userDetails: 'Minimal Claims User',
        userRoles: null,
        claims: null,
      },
    });

    expect(identity.displayName).toBe('Minimal Claims User');
    expect(identity.roles).toEqual([]);
    expect(identity.email).toBeUndefined();
    expect(identity.tenantId).toBe('tenant-unavailable');
  });
});

describe('Map workspace isolation', () => {
  it('derives isolation tag and default workspace state', () => {
    const identity = parseUserIdentity({ clientPrincipal: baseProfile });
    const workspace = createMapWorkspace(identity);

    expect(workspace.workspaceId).toBe(identity.subjectId);
    expect(workspace.isolationTag).toMatch(/^user_[a-f0-9]{12}$/);
    expect(workspace.mapsStore).toBe(`maps_${workspace.isolationTag}`);
    expect(workspace.disabledAccessFlag).toBe(false);
  });

  it('marks workspace disabled without mutating original state', () => {
    const identity = parseUserIdentity({ clientPrincipal: baseProfile });
    const workspace = createMapWorkspace(identity);
    const disabledWorkspace = markWorkspaceDisabled(workspace);

    expect(disabledWorkspace).not.toBe(workspace);
    expect(disabledWorkspace.disabledAccessFlag).toBe(true);
    expect(workspace.disabledAccessFlag).toBe(false);
  });
});
