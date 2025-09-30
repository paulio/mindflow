# Data Model: Interactive Mind-Map Thought Organizer

## Overview
Defines persisted entities, relationships, invariants, and validation rules aligned with spec FRs and constitution principles.

## Entities
### Graph
| Field | Type | Constraints | Notes |
|-------|------|------------|-------|
| id | string (uuid) | required, unique | Primary identifier |
| name | string | required, 1-80 chars | Display name |
| created | timestamp | required | ISO string |
| lastModified | timestamp | required | Updated on any structural/text change |
| lastOpened | timestamp | required | Updated when loaded into canvas |
| schemaVersion | int | >=1 | Starts at 1 |
| settings.autoLoadLast | boolean | default true | Controls auto-load behavior |

### Node
| Field | Type | Constraints | Notes |
|-------|------|------------|-------|
| id | string (uuid) | required, unique within graph | |
| graphId | string | required | FK to Graph.id |
| text | string | required, 0-255 chars | Blank replaced by default label on display |
| x | number | required | Canvas position px |
| y | number | required | Canvas position px |
| created | timestamp | required | |
| lastModified | timestamp | required | Update on text or position change |

### Edge
| Field | Type | Constraints | Notes |
|-------|------|------------|-------|
| id | string (uuid) | required | Deterministic UUID (sorted pair hashed) optional |
| graphId | string | required | FK to Graph.id |
| sourceNodeId | string | required | FK Node.id |
| targetNodeId | string | required | FK Node.id, != sourceNodeId |
| created | timestamp | required | |
| undirected | boolean | always true | Reserved for future directionality |

### UndoEntry (Runtime Only)
| Field | Type | Constraints | Notes |
|-------|------|------------|-------|
| actionType | enum | createNode, deleteNode, updateText, moveNode, createEdge, deleteEdge | |
| payload | object | shape per action | Minimal diff data |
| timestamp | timestamp | required | Ordering |

## Relationships
- Graph 1..n Nodes
- Graph 1..n Edges (Edge references two Nodes within same Graph)
- UndoEntries ephemeral; not persisted.

## Invariants
1. Node ids unique per graph.
2. Edge (sourceNodeId,targetNodeId) unordered pair unique per graph.
3. No edges referencing missing nodes (cascade delete on node removal).
4. schemaVersion >= 1.
5. Node text length <= 255; excess input rejected prior to persistence.
6. A Graph MUST have lastModified >= max(node.lastModified, any edge creation time).
7. Undo history length <= 10; oldest entries discarded FIFO.

## Validation Rules
- On node create: ensure offset placement avoids overlap (>= spacing constant S=40px center-to-center default).
- On text commit: trim whitespace ends; reject >255; update lastModified.
- On move: snap to integer px (avoid sub-pixel drift), throttle updates for performance instrumentation.
- On edge create: prevent duplicates by constructing sorted tuple key.

## Derived / Computed
- Graph size metrics (nodeCount, edgeCount) computed for listing.
- Display label for empty text => "New Thought" (not persisted as default unless user leaves blank intentionally).

## Persistence Store Mapping
| Store | Key | Value | Indexes |
|-------|-----|-------|---------|
| graphs | id | Graph record | lastModified, lastOpened |
| graphNodes | compound (graphId,id) | Node record | graphId, lastModified |
| graphEdges | compound (graphId,id) | Edge record | graphId |
| settings | key (singleton) | { autoLoadLast:boolean } | n/a |

## Events (Internal)
- graph:created, graph:loaded, graph:renamed
- node:created, node:updated, node:moved, node:deleted
- edge:created, edge:deleted
- autosave:success, autosave:failure
- undo:applied, redo:applied

## Open Future Extensions
- Directional edges (add direction enum, backward-compatible default undirected)
- Node tagging / color coding (requires tokens & legend)
- Collaboration metadata (sync version vectors)

## Quality & Test Notes
- Contract tests ensure JSON serialization ordering stable (sorted by id then created timestamp for lists).
- Performance smoke: measure cold load with synthetic 500 node dataset fixture.
- Accessibility test ensures tab order stable and handles are discoverable via role=button.
