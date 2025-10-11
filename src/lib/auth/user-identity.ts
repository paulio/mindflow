export type SessionState = 'active' | 'signedOut' | 'revoked';

export interface Claim {
  typ: string;
  val: string;
}

export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles?: string[] | null;
  claims?: Claim[] | null;
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
  debug?: IdentityDiagnostics;
}

const EMAIL_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress';
const TENANT_CLAIM = 'http://schemas.microsoft.com/identity/claims/tenantid';
const PICTURE_CLAIM = 'picture';
const UNKNOWN_TENANT_ID = 'tenant-unavailable';

export interface AvatarDiagnosticStep {
  step: string;
  details?: Record<string, unknown>;
}

export type AvatarDiagnosticResult = 'accepted' | 'missing' | 'rejected';

export type AvatarLoadState = 'none' | 'pending' | 'loaded' | 'error';

export interface AvatarDiagnosticsSummary {
  result: AvatarDiagnosticResult;
  finalUrl?: string;
  steps: AvatarDiagnosticStep[];
  source: 'claim' | 'none';
  timestamp: string;
  loadState: AvatarLoadState;
}

export interface IdentityDiagnostics {
  avatar: AvatarDiagnosticsSummary;
}

function getClaim(claims: Claim[] | undefined | null, type: string): string | undefined {
  if (!Array.isArray(claims) || claims.length === 0) return undefined;
  const match = claims.find(claim => claim.typ === type);
  return match?.val?.trim() ? match.val : undefined;
}

function logAvatar(message: string, details?: Record<string, unknown>): void {
  if (details && Object.keys(details).length > 0) {
    console.log('[avatar]', message, details);
  } else {
    console.log('[avatar]', message);
  }
}

function resolveAvatarFromClaims(claims: Claim[] | undefined | null): { url?: string; diagnostics: AvatarDiagnosticsSummary } {
  const timestamp = new Date().toISOString();
  const steps: AvatarDiagnosticStep[] = [];

  if (!Array.isArray(claims) || claims.length === 0) {
    steps.push({ step: 'No claims available for avatar resolution' });
    return {
      url: undefined,
      diagnostics: {
        result: 'missing',
        finalUrl: undefined,
        steps,
        source: 'none',
        timestamp,
        loadState: 'none',
      },
    };
  }

  const pictureClaim = claims.find(claim => claim.typ === PICTURE_CLAIM);

  if (!pictureClaim) {
    steps.push({ step: 'Picture claim not provided', details: { totalClaims: claims.length } });
    return {
      url: undefined,
      diagnostics: {
        result: 'missing',
        finalUrl: undefined,
        steps,
        source: 'none',
        timestamp,
        loadState: 'none',
      },
    };
  }

  const rawValue = pictureClaim.val ?? '';
  steps.push({ step: 'Picture claim located', details: { length: rawValue.length } });

  const trimmed = rawValue.trim();
  if (!trimmed) {
    steps.push({ step: 'Picture claim empty after trimming whitespace' });
    return {
      url: undefined,
      diagnostics: {
        result: 'rejected',
        finalUrl: undefined,
        steps,
        source: 'claim',
        timestamp,
        loadState: 'error',
      },
    };
  }

  const lower = trimmed.toLowerCase();
  steps.push({ step: 'Normalized picture claim', details: { preview: trimmed.slice(0, 60) } });

  if (lower.startsWith('https://')) {
    steps.push({ step: 'Accepted secure HTTPS avatar URL' });
    return {
      url: trimmed,
      diagnostics: {
        result: 'accepted',
        finalUrl: trimmed,
        steps,
        source: 'claim',
        timestamp,
        loadState: 'pending',
      },
    };
  }

  if (lower.startsWith('data:image/')) {
    steps.push({ step: 'Accepted data URI avatar payload' });
    return {
      url: trimmed,
      diagnostics: {
        result: 'accepted',
        finalUrl: trimmed,
        steps,
        source: 'claim',
        timestamp,
        loadState: 'pending',
      },
    };
  }

  steps.push({ step: 'Rejected picture claim due to unsupported scheme', details: { schemeSample: lower.slice(0, 20) } });
  return {
    url: undefined,
    diagnostics: {
      result: 'rejected',
      finalUrl: undefined,
      steps,
      source: 'claim',
      timestamp,
      loadState: 'error',
    },
  };
}

function reportAvatarDiagnostics(diagnostics: AvatarDiagnosticsSummary): void {
  logAvatar(diagnostics.result === 'accepted' ? 'Avatar accepted' : 'Avatar unavailable', {
    result: diagnostics.result,
    finalUrl: diagnostics.finalUrl,
    source: diagnostics.source,
    timestamp: diagnostics.timestamp,
  });
  diagnostics.steps.forEach(step => {
    logAvatar(step.step, step.details);
  });
}

export function appendAvatarDiagnosticStep(step: string, details?: Record<string, unknown>): void {
  logAvatar(step, details);
}

export function updateAvatarLoadState(state: AvatarLoadState, details?: Record<string, unknown>): void {
  logAvatar(`Load state changed to ${state}`, details);
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

  const tenantId = getClaim(claims, TENANT_CLAIM) ?? UNKNOWN_TENANT_ID;

  const email = getClaim(claims, EMAIL_CLAIM);
  const { url: avatarUrl, diagnostics } = resolveAvatarFromClaims(claims);

  reportAvatarDiagnostics(diagnostics);

  return {
    subjectId: userId,
    tenantId,
    displayName: userDetails,
    email,
    avatarUrl,
    lastLogin: new Date().toISOString(),
    sessionState: 'active',
    roles: Array.isArray(userRoles) ? [...userRoles] : [],
    debug: { avatar: diagnostics },
  };
}
