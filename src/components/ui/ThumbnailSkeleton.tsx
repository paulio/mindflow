import React from 'react';

export interface ThumbnailSkeletonProps {
  ariaLabel?: string;
}

export const ThumbnailSkeleton: React.FC<ThumbnailSkeletonProps> = ({ ariaLabel }) => (
  <div
    className="mf-thumbnail-skeleton"
    role={ariaLabel ? 'img' : undefined}
    aria-label={ariaLabel ?? undefined}
    aria-hidden={ariaLabel ? undefined : true}
  />
);

export default ThumbnailSkeleton;
