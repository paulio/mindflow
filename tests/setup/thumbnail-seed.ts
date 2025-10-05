import { THUMBNAIL_QUOTA_BYTES, putThumbnail } from '../../src/lib/indexeddb';
import type { PutThumbnailResult } from '../../src/lib/indexeddb';
import type { ThumbnailTrigger } from '../../src/lib/thumbnails';

const BASE_EXPORT_AT = Date.parse('2025-01-01T00:00:00.000Z');
const DEFAULT_BLOB_SIZE = 512 * 1024; // 512 KB placeholder blob
const DEFAULT_TRIGGER: ThumbnailTrigger = 'export:complete';

function createDeterministicBlob(size: number): Blob {
  const buffer = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) {
    buffer[i] = (i * 31) % 256;
  }
  return new Blob([buffer], { type: 'image/png' });
}

export interface SeedThumbnailOptions {
  sizeBytes?: number;
  quotaBytes?: number;
  trigger?: ThumbnailTrigger;
  startIndex?: number;
}

export async function seedThumbnailCache(count: number, options: SeedThumbnailOptions = {}): Promise<PutThumbnailResult[]> {
  const {
    sizeBytes = DEFAULT_BLOB_SIZE,
    quotaBytes = THUMBNAIL_QUOTA_BYTES,
    trigger = DEFAULT_TRIGGER,
    startIndex = 0,
  } = options;

  const results: PutThumbnailResult[] = [];

  for (let index = 0; index < count; index += 1) {
    const mapIndex = startIndex + index;
    const mapId = `eviction-map-${mapIndex.toString().padStart(4, '0')}`;
    const exportAt = new Date(BASE_EXPORT_AT + mapIndex * 60_000).toISOString();
    const blob = createDeterministicBlob(sizeBytes);
    const result = await putThumbnail({
      mapId,
      blob,
      trigger,
      sourceExportAt: exportAt,
      quotaBytes,
    });
    results.push(result);
  }

  return results;
}

export interface SeedToExceedQuotaOptions extends Omit<SeedThumbnailOptions, 'startIndex'> {
  extraEntries?: number;
}

export async function seedThumbnailsToExceedQuota(options: SeedToExceedQuotaOptions = {}): Promise<PutThumbnailResult[]> {
  const { sizeBytes = DEFAULT_BLOB_SIZE, quotaBytes = THUMBNAIL_QUOTA_BYTES, extraEntries = 2, trigger } = options;
  const baselineCount = Math.ceil(quotaBytes / sizeBytes) + extraEntries;
  return seedThumbnailCache(baselineCount, { sizeBytes, quotaBytes, trigger });
}
