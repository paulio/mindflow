import React from 'react';

export type ThumbnailStatusBadgeState = 'ready' | 'loading' | 'queued' | 'failed';

export interface ThumbnailStatusBadgeProps {
  state: ThumbnailStatusBadgeState;
  label: string;
}

export const ThumbnailStatusBadge: React.FC<ThumbnailStatusBadgeProps> = ({ state, label }) => (
  <span className="mf-thumbnail-status-badge" data-state={state}>
    {label}
  </span>
);

export default ThumbnailStatusBadge;
