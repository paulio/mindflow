import React from 'react';
import type { UserIdentity } from '../../lib/auth/user-identity';
import { appendAvatarDiagnosticStep, updateAvatarLoadState } from '../../lib/auth/user-identity';

export interface UserAvatarProps {
  identity: Pick<UserIdentity, 'subjectId' | 'displayName' | 'avatarUrl'> | null;
  size?: number;
  ariaLabel?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ identity, size = 36, ariaLabel }) => {
  const [hasImageError, setHasImageError] = React.useState(false);
  const [imageSource, setImageSource] = React.useState<string | null>(null);
  const objectUrlRef = React.useRef<string | null>(null);
  const avatarUrl = identity?.avatarUrl ?? null;

  React.useEffect(() => {
    setHasImageError(false);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!identity?.subjectId) {
      setImageSource(null);
      updateAvatarLoadState('none', { reason: 'no-subject-id' });
      appendAvatarDiagnosticStep('Avatar load skipped: no subject identifier available', {});
      return;
    }

    if (!avatarUrl) {
      setImageSource(null);
      appendAvatarDiagnosticStep('Avatar URL not available for subject', {
        subjectId: identity.subjectId,
      });
      updateAvatarLoadState('none', { reason: 'no-avatar-url' });
      return;
    }

    setImageSource(avatarUrl);
    appendAvatarDiagnosticStep('Initializing avatar from claim URL', {
      subjectId: identity.subjectId,
      preview: avatarUrl.slice(0, 80),
    });
    updateAvatarLoadState('pending', { source: 'claim-url' });
  }, [identity?.subjectId, avatarUrl]);

  React.useEffect(() => {
    if (!identity?.subjectId || !avatarUrl) {
      return;
    }

    if (!avatarUrl.startsWith('https://')) {
      appendAvatarDiagnosticStep('Skipping fetch probe for non-HTTPS avatar URL', {
        scheme: avatarUrl.split(':')[0] ?? 'unknown',
      });
      return;
    }

    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(avatarUrl);
    } catch (error) {
      appendAvatarDiagnosticStep('Unable to parse avatar URL for fetch probe', {
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }

  const controller = new AbortController();
  const startedAt = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : undefined;
    appendAvatarDiagnosticStep('Probing avatar URL with fetch()', {
      host: parsedUrl.host,
      pathname: parsedUrl.pathname,
    });
    updateAvatarLoadState('pending', { source: 'fetch-probe' });

    fetch(avatarUrl, {
      method: 'GET',
      headers: { Accept: 'image/*' },
      credentials: 'include',
      mode: 'cors',
      signal: controller.signal,
    })
      .then(async response => {
        const durationMs = startedAt !== undefined && typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? Math.round(performance.now() - startedAt)
          : undefined;
        appendAvatarDiagnosticStep('Fetch probe completed', {
          status: response.status,
          ok: response.ok,
          durationMs,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          appendAvatarDiagnosticStep('Fetch probe returned non-success status', {
            status: response.status,
            preview: errorText.slice(0, 120),
          });
          updateAvatarLoadState('error', { reason: 'fetch-status', status: response.status });
          return;
        }

        const blob = await response.blob();
        appendAvatarDiagnosticStep('Fetch probe succeeded; creating object URL', {
          contentType: response.headers.get('content-type') ?? 'unknown',
          size: blob.size,
        });

        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }

        const nextObjectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = nextObjectUrl;
        setImageSource(nextObjectUrl);
        updateAvatarLoadState('pending', { source: 'object-url' });
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          appendAvatarDiagnosticStep('Fetch probe aborted before completion', {});
          return;
        }
        appendAvatarDiagnosticStep('Fetch probe failed due to network or CORS error', {
          message: error instanceof Error ? error.message : String(error),
        });
        updateAvatarLoadState('error', { reason: 'fetch-failed' });
      });

    return () => {
      controller.abort();
    };
  }, [identity?.subjectId, avatarUrl]);

  const borderColor = 'var(--color-border, #2a2a30)';
  const backgroundColor = 'var(--color-surface, #1b1b1f)';
  const label = ariaLabel || (identity?.displayName ? `${identity.displayName} avatar` : 'User avatar placeholder');

  const isDevEnvironment = (() => {
    try {
      return Boolean(import.meta.env?.DEV);
    } catch {
      return false;
    }
  })();

  const resolvedImageSource = !hasImageError ? imageSource : null;

  if (resolvedImageSource) {
    const handleImageError = () => {
      setHasImageError(true);
      if (isDevEnvironment) {
        console.log('[avatar] Failed to load user avatar. Falling back to placeholder.', { src: resolvedImageSource });
      }
      appendAvatarDiagnosticStep('Image element onError fired', { src: resolvedImageSource });
      updateAvatarLoadState('error', { reason: 'img-onerror' });
    };

    const handleImageLoad = () => {
      if (isDevEnvironment) {
        console.log('[avatar] Loaded user avatar image successfully.', { src: resolvedImageSource });
      }
      appendAvatarDiagnosticStep('Image element loaded successfully', { src: resolvedImageSource });
      updateAvatarLoadState('loaded', { source: objectUrlRef.current ? 'object-url' : 'claim-url' });
    };

    return (
      <span
        role="img"
        aria-label={label}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          border: `1px solid ${borderColor}`,
          backgroundColor,
          boxShadow: '0 1px 2px rgba(0,0,0,0.35)'
        }}
      >
        <img
          src={resolvedImageSource}
          alt=""
          referrerPolicy="no-referrer"
          onError={handleImageError}
          onLoad={handleImageLoad}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      </span>
    );
  }

  const viewBox = 32; // square viewBox for consistent scaling
  const ratio = size / viewBox;

  return (
    <span
      role="img"
      aria-label={label}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${borderColor}`,
        backgroundColor,
        boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
        color: 'var(--color-text, #f5f5f5)'
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${viewBox} ${viewBox}`}
        role="presentation"
        aria-hidden="true"
      >
        <circle cx={16} cy={16} r={15.5} fill="none" stroke={borderColor} strokeWidth={1 / ratio} />
        <circle cx={16} cy={13} r={6.2} fill="currentColor" fillOpacity={0.65} stroke="currentColor" strokeOpacity={0.85} strokeWidth={1.25 / ratio} />
        <path
          d="M7 24.5c2.7-4.1 6.2-6.2 9-6.2s6.3 2.1 9 6.2v2.5H7v-2.5z"
          fill="currentColor"
          fillOpacity={0.45}
        />
      </svg>
    </span>
  );
};

export default UserAvatar;
