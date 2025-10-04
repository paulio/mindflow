# Data Model: Map Library Export & Import

## MapSnapshot
- **Purpose**: Represents a serialized graph captured during export or staged for import.
- **Fields**:
  - `id: string` – Unique node identifier (matches persisted graph id).
  - `name: string` – Display title shown in the Map Library.
  - `updatedAt: string (ISO8601)` – Last modified timestamp.
  - `schemaVersion: number` – Version of map serialization schema.
  - `payloadPath: string` – Relative path inside ZIP (e.g., `maps/{id}.json`).
  - `metadata: object` – Key/value pairs (front/back flags, theme overrides, viewport).
- **Relationships**: Listed inside `ExportManifest.maps[]`; referenced by `ImportSession.entries[].snapshot`.
- **Validation**: `id` and `payloadPath` required; `schemaVersion` must match manifest's supported set.

## ExportManifest
- **Purpose**: Root manifest describing archive contents.
- **Fields**:
  - `manifestVersion: number` – Format version (initially `1`).
  - `generatedAt: string (ISO8601)` – Time export generated.
  - `appVersion: string` – Semantic version of Mindflow.
  - `maps: MapSnapshotSummary[]` – Array describing each exported map.
  - `totalMaps: number` – Count, must equal `maps.length`.
  - `notes?: string` – Optional free-form note (reserved for future use).
- **MapSnapshotSummary Fields**:
  - `id: string`
  - `name: string`
  - `schemaVersion: number`
  - `payloadPath: string`
  - `lastModified: string`
- **Relationships**: Bundled as `manifest.json` at ZIP root; referenced during import validation.
- **Validation**: Validate counts, unique `id`, ensure referenced payload files exist.

## ImportSession
- **Purpose**: Tracks state while importing a ZIP archive.
- **Fields**:
  - `sessionId: string`
  - `startedAt: string`
  - `status: "pending" | "confirming" | "applying" | "completed" | "cancelled" | "failed"`
  - `entries: ImportEntry[]` – One per map discovered.
  - `conflictPolicy: "prompt"` – Current policy (prompt per conflict per spec).
  - `summary?: ImportSummary` – Populated after completion.
- **ImportEntry Fields**:
  - `snapshot: MapSnapshot`
  - `conflict: boolean`
  - `resolution?: ConflictResolutionResult`
  - `migrationAttempted: boolean`
  - `migrationSucceeded?: boolean`
- **Validation**: `sessionId` unique; `status` progression linear (no skipping states).

## ConflictResolutionResult
- **Purpose**: Records user decision for each conflicting map.
- **Fields**:
  - `mapId: string`
  - `action: "overwrite" | "add" | "cancel"`
  - `resolvedName?: string` – Populated when `action === "add"`.
  - `timestamp: string`
- **Relationships**: Stored inside `ImportEntry.resolution`; referenced when applying changes or aborting session.
- **Validation**: `resolvedName` required if action is `add`; single `cancel` action aborts entire session.

## ImportSummary
- **Purpose**: Provide final feedback after import.
- **Fields**:
  - `totalProcessed: number`
  - `succeeded: number`
  - `skipped: number`
  - `failed: number`
  - `messages: { mapId: string; level: "info" | "warning" | "error"; detail: string }[]`
- **Relationships**: Persisted to show user summary and for audit logging.
- **Validation**: Totals must align with ImportSession entries counts.
