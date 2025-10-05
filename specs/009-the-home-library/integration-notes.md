# Integration Notes – IndexedDB & Graph Store

> Task T002: Outline integration points for thumbnail caching across `src/lib/indexeddb.ts` and `src/state/graph-store.tsx`.

## `src/lib/indexeddb.ts`

- **Upgrade hook**: `initDB` currently bumps to version 2; add a new object store (e.g., `graphThumbnails`) with composite key `[graphId, id]` and indexes for `graphId`, `lastAccessed`, and `byteSize`. Ensure upgrade logic is additive and backwards compatible.
- **Snapshot helpers**: `getGraphSnapshot` / `getGraphSnapshots` load graph, nodes, edges, references; extend to optionally include thumbnail metadata without loading blobs (separate read) to avoid payload bloat.
- **Persistence API surface**: Introduce helpers such as `putThumbnail`, `getThumbnail`, `touchThumbnail`, `deleteThumbnail`, `listThumbnails`, and `trimThumbnailsToQuota`. Each should validate payloads against `thumbnail-cache-entry` schema prior to write.
- **LRU eviction**: Add shared utility that calculates current total byte usage (aggregating `byteSize`) and prunes least-recently-used entries when exceeding 10 MB. Make eviction transactional and emit structured logging payloads.
- **Retry metadata**: Ensure helpers capture `retryCount`, `failureReason`, and timestamps. Consider storing `lastAttemptedAt` separately from `updatedAt` for telemetry accuracy.
- **Export integration**: Provide `persistThumbnailFromBlob(mapId, blob, trigger)` helper that writes the blob, updates metadata, calls eviction, and returns normalized entry/status for graph store consumption.
- **Deletion paths**: Update `deleteGraph` to remove associated thumbnail entries/blobs, and integrate with `persistNodeDeletion` if an entire graph is purged.
- **Schema enforcement**: All public helpers should run runtime validation (zod or equivalent) using schemas defined under `specs/009-the-home-library/contracts/` and surface descriptive errors for tests.

## `src/state/graph-store.tsx`

- **State additions**: Extend `GraphState` with thumbnail cache slice (status map keyed by graphId, e.g., `{ state: 'idle' | 'refreshing' | 'retry' | 'failed', updatedAt, failureReason }`). Persist minimal metadata in Zustand to drive UI.
- **Refresh queue**: Introduce action queue/executor for thumbnail refresh requests triggered by export completion, idle timer, and editor close. Enforce single retry limit and debounce redundant requests.
- **Event wiring**: Hook into existing events (`events.emit`) for `graph:created`, `graph:loaded`, `node:updated`, `exportMaps`, etc., to enqueue refresh when content changes or exports finish.
- **Async helpers**: Create async actions like `requestThumbnailRefresh(mapId, trigger)` that call new IndexedDB helpers, update state, and emit structured telemetry events.
- **Idle/close triggers**: Provide callbacks consumed by `useAutosave` to run refresh when editor becomes idle or closed, coordinating with autosave scheduler.
- **Selection/library sync**: Ensure library selection state refreshes after thumbnails update by reusing `refreshList` or targeted map metadata patch.
- **Error handling**: Capture helper errors, update state with `failed` status, schedule retry (single additional attempt), then surface telemetry/logging via new event bus schemas.
- **Cleanup**: Reset thumbnail state when graphs are deleted or imports cancelled, mirroring existing graph/reference cleanup flows.
- **Testing seams**: Expose internal queue/state for unit tests (`createGraphStore` analog or dedicated exports) to assert retry and status transitions.
