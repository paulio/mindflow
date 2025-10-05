# Contracts: Home Library Map Thumbnails

> Define schemas and contract-test expectations for thumbnail persistence and telemetry. Replace TODO markers with finalized definitions during Phase 1 execution.

## Files to Produce
- `thumbnail-cache-entry.schema.ts` — runtime schema (e.g., zod) or JSON schema describing IndexedDB record shape.
- `thumbnail-refresh-event.schema.ts` — schema for structured console log payloads.
- `thumbnail-contract.test.ts` — Vitest contract tests asserting schema validation and IndexedDB transaction behaviour.

## Schema Requirements
### Thumbnail Cache Entry
- `mapId`: string (UUID) — primary key.
- `status`: `"queued" | "refreshing" | "ready" | "failed"`.
- `blobKey`: string referencing PNG blob store.
- `width`: 320, `height`: 180.
- `retryCount`: integer 0–1.
- `failureReason`: nullable string when `status === "failed"`.
- `updatedAt`: ISO timestamp.
- `sourceExportAt`: ISO timestamp used to detect staleness.
- `trigger`: `"export" | "close" | "idle"`.
- `byteSize`: number (bytes) for eviction calculations.

### Thumbnail Refresh Event
- `mapId`: string.
- `trigger`: `"export" | "close" | "idle"`.
- `outcome`: `"success" | "failure"`.
- `durationMs`: number.
- `retryCount`: number (0–1 expected).
- `failureReason`: nullable string when `outcome === "failure"`.
- `timestamp`: ISO timestamp.

## Contract Test Expectations
- Schema validation rejects records missing required fields or exceeding retry limits.
- IndexedDB transaction mock ensures write + blob insert succeed atomically; failures roll back metadata.
- Eviction routine removes LRU entries once aggregated `byteSize` ≥ 10 MB.
- Structured console log assertions verify payload fields and severity when refreshing succeeds/fails.
