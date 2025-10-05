import { THUMBNAIL_TRIGGERS, ThumbnailTrigger, SchemaIssue } from './thumbnail-cache-entry.schema';

export const THUMBNAIL_REFRESH_OUTCOMES = ['success', 'failure'] as const;
export type ThumbnailRefreshOutcome = (typeof THUMBNAIL_REFRESH_OUTCOMES)[number];

export interface ThumbnailRefreshEvent {
  mapId: string;
  trigger: ThumbnailTrigger;
  outcome: ThumbnailRefreshOutcome;
  durationMs: number;
  retryCount: number;
  failureReason: string | null;
  timestamp: string;
}

export type ThumbnailRefreshEventResult =
  | { success: true; data: ThumbnailRefreshEvent }
  | { success: false; error: { issues: SchemaIssue[] } };

const ISO_DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function isIsoDateTime(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  if (!ISO_DATE_TIME_REGEX.test(value)) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validate(value: unknown): ThumbnailRefreshEventResult {
  if (typeof value !== 'object' || value === null) {
    return {
      success: false,
      error: {
        issues: [{ message: 'Expected thumbnail refresh event to be an object', path: [] }],
      },
    };
  }

  const record = value as Record<string, unknown>;
  const issues: SchemaIssue[] = [];

  const mapId = record.mapId;
  const trigger = record.trigger;
  const outcome = record.outcome;
  const durationMs = record.durationMs;
  const retryCount = record.retryCount;
  const failureReason = record.failureReason;
  const timestamp = record.timestamp;

  if (!isNonEmptyString(mapId)) {
    issues.push({ message: 'mapId must be a non-empty string', path: ['mapId'] });
  }

  if (typeof trigger !== 'string' || !THUMBNAIL_TRIGGERS.includes(trigger as ThumbnailTrigger)) {
    issues.push({ message: `trigger must be one of: ${THUMBNAIL_TRIGGERS.join(', ')}`, path: ['trigger'] });
  }

  if (typeof outcome !== 'string' || !THUMBNAIL_REFRESH_OUTCOMES.includes(outcome as ThumbnailRefreshOutcome)) {
    issues.push({ message: `outcome must be one of: ${THUMBNAIL_REFRESH_OUTCOMES.join(', ')}`, path: ['outcome'] });
  }

  if (!isFiniteNumber(durationMs) || durationMs < 0) {
    issues.push({ message: 'durationMs must be a finite, non-negative number', path: ['durationMs'] });
  }

  if (!Number.isInteger(retryCount) || (typeof retryCount === 'number' && (retryCount < 0 || retryCount > 1))) {
    issues.push({ message: 'retryCount must be an integer between 0 and 1', path: ['retryCount'] });
  }

  if (failureReason !== null && failureReason !== undefined && typeof failureReason !== 'string') {
    issues.push({ message: 'failureReason must be a string or null', path: ['failureReason'] });
  }

  const outcomeValue = typeof outcome === 'string' ? (outcome as ThumbnailRefreshOutcome) : null;

  if (outcomeValue === 'failure') {
    if (!isNonEmptyString(failureReason)) {
      issues.push({ message: 'failureReason must be provided when outcome is failure', path: ['failureReason'] });
    }
  } else if (typeof failureReason === 'string' && failureReason.trim().length > 0) {
    issues.push({ message: 'failureReason must be null unless outcome is failure', path: ['failureReason'] });
  }

  if (!isIsoDateTime(timestamp)) {
    issues.push({ message: 'timestamp must be an ISO-8601 timestamp', path: ['timestamp'] });
  }

  if (issues.length > 0) {
    return { success: false, error: { issues } };
  }

  const parsed: ThumbnailRefreshEvent = {
    mapId: mapId as string,
    trigger: trigger as ThumbnailTrigger,
    outcome: outcome as ThumbnailRefreshOutcome,
    durationMs: durationMs as number,
    retryCount: retryCount as number,
    failureReason: outcomeValue === 'failure' ? (failureReason as string) : null,
    timestamp: timestamp as string,
  };

  return { success: true, data: parsed };
}

export class ThumbnailRefreshEventValidationError extends Error {
  issues: SchemaIssue[];

  constructor(issues: SchemaIssue[]) {
    super(issues.map((issue) => issue.message).join('; '));
    this.name = 'ThumbnailRefreshEventValidationError';
    this.issues = issues;
  }
}

export const ThumbnailRefreshEventSchema = {
  parse(value: unknown): ThumbnailRefreshEvent {
    const result = validate(value);
    if (result.success) {
      return result.data;
    }

    throw new ThumbnailRefreshEventValidationError(result.error.issues);
  },

  safeParse(value: unknown): ThumbnailRefreshEventResult {
    return validate(value);
  },
} as const;

export interface ThumbnailRefreshLogContext {
  level: 'info' | 'error';
  message: string;
  payload: ThumbnailRefreshEvent;
}

export function createThumbnailRefreshLogContext(event: ThumbnailRefreshEvent): ThumbnailRefreshLogContext {
  const baseMessage = `thumbnail refresh ${event.outcome}`;
  const detail = `mapId=${event.mapId} trigger=${event.trigger} durationMs=${event.durationMs} retryCount=${event.retryCount}`;
  const reason = event.outcome === 'failure' && event.failureReason ? ` failureReason=${event.failureReason}` : '';

  return {
    level: event.outcome === 'success' ? 'info' : 'error',
    message: `${baseMessage} (${detail}${reason ? ` ${reason}` : ''})`,
    payload: event,
  };
}
