# Data Model: Home Library Map Thumbnails

**Feature Branch**: `009-the-home-library`
**Source Spec**: [spec.md](./spec.md)
**Plan Reference**: [plan.md](./plan.md)

> Define entities, fields, relationships, validation rules, and lifecycle transitions that implementation and tests must honour.

## 1. Entities Overview

### 1.1 `MapLibraryEntry`
- **Purpose**: Represents each saved map surfaced on the Home/Library page.
- **Key Fields**:
  - `mapId` (string, UUID): Canonical identifier.
  - `name` (string): Display name.
  - `lastModifiedAt` (ISO timestamp): Latest edit time.
  - `thumbnail` (`MapThumbnailAsset | null`): Current thumbnail pointer.
  - `status` (`"ready" | "pending" | "unavailable" | "failed"`): Derived thumbnail state for UI badges.
- **Relationships**: One-to-one with `MapThumbnailAsset` via `mapId`.
- **Validation**: `mapId` unique; `status` computed from thumbnail lifecycle.

### 1.2 `MapThumbnailAsset`
- **Purpose**: Persisted PNG metadata and lifecycle information for Home/Library thumbnails.
- **Key Fields**:
  - `mapId` (string, FK → `MapLibraryEntry.mapId`)
  - `blobKey` (string): IndexedDB key referencing PNG blob store.
  - `width` (number): Fixed value 320.
  - `height` (number): Fixed value 180.
  - `status` (`"queued" | "refreshing" | "ready" | "failed"`)
  - `updatedAt` (ISO timestamp): Last successful refresh completion.
  - `sourceExportAt` (ISO timestamp): Export completion timestamp used for comparison.
  - `trigger` (`"export" | "close" | "idle"`): Cause for the last refresh attempt.
  - `retryCount` (0–1): Number of automatic retries executed after failure.
  - `failureReason` (string | null): Machine-readable failure summary.
  - `byteSize` (number): PNG size in bytes for eviction metrics.
- **Validation Rules**:
  - `width`/`height` must equal 320×180.
  - `retryCount` max 1 (initial attempt + one retry = 2 total attempts).
  - `status === "failed"` requires `failureReason` present.
  - `status === "ready"` requires blob entry existing in IndexedDB blob store.

### 1.3 `ThumbnailRefreshEvent`
- **Purpose**: Structured console log payload emitted for success/failure diagnostics.
- **Fields**:
  - `mapId` (string)
  - `trigger` (`"export" | "close" | "idle"`)
  - `outcome` (`"success" | "failure"`)
  - `durationMs` (number)
  - `retryCount` (number)
  - `failureReason` (string | null)
  - `timestamp` (ISO string)
- **Usage**: Logged to console; optionally consumable by future telemetry pipelines.

## 2. Lifecycle & State Transitions
```
+-------------+      export/idle/close trigger      +---------------+
| queued      | ----------------------------------> | refreshing    |
+-------------+                                     +---------------+
        ^                                                    |
        | success (<=1s render)                              | success
        |                                                    v
        |                                          +---------------+
        |                                          | ready         |
        |                                          +---------------+
        | failure (retryCount < 1)                         |
        |                                                  | failure
        |                                                  v
        |                                          +---------------+
        |                                          | failed        |
        |                                          +---------------+
        | retryCount++ (max 1)                             |
        +--------------------------------------------------+
```
- Transition back to `queued` occurs when auto-retry scheduled (retryCount < 1).
- `failed` remains until user triggers new export/idle/close event; retryCount resets when re-queued.

## 3. Persistence Notes
- Thumbnail metadata stored in `thumbnails` object store keyed by `mapId`.
- PNG blobs stored in separate `thumbnail-blobs` store keyed by `blobKey` for streaming updates.
- Eviction manager operates on aggregate `byteSize` sum; when ≥10 MB, delete entries ordered by oldest `updatedAt` while ensuring blob and metadata removal remain atomic.
- Schema version bump required if store structure changes; plan to document migration steps in contract tests.

## 4. Validation & Observability Requirements
- Enforce schema via runtime validation in persistence helpers prior to write.
- Emit structured console log per `ThumbnailRefreshEvent` on success/failure.
- Capture eviction decisions in debug logs when entries removed (mapId, previous updatedAt, byteSize).

## 5. Open Items
- Idle-trigger batching or debounce window (to be finalized via research).
- Backoff timing between initial failure and retry attempt (default placeholder: 3 seconds, confirm in research).

> Update this document once research resolves open items; keep in sync with contract tests and implementation.
