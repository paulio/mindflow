# Phase 0 Research: Interactive Mind-Map Thought Organizer

## Overview
Focus: Validate architectural choices (React + ReactFlow + IndexedDB), define persistence + autosave behavior, accessibility & performance strategies, and schema versioning.

## Decisions
### 1. UI Library & Graph Interaction
- **Decision**: React + ReactFlow.
- **Rationale**: Provides immediate pan/zoom, selection, node/edge abstraction; reduces custom D3/SVG plumbing; aligns with rapid MVP.
- **Alternatives**: Pure SVG (higher effort, more control); Cytoscape.js (heavier, less flexible styling for custom node handles); D3 (low-level, more boilerplate). Chosen path balances flexibility + speed.

### 2. State Management
- **Decision**: Local component state + custom hooks; no global store library in MVP.
- **Rationale**: Limited entity types; ReactFlow already manages graph view state. Complexity threshold not exceeded.
- **Alternative**: Zustand/Redux reserved for future multi-pane cross-communication scaling.

### 3. Persistence Layer
- **Decision**: IndexedDB with stores: `graphs`, `graphNodes`, `graphEdges`, `settings`.
- **Rationale**: Structured query by graphId, efficient partial updates, offline support; avoids serializing huge JSON blobs for minor edits.
- **Write Pattern**: Batched debounced writes per entity type; commit timestamp update after each logical change.
- **Alternative**: Single JSON blob per graph (simpler but expensive for frequent small updates) rejected due to write amplification.

### 4. Autosave Strategy
- **Debounce**: 500ms after last stable change; secondary idle flush at 2s.
- **In-Progress Typing**: Composition events & IME phases excluded from immediate persistence; saved only on stable text change.
- **Failure Handling**: Retry up to 3 times (100ms, 300ms, 900ms); log instrumentation; show banner on final failure.

### 5. Undo/Redo
- **Depth**: 10 operations stored in memory only.
- **Model**: Command pattern queue storing diffs (node create/delete, text commit, position delta, edge create/delete).
- **Non-Persisted**: Avoids schema complexity & large storage churn.

### 6. Performance Targets
- Cold load (500 nodes): <1500ms (parse + mount + layout stabilization).
- Warm load (cache/hydrated): <500ms.
- Autosave commit p95: <150ms.
- Interaction frame: avg <40ms, p95 <80ms during pan/zoom & drag.
- Render Budget: Avoid large synchronous layout thrash; incremental edge updates.

### 7. Performance Instrumentation
- **Approach**: PerformanceObserver (long tasks), custom marks (`graph_load_start/end`, `autosave_start/end`).
- **Metrics Export**: Console grouped logs + optional dev overlay component.
- **Regression Detection**: Dev script comparing historical localStorage metrics snapshot.

### 8. Accessibility
- **Nodes**: Tab-focusable, aria-label="Thought node {truncatedText}".
- **Handles**: aria-label="Create node north|south|east|west"; role=button.
- **Focus Order**: Spatial ordering (row-major top-left to bottom-right) after initial user interaction; ensures predictable keyboard traversal.
- **Contrast**: Tokens enforce >=4.5:1 for text per Constitution Principle 3.

### 9. Data Model & Validation
- **Graph**: id, name, created, lastModified, lastOpened, schemaVersion (int), settings {autoLoadLast:boolean}.
- **Node**: id, graphId, text (<=255), x, y, created, lastModified.
- **Edge**: id, graphId, sourceNodeId, targetNodeId, created (undirected; uniqueness constraint on unordered pair).
- **Invariants**: Node IDs unique per graph; no duplicate (source,target) unordered pair; orphan edge purge cascade.

### 10. Schema Versioning
- **Initial**: schemaVersion=1.
- **Migration Plan**: Future migrations add `migrations` store storing applied versions; not needed MVP.

### 11. Export / Import (Deferred)
- Backlog feature: UI to export single graph to JSON; import merges as new graph ID.
- Deferral Rationale: Not core to brainstorming workflow; reduces initial scope.

### 12. Security / Privacy
- Local-only; no external transmission. Future sync would require encryption-at-rest decision & conflict resolution model.

### 13. Failure Modes
| Scenario | Mitigation |
|----------|------------|
| IndexedDB quota exceeded | Warn user (>5MB), propose manual export & delete older graphs |
| Autosave retries exhausted | Banner + red status icon until next successful write |
| Corrupted node record | On load, skip + log; maintain partial graph (report count) |
| Performance target exceeded (cold load) | Log measurement + highlight overlay; dev optimization task generation |

### 14. Open Items (Tracked but Non-Blocking)
- Formal automated performance regression harness (Phase 3 tasks).
- Virtualization for >1000 nodes (future).

## Alternatives Summary
| Topic | Chosen | Alternatives | Reason |
|-------|--------|-------------|--------|
| Graph lib | ReactFlow | Pure SVG, Cytoscape | Speed + flexibility balance |
| Persistence | IndexedDB stores | Single JSON blob | Fine-grained writes |
| State mgmt | Hooks | Zustand/Redux | Complexity threshold not met |
| Undo storage | In-memory | Persisted | Simplicity, performance |

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| ReactFlow bundle size | Slower initial load | Code-splitting, only essential node types |
| IndexedDB fragmentation | Slower enumeration | Periodic compaction script (future) |
| Large graph slowdown | Reduced UX quality | Early metrics instrumentation + profiling tasks |
| Accessibility regressions | Non-compliance | Automated axe tests in CI |

## Conclusion
Foundations validated. Proceed to Phase 1 design & contract generation.
