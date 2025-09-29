# Internal Event Contract

| Event | Payload | Trigger | Notes |
|-------|---------|---------|-------|
| graph:created | { graphId } | After new graph persisted | Update listing UI |
| graph:loaded | { graphId } | After graph hydration | Sets lastOpened |
| graph:renamed | { graphId, name } | Name change commit | Update lastModified |
| node:created | { graphId, nodeId } | Node added (after autosave ack) | Adds undo entry |
| node:updated | { graphId, nodeId, fields } | Text change commit | fields={text}|{position} |
| node:moved | { graphId, nodeId, x, y } | Drag end (throttled) | Graph lastModified updated |
| node:deleted | { graphId, nodeId } | Deletion commit | Cascades edges |
| edge:created | { graphId, edgeId } | Edge add commit | Undo entry creation |
| edge:deleted | { graphId, edgeId } | Edge removal commit | Undo entry creation |
| autosave:success | { entityType, count, elapsedMs } | After batch write | Instrumentation |
| autosave:failure | { entityType, attempt, error } | On failed write | Triggers retry/backoff |
| undo:applied | { actionType } | Undo operation | Rebuilds graph state |
| redo:applied | { actionType } | Redo operation | Rebuilds graph state |
| theme:changed | { previousTheme, newTheme, ts } | After user switches theme (post application) | previousTheme nullable on first initialization |

## Event Ordering
- Node/edge events MUST NOT fire before persistence success to avoid phantom state.
- undo:applied / redo:applied MUST re-emit lower-level node:* / edge:* events only if UI needs animation (TBD). For MVP keep silent.

## Error Handling
- autosave:failure after final retry -> surface banner; do not block UI interactions; queue reattempt on next change.
