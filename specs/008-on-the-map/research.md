# Research: Map Library Export & Import

## Decision: Browser ZIP bundling
- **Decision**: Use the `jszip` library to construct export archives and unpack imports in the browser.
- **Rationale**: JSZip is battle-tested, works across evergreen browsers, and supports streaming blobs plus metadata manifests required for multi-file exports.
- **Alternatives considered**:
  - **CompressionStream API**: Limited support (Safari behind flag) and lacks multi-entry ZIP packaging utilities.
  - **Manual Blob concatenation**: Simplifies implementation but yields non-standard formats incompatible with zip tooling.

## Decision: Progress & status communication
- **Decision**: Display a modal dialog with progress indicator, aria-live status text, and cancel button that maps to the "Cancel" import option when applicable.
- **Rationale**: Meets accessibility principle (visible focus, keyboard support) and keeps user informed for operations lasting >100ms.
- **Alternatives considered**:
  - **Inline toast notifications**: Harder to associate with current action and fails focus management requirements.
  - **Spinner-only feedback**: Lacks descriptive status for screen readers.

## Decision: IndexedDB snapshot strategy
- **Decision**: Read/export maps sequentially using existing persistence helpers while locking writes via the autosave scheduler pause hook; import writes staged in memory then committed after validation succeeds.
- **Rationale**: Prevents partial exports/imports, avoids race conditions with autosave, and keeps memory manageable.
- **Alternatives considered**:
  - **Bulk `getAll` without coordination**: Risk of mutating data mid-export.
  - **Export on worker thread**: Adds complexity without clear need given expected dataset size.
