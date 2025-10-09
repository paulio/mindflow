import React from 'react';
import type { UserIdentity } from '../../lib/auth/user-identity';

export interface UserAvatarProps {
  identity: Pick<UserIdentity, 'displayName' | 'avatarUrl'> | null;
  size?: number;
  ariaLabel?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ identity, size = 36, ariaLabel }) => {
  const borderColor = 'var(--color-border, #2a2a30)';
  const backgroundColor = 'var(--color-surface, #1b1b1f)';
  const label = ariaLabel || (identity?.displayName ? `${identity.displayName} avatar` : 'User avatar placeholder');

  if (identity?.avatarUrl) {
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
          src={identity.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
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
