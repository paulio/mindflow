export type SessionState = 'active' | 'signedOut' | 'revoked';

export interface Claim {
  typ: string;
  val: string;
}

export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
  claims: Claim[];
}

export interface StaticWebAppsProfile {
  clientPrincipal: ClientPrincipal | null;
}

export interface UserIdentity {
  subjectId: string;
  tenantId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  lastLogin: string;
  sessionState: SessionState;
  roles: string[];
}

const EMAIL_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress';
const TENANT_CLAIM = 'http://schemas.microsoft.com/identity/claims/tenantid';
const PICTURE_CLAIM = 'picture';

function getClaim(claims: Claim[], type: string): string | undefined {
  const match = claims.find(claim => claim.typ === type);
  return match?.val?.trim() ? match.val : undefined;
}

function sanitizeAvatar(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  return trimmed.toLowerCase().startsWith('https://') ? trimmed : undefined;
}

export function parseUserIdentity(profile: StaticWebAppsProfile): UserIdentity {
  const principal = profile.clientPrincipal;
  if (!principal) {
    throw new Error('Missing Azure Static Web Apps client principal');
  }

  if (principal.identityProvider !== 'aad') {
    throw new Error(`Unsupported identity provider: ${principal.identityProvider}`);
  }

  const { userId, userDetails, userRoles, claims } = principal;

  if (!userId || !userId.trim()) {
    throw new Error('Client principal missing userId');
  }

  if (!userDetails || !userDetails.trim()) {
    throw new Error('Client principal missing display name');
  }

  const tenantId = getClaim(claims, TENANT_CLAIM);
  if (!tenantId) {
    throw new Error('Client principal missing tenant claim');
  }

  const email = getClaim(claims, EMAIL_CLAIM);
  const avatarUrl = sanitizeAvatar(getClaim(claims, PICTURE_CLAIM));

  return {
    subjectId: userId,
    tenantId,
    displayName: userDetails,
    email,
    avatarUrl,
    lastLogin: new Date().toISOString(),
    sessionState: 'active',
    roles: [...userRoles],
  };
}
