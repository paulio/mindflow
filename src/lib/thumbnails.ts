import {
  THUMBNAIL_WIDTH,
  THUMBNAIL_HEIGHT,
  THUMBNAIL_STATUSES,
  THUMBNAIL_TRIGGERS,
  ThumbnailCacheEntrySchema,
  ThumbnailCacheEntryValidationError,
} from '../../specs/009-the-home-library/contracts/thumbnail-cache-entry.schema';

import type {
  ThumbnailCacheEntry,
  ThumbnailStatus,
  ThumbnailTrigger,
} from '../../specs/009-the-home-library/contracts/thumbnail-cache-entry.schema';

import {
  THUMBNAIL_REFRESH_OUTCOMES,
  ThumbnailRefreshEventSchema,
  ThumbnailRefreshEventValidationError,
  createThumbnailRefreshLogContext,
} from '../../specs/009-the-home-library/contracts/thumbnail-refresh-event.schema';

import type {
  ThumbnailRefreshEvent,
  ThumbnailRefreshOutcome,
} from '../../specs/009-the-home-library/contracts/thumbnail-refresh-event.schema';

import { emitThumbnailRefreshEvent } from './events';

export {
  THUMBNAIL_WIDTH,
  THUMBNAIL_HEIGHT,
  THUMBNAIL_STATUSES,
  THUMBNAIL_TRIGGERS,
  ThumbnailCacheEntrySchema,
  ThumbnailCacheEntryValidationError,
  THUMBNAIL_REFRESH_OUTCOMES,
  ThumbnailRefreshEventSchema,
  ThumbnailRefreshEventValidationError,
  createThumbnailRefreshLogContext,
};

export type {
  ThumbnailCacheEntry,
  ThumbnailStatus,
  ThumbnailTrigger,
  ThumbnailRefreshEvent,
  ThumbnailRefreshOutcome,
};

export function logThumbnailRefreshEvent(event: ThumbnailRefreshEvent) {
  emitThumbnailRefreshEvent(event);
}
