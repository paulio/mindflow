export const THUMBNAIL_WIDTH = 320;
export const THUMBNAIL_HEIGHT = 180;

export const THUMBNAIL_STATUSES = ['queued', 'pending', 'refreshing', 'ready', 'failed'] as const;
export type ThumbnailStatus = (typeof THUMBNAIL_STATUSES)[number];

export const THUMBNAIL_TRIGGERS = ['export', 'export:complete', 'close', 'idle', 'library:open'] as const;
export type ThumbnailTrigger = (typeof THUMBNAIL_TRIGGERS)[number];

export interface ThumbnailCacheEntry {
  mapId: string;
  status: ThumbnailStatus;
  blobKey: string;
  width: typeof THUMBNAIL_WIDTH;
  height: typeof THUMBNAIL_HEIGHT;
  byteSize: number;
  updatedAt: string;
  lastAccessed: string;
  sourceExportAt: string;
  trigger: ThumbnailTrigger;
  retryCount: 0 | 1;
  failureReason: string | null;
}

export interface SchemaIssue {
  message: string;
  path: (string | number)[];
}

export interface SchemaFailure {
  success: false;
  error: { issues: SchemaIssue[] };
}

export interface SchemaSuccess {
  success: true;
  data: ThumbnailCacheEntry;
}

type SchemaResult = SchemaSuccess | SchemaFailure;

const ISO_DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function isIsoDateTime(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  if (!ISO_DATE_TIME_REGEX.test(value)) {
    return false;
  }

  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function validate(value: unknown): SchemaResult {
  if (typeof value !== 'object' || value === null) {
    return {
      success: false,
      error: { issues: [{ message: 'Expected thumbnail cache entry to be an object', path: [] }] },
    };
  }

  const entry = value as Record<string, unknown>;
  const issues: SchemaIssue[] = [];

  const mapId = entry.mapId;
  const status = entry.status;
  const blobKey = entry.blobKey;
  const width = entry.width;
  const height = entry.height;
  const byteSize = entry.byteSize;
  const updatedAt = entry.updatedAt;
  const lastAccessed = entry.lastAccessed;
  const sourceExportAt = entry.sourceExportAt;
  const trigger = entry.trigger;
  const retryCount = entry.retryCount;
  const failureReason = entry.failureReason;

  if (!isNonEmptyString(mapId)) {
    issues.push({ message: 'mapId must be a non-empty string', path: ['mapId'] });
  }

  if (typeof status !== 'string' || !THUMBNAIL_STATUSES.includes(status as ThumbnailStatus)) {
    issues.push({ message: `status must be one of: ${THUMBNAIL_STATUSES.join(', ')}`, path: ['status'] });
  }

  if (!isNonEmptyString(blobKey)) {
    issues.push({ message: 'blobKey must be a non-empty string', path: ['blobKey'] });
  }

  if (width !== THUMBNAIL_WIDTH) {
    issues.push({ message: `width must equal ${THUMBNAIL_WIDTH}`, path: ['width'] });
  }

  if (height !== THUMBNAIL_HEIGHT) {
    issues.push({ message: `height must equal ${THUMBNAIL_HEIGHT}`, path: ['height'] });
  }

  if (!isPositiveInteger(byteSize)) {
    issues.push({ message: 'byteSize must be a positive integer', path: ['byteSize'] });
  }

  if (!isIsoDateTime(updatedAt)) {
    issues.push({ message: 'updatedAt must be an ISO-8601 timestamp', path: ['updatedAt'] });
  }

  if (!isIsoDateTime(lastAccessed)) {
    issues.push({ message: 'lastAccessed must be an ISO-8601 timestamp', path: ['lastAccessed'] });
  }

  if (!isIsoDateTime(sourceExportAt)) {
    issues.push({ message: 'sourceExportAt must be an ISO-8601 timestamp', path: ['sourceExportAt'] });
  }

  if (typeof trigger !== 'string' || !THUMBNAIL_TRIGGERS.includes(trigger as ThumbnailTrigger)) {
    issues.push({ message: `trigger must be one of: ${THUMBNAIL_TRIGGERS.join(', ')}`, path: ['trigger'] });
  }

  if (typeof retryCount !== 'number' || !Number.isInteger(retryCount) || retryCount < 0 || retryCount > 1) {
    issues.push({ message: 'retryCount must be 0 or 1', path: ['retryCount'] });
  }

  const statusValue = typeof status === 'string' ? (status as ThumbnailStatus) : null;

  if (failureReason !== null && failureReason !== undefined && typeof failureReason !== 'string') {
    issues.push({ message: 'failureReason must be a string or null', path: ['failureReason'] });
  }

  if (statusValue === 'failed') {
    if (!isNonEmptyString(failureReason)) {
      issues.push({ message: 'failureReason must be provided when status is failed', path: ['failureReason'] });
    }
  } else if (typeof failureReason === 'string' && failureReason.trim().length > 0) {
    issues.push({ message: 'failureReason must be null unless status is failed', path: ['failureReason'] });
  }

  if (issues.length > 0) {
    return { success: false, error: { issues } };
  }

  const parsed: ThumbnailCacheEntry = {
    mapId: mapId as string,
    status: statusValue as ThumbnailStatus,
    blobKey: blobKey as string,
    width: THUMBNAIL_WIDTH,
    height: THUMBNAIL_HEIGHT,
    byteSize: byteSize as number,
    updatedAt: updatedAt as string,
    lastAccessed: lastAccessed as string,
    sourceExportAt: sourceExportAt as string,
    trigger: trigger as ThumbnailTrigger,
    retryCount: retryCount as 0 | 1,
    failureReason: (statusValue === 'failed' ? (failureReason as string) : null),
  };

  return { success: true, data: parsed };
}

export class ThumbnailCacheEntryValidationError extends Error {
  issues: SchemaIssue[];

  constructor(issues: SchemaIssue[]) {
    super(issues.map((issue) => issue.message).join('; '));
    this.name = 'ThumbnailCacheEntryValidationError';
    this.issues = issues;
  }
}

export const ThumbnailCacheEntrySchema = {
  parse(value: unknown): ThumbnailCacheEntry {
    const result = validate(value);
    if (result.success) {
      return result.data;
    }

    throw new ThumbnailCacheEntryValidationError(result.error.issues);
  },

  safeParse(value: unknown): SchemaResult {
    return validate(value);
  },
} as const;
