
# Implementation Plan: Interactive Mind-Map Thought Organizer

**Branch**: `001-build-an-application` | **Date**: 2025-09-29 | **Spec**: [/specs/001-build-an-application/spec.md]
**Input**: Feature specification from `/specs/001-build-an-application/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Visual mind-map application enabling creation, linking, editing, and persistence of thought nodes with React + ReactFlow under a
minimal-dependency Vite setup. Core value: frictionless brainstorming with automatic persistence, fast reload, and consistent UX.
Nodes are created via directional handles (atomic node + edge invariant) and edited in-place using a double‑click to enter single-line edit mode; Enter/blur commits.
Autosave provides debounced writes to local IndexedDB-backed stores (with optional future export). Undo/redo history depth 10. Performance
and accessibility targets derived from constitution and preliminary assumptions.

### Spec Updates (2025-09-29)
1. Added FR-005a (double‑click activates edit mode) and FR-005b (Enter/blur commits).
2. Strengthened FR-004 to require atomic node+edge creation (no orphan nodes).
3. Elevated FR-025 from SHOULD to MUST: single select then drag to reposition a node with real‑time edge geometry update & persistence on release.
4. Added Acceptance Scenario #10 covering reposition drag workflow.
5. Directional node creation continues to rely on N/S/E/W handles, but implementation strategy updated to use native React Flow connection drag (onConnectStart/onConnectEnd) instead of a custom overlay component.
6. Added FR-005c + Acceptance Scenario #5: Shift+Enter inserts newline (multi-line node text), editor remains active; FR-019 updated to clarify 255 char limit applies across all lines including newline characters.
7. Added Acceptance Scenarios #11–#14 introducing explicit separation between a Map Library (list of saved maps) and the Editing Canvas (single active map context) with navigation, transition, and state reset semantics.
8. Added FR-031..FR-035 defining: dedicated Library view (FR-031), explicit transition on load (FR-032), guarded back navigation with unsaved-change warning (FR-033 leveraging FR-030), non-destructive isolation of library operations from active canvas (FR-034), and per-map viewport persistence & restoration (FR-035).
9. Edge Cases expanded: viewport isolation, unsaved-change guard on library navigation, rapid map switching without leaking pan/zoom transforms.
10. Added FR-036..FR-040a introducing a global Theme Manager (accessible through Details pane) with two initial themes (classic & subtle), global (not per-graph) persistence, immediate re-render on switch, accessibility contrast requirements, and explicit UI separation within the Details pane to convey scope.
11. Added FR-041 enabling repeated directional handle drags (fan-out) (already supported; requirement formalized).
12. Added FR-042 introducing hierarchical node levels (Root = level 0, Child N) with display in Details pane only (computed, not persisted required).
13. Added FR-043..FR-043c defining node deletion with hierarchical re-parenting (non-Root only), root delete prohibition, duplicate edge avoidance, atomicity, and ordered event emission.
14. Added FR-044..FR-045b introducing Map Actions section in Details pane (Delete Map) and Export Map (PNG + Markdown hierarchical list) functionality.
15. Added FR-046..FR-046b introducing Clone Map action (deep copy of current map with unique incremental name and automatic switch to clone).

Plan adjustments (delta):
- Add integration test: reposition node (drag) updates position & edges live; persists after drop (FR-025 / Scenario #10).
- Add unit test: move operation emits node:moved event and rounds coordinates.
- Add integration test: below-distance (<80px) connection drag cancellation (FR-020) results in no node creation.
- Add integration test: handle → handle direct connection still creates edge only (no node spawn) and prevents duplicates.
- Remove tasks related to bespoke NodeHandles overlay (ghost preview) – replaced by native connect flow.
- Add implementation task to conditionally render directional handles only when node is selected (ensure FR-003 remains valid after simplification).
- Add undo/redo behavior verification for move operations (creates one undo entry representing final position, not interim ephemeral states).
- Update quickstart & docs to mention: “Drag from a directional handle to empty canvas to create a connected node” and “Single-click + drag a node body to reposition it.”
- IMPLEMENT MULTI-LINE: Replace single-line input with auto-resizing textarea (or contenteditable) honoring Shift+Enter newline insertion (FR-005c) while plain Enter commits.
- Add unit test for text update enforcing max length across newlines (FR-019) and preserving newline characters in persistence serialization order.
- Add integration test: editing a node, typing text, pressing Shift+Enter inserts newline (height increases), later pressing Enter commits both lines.
- Update serialization contract doc if needed to clarify text may contain '\n'.
 - Introduce view state architecture: two primary UI states (Library vs Canvas). Remove embedded GraphList panel from active canvas when editing; Library owns map management.
 - Add integration tests (pre-implementation) for: Library → Canvas open, Back to Library, unsaved-change warning, new map creation flow, per-map viewport restore.
 - Add unit tests: viewport persistence serialize/restore; library isolation (non-active map operations do not mutate current canvas).
 - Implementation additions: Library view component, navigation control (Back), unsaved-change guard leveraging autosave pending state, per-map viewport storage (extend persistence schema), selection/edit state reset on map switch.
 - Documentation updates: quickstart to differentiate “Managing Maps (Library)” vs “Editing a Map (Canvas)” and describe viewport restoration + warning dialog.
 - Introduce Theme Manager architecture: global theme state, persistence layer (settings store), event emission (`theme:changed`), theme config module with typed contract.
 - Add tasks for: theme config definition, global theme provider/store integration, Details pane Theme Manager UI section (visually separated), persistence load-before-paint strategy, accessibility contrast test (WCAG AA), event contract test, snapshot/theme switch re-render test, and fallback logic if stored theme key invalid.
 - Add token refactor task: extract current hard-coded node/handle colors to CSS custom properties namespaced by theme (e.g., `--mf-node-bg`, `--mf-node-border`) with theme root class switch.
 - Add subtle theme design validation step (manual + automated contrast assertion) before finalizing tokens.
 - Add hierarchy computation & display: derive level via BFS from root (first created node) at runtime; no schema change. Provide selector in GraphMetaPanel to show read-only "Level: Root | Child 1 | Child 2...".
 - Add tests: unit BFS level derivation; integration selecting nodes shows correct levels.
 - Add node deletion + re-parenting: UI trash-can control near selected node (disabled for root); domain operation to remove node, create new edges from parent to each child, remove original edges, preserve grandchildren; event emission order deterministic.
 - Add tests: unit re-parent algorithm (duplicate edge prevention, cycle safety, atomic failure rollback), integration delete non-root, integration root delete disabled, integration multi-child performance.

## Technical Context
**Language/Version**: TypeScript (ES2022 target) via Vite + React 18
**Primary Dependencies**: React, ReactFlow, panzoom helper (if needed), IndexedDB wrapper (idb) (optional), Testing: Vitest + React Testing Library, Playwright for integration.
**Storage**: IndexedDB (stores: graphs, graphNodes, graphEdges, settings); future JSON export/import (backlog).
**Testing**: Unit (Vitest), Component (RTL), Integration (Playwright), Performance smoke (custom script + PerformanceObserver), Accessibility (axe testing).
**Target Platform**: Modern desktop browsers (Chromium, Firefox, Safari latest), PWA potential backlog.
**Project Type**: Single web frontend (no backend service). All logic client-side.
**View Architecture**: Two top-level application states: (1) Map Library (non-interactive list & management actions) and (2) Editing Canvas (ReactFlow graph for one active map). Transitions: Open Map, New Map (create→auto-transition), Back to Library. Each map persists its own viewport (pan, zoom level) alongside metadata and restores it on open; library operations on other maps leave the active canvas state untouched until an explicit load.
**Theme Architecture (NEW)**: Global theme (user-level) applied at app root via a `data-theme` attribute or root class (e.g., `.theme-classic`, `.theme-subtle`). Theme selection persists in a lightweight `settings` store (IndexedDB record) loaded before first paint (apply stored theme synchronously to avoid flash). The Details pane hosts a "Global Theme" section (visually separated) listing radio buttons or segmented control for available themes. A theme switch updates CSS custom properties (token layer) driving node background, border width/color, text color, handle colors, selection outline, and textarea styles. Switching emits `theme:changed { previousTheme, newTheme, ts }`. Invalid stored theme keys fall back to default `classic` and emit a logged warning (non-blocking). Accessibility guard: subtle theme tokens must maintain ≥4.5:1 contrast for node text vs background (validated via test computing contrast ratio from computed hex values in config).
**Hierarchy Display Architecture (NEW)**: Treat the first (root) node as level 0. For any other node, compute level as the length of the shortest undirected path to root using existing edges. Because edges are undirected, a simple BFS from root each time selection changes (or memoized until graph mutates) yields levels. No persistence required; recompute on load. In presence of cycles (not prevented), BFS still produces minimum depth, which we display. The Details pane adds a read-only label (e.g., "Level: Root" or "Level: Child 3"). Performance: For typical graphs (<1000 nodes) BFS O(N+E) on selection is acceptable; optional future optimization: cache level map invalidated on node/edge mutation events.
**Deletion & Re-parenting Architecture (NEW)**: Deleting a non-Root node removes the node and its incident edges, then for every direct child (nodes for which the deleted node was an immediate neighbor along the creation path) we add an edge from the deleted node's parent to that child if one does not already exist. Because edges are undirected, parent/child semantics are inferred from breadth-first levels: parent candidates are neighbors with lower level. Operation steps: (1) Identify parent (one neighbor with smallest level; if multiple, choose earliest created for determinism). (2) Collect children (neighbors with level = deleted level + 1). (3) Validate new edges (skip duplicates). (4) Apply changes atomically (temp structures then commit). (5) Emit events: node:deleted then edge:created for each new edge sorted by child node id. Root deletion returns early with no-op. UI exposes a trash-can button positioned with consistent offset relative to node bounding box; disabled state for root includes aria-disabled.
**Map Actions & Export Architecture (NEW)**: The Details pane gains a distinct "Map Actions" section (separate from Theme & metadata) containing: (a) Delete Map: invokes existing graph deletion flow, confirms, clears active graph state, transitions view to Library; (b) Export Map with sub-options (dropdown or disclosure) for PNG & Markdown. PNG export uses an off-screen render pipeline: compute graph bounding box (min/max over node positions) + padding, create a temporary canvas sized to box, draw background (theme), then for each edge draw a simple line (theme edge stroke), then each node (rounded rect + text) using current theme variables resolved from computed styles. Markdown export performs a BFS (already available via hierarchy) to produce one bullet per node exactly once (avoid duplicates on cycles by visitation set) indenting by level (2 spaces * level) and escaping markdown control characters. Exports are pure read operations (no state mutation, no events). Large graphs fallback: if bounding box exceeds threshold (e.g., >8000px on a side) scale down proportionally for PNG.
**Clone Map Architecture (NEW)**: Clone action creates a brand new Graph record with a unique ID, duplicated metadata (except: new created/lastModified/lastOpened timestamps), and copies all nodes & edges from the source graph. Node and edge IDs are regenerated to guarantee isolation (prevent accidental cross-graph assumptions). Viewport (if present) is copied. Name generation algorithm: Start with base string `${originalName}Clone1`; while any existing graph has that exact name, increment the trailing integer (Clone2, Clone3, ...). After creation, persist new graph, nodes, edges in a single logical operation (can be sequential writes for MVP) and switch application state to the new graph (load into canvas). Undo/redo history is not transferred (starts empty) by design; hierarchy computation will recompute upon load and produce identical levels as structure preserved. Performance: O(N+E) copy; for large graphs (e.g., 1000 nodes) ensure minimal allocations (single pass transform). No events are emitted for each node/edge; optional future bulk event (graph:cloned) backlog.
**Performance Goals**: 500-node cold load <1500ms; warm load <500ms; autosave p95 <150ms; frame render avg <40ms p95 <80ms during pan/zoom.
**Hierarchy Performance Considerations**: Level computation triggered on node/edge mutation or selection. Cache with a version counter (increment on structural mutating events) to prevent redundant BFS. Expected BFS time << 10ms for 500 nodes; measure and add metric flag if >16ms (future optimization threshold).
**Deletion Performance Considerations**: Re-parent deletion touches O(d) edges (d = number of direct children). For large fan-out (d ~ 200) ensure batch state update uses a single setState functional update for nodes/edges and a single persistence batch (future optimization). Target <100ms wall time for d <= 200 on mid-tier hardware. Avoid recomputing full BFS multiple times; rely on existing cached levels and increment mutation counter once.
**Theme Performance Considerations**: Theme switch MUST avoid per-node React re-render cascade where possible—prefer CSS variable swap for majority of visual changes. Node component only re-renders if theme-dependent logic (e.g., conditional class) requires it. Target <1 frame (<16ms) style recalculation on mid-size graph (≈200 nodes). Measure using PerformanceOverlay (extend existing metrics module to time theme switch).
**Constraints**: Offline-capable; storage warning if >5MB; node text <=255 chars; undo depth 10; no multi-tab sync.
**Scale/Scope**: MVP single-user local graphs; up to ~1000 nodes (no virtualization in MVP, performance monitoring instrumentation only).

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Principle 1 (Code Quality & Readability):
- Plan enforces complexity boundaries by structuring state (hooks + small modules) → PASS (no violation yet)

Principle 2 (TDD & Coverage):
- Strategy: contract/integration tests first (Playwright scenarios), unit tests for graph utils before implementation → PASS

Principle 3 (UX Consistency & Accessibility):
- Design tokens (to be added in /src/styles/tokens.css) + focus states + ARIA handles planned → PASS (pending token file creation Phase 1 output proposal)

Principle 4 (Performance & Efficiency):
- Defined performance thresholds + instrumentation plan; observability via structured console + optional dev overlay → PASS

No violations requiring Complexity Tracking at this stage.

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->
```
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: Adopt Single Project layout specialized for React SPA.

```
src/
├── components/
│   ├── graph/            # ReactFlow wrapper & node/edge renderers
│   ├── nodes/            # Node components (ThoughtNode)
│   ├── panels/           # Sidebars: GraphList, Properties
│   ├── ui/               # Reusable UI primitives (Button, Modal, etc.)
├── hooks/                # useAutosave, useUndoRedo, useGraphStore
├── state/                # graph-store.ts (zustand optional later) / context modules
├── lib/                  # persistence (indexeddb.ts), performance (metrics.ts), accessibility helpers
├── styles/               # tokens.css, globals.css
├── pages/                # App shell
├── tests/                # colocated or mirror structure (unit)
└── index.tsx             # entrypoint

tests/
├── integration/          # Playwright specs
├── contract/             # Data serialization / schema tests
└── unit/                 # Utility + hook tests
```

Rationale: Single frontend project meets MVP scope; modular separation supports complexity limits & test targeting.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

Phase 0 Deliverable (see `research.md`):
- Persistence selection rationale (IndexedDB vs alternatives)
- ReactFlow adoption analysis
- Autosave debounce and retry strategy
- Performance instrumentation approach
- Accessibility strategy (handles + focus management)
- Data normalization & schema versioning approach

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests (stubs), quickstart.md, agent-specific file (if any)

Phase 1 Deliverables (created):
- data-model.md: Graph, Node, Edge, UndoEntry schemas + invariants.
- contracts/: persistence-schema.json, events.md (internal event contract), serialization-contract.md.
- quickstart.md: Setup steps (install, run dev, create first node) + test commands.

Post-Design Constitution Check: PASS (see updated section below).

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 42-48 tasks (includes previous scope plus Theme Manager: config, provider, UI section, persistence, event tests, accessibility contrast test, token refactor, fallback handling) in tasks.md
**Estimated Output Delta (Hierarchy)**: +4–6 tasks (unit BFS level test, integration display test, implementation of level calculator, GraphMetaPanel display, optional caching, documentation update).
**Estimated Output Delta (Deletion)**: +6–8 tasks (unit re-parent algorithm, integration delete non-root, integration root disabled, duplicate edge prevention test, atomic rollback test, UI control implementation, docs & manual validation updates).
**Estimated Output Delta (Map Actions & Export)**: +6–9 tasks (integration delete map via Details pane, integration export PNG triggers download, integration export Markdown triggers download, unit markdown serializer, utility bounding box & render function, UI wiring in Details pane, docs + manual validation entries, optional contrast/fidelity visual regression placeholder).
**Estimated Output Delta (Clone)**: +4–6 tasks (unit clone name collision handling, integration clone switches context, unit deep copy invariants, implementation clone utility, UI control wiring, docs/manual update).

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

### Theme Manager Implementation Strategy (Detail)
1. Data Contract: `ThemeId = 'classic' | 'subtle'`; `ThemeDefinition` interface enumerating semantic tokens (nodeBg, nodeBorderColor, nodeBorderWidth, nodeTextColor, handleSourceColor, handleTargetColor, selectionOutline, editorBg, editorTextColor).
2. Config Module: `themes.ts` exporting record `themes: Record<ThemeId, ThemeDefinition>` + `defaultTheme: 'classic'`.
3. Persistence: Extend existing settings store (or create) with single key `activeTheme`. Load synchronously (await before initial React render) using an initialization hook or pre-hydration script.
4. Application: Apply root `<body class="theme-classic">` (or data attribute). CSS files (`tokens.css`) define theme-scoped variables under `.theme-classic` / `.theme-subtle` selectors mapping semantic names to actual values.
5. Consumption: Components reference only semantic CSS variables (no raw hex) ensuring future theme additions are data-only changes.
6. UI: Details pane adds section header "Global Theme" + list of radio inputs. Selection triggers store update, persistence write (debounced minimal), event emission, and immediate class swap.
7. Events: Add to `events.md` contract entry for `theme:changed` with payload schema.
8. Testing: (a) Contract test ensures themes expose all required keys; (b) Persistence test reloads app state applying stored theme; (c) Accessibility contrast test computes ratio using luminance formula; (d) Snapshot or DOM query test ensures node className / style changes after switch; (e) Event emission test verifying previous/new IDs.
9. Fallback: If stored theme ID missing from config, log warn, apply default, emit `theme:changed` with `previousTheme = null`.
10. Performance: Add metric capture around theme switch measuring duration between dispatch and next animation frame paint.

### Node Hierarchy (FR-042) Implementation Strategy
1. Root Identification: The first created node (existing invariant) is root; store its id in memory when graph loads (first node by created timestamp or first encountered if persisted order matches contract).
2. Level Computation: On graph load or structural change (node/edge add/delete), run a BFS from root to build a `Map<nodeId, level>`.
3. Cache Invalidation: Maintain a mutation counter; recompute only when counter changes (increment on node:created,node:deleted,edge:created,edge:deleted events).
4. Display: Extend `GraphMetaPanel` to show `Level: Root` or `Level: Child N` for selected node (absent selection: hide label).
5. Edge Cases: Missing root (empty graph) -> show nothing. Cycles: BFS ensures minimum depth; no special handling required.
6. Tests: (a) Unit test BFS correctness on a small fabricated graph with branching; (b) Integration test: create chain of depth 3 and assert displayed levels; (c) Fan-out test: multiple children of root all show level 1.
7. Performance: Optional metric mark around BFS if node count > X (future; not mandatory MVP).

### Node Deletion & Re-parenting (FR-043..FR-043c) Implementation Strategy
1. UI Control: Render a trash-can button absolutely positioned near selected node (z-index above canvas). Compute screen position from node coordinates + current viewport transform (or leverage ReactFlow node internals). Disabled styling & aria-disabled when root.
2. Parent Resolution: Using cached levels, find neighbors with level = (nodeLevel - 1). If >1, choose deterministic: lowest level (should be unique) then earliest created timestamp as tie-breaker.
3. Child Collection: Neighbors with level = (nodeLevel + 1). Ignore nodes not strictly at next level to avoid unintended structural rewiring.
4. Atomic Plan: Build arrays of (edgesToAdd, edgesToRemove, nodeToRemove). Validate no new edge duplicates existing. If validation fails mid-way (e.g., capacity or invariant), abort without mutating state.
5. State Commit: Single batched setState: remove node, remove its incident edges, append new edges. Persist via existing saveEdges / (future: batched persistence). Emit events in defined order.
6. Undo/Redo Consideration: Represent as a compound action (future enhancement). MVP: treat as multiple granular events; optional backlog to wrap into single undo entry.
7. Tests: (a) Unit test algorithm with constructed mini-graph; (b) Integration test deleting Child 2 re-parents grandchildren; (c) Root delete disabled; (d) Duplicate edge preventing (already existing parent-child link) maintains single edge.
8. Performance: Add optional measurement around deletion operation for large fan-out (mark before/after state commit).
 9. Handle Selection (FR-043d): For each new re-parent edge assign source/target handle IDs based on relative position vector (dx = child.x - parent.x, dy = child.y - parent.y) using node center coordinates (existing position + half nominal width/height heuristic). If |dy| >= |dx| choose vertical: dy < 0 → source handle 'n' & child target handle 's'; dy >= 0 → source 's', child 'n'. Else choose horizontal: dx > 0 → source 'e', child 'w'; dx <= 0 → source 'w', child 'e'. Ties (|dx| == |dy|) resolved by vertical rule. Deterministic, pure function so unit testable. Store IDs on new EdgeRecord (sourceHandleId, targetHandleId) for correct directional rendering.

### Re-parent Edge Handle Assignment Details (FR-043d)
Algorithm Inputs: parent node (Px, Py), child node (Cx, Cy). Use raw stored positions (assumed top-left) and approximate centers by adding half of default node width/height (constants reused from creation logic; acceptable approximation since relative direction unaffected by constant translation). Compute dx, dy; decide axis dominance. Produce (parentHandle, childHandle) pair from mapping described above. Guarantees: (a) determinism, (b) O(1) per edge, (c) no dependency on existing handles presence (ReactFlow ensures handles exist for N/E/S/W). Edge Cases: If parent and child share identical coordinates (dx=0, dy=0) fallback to vertical north/south default (treat as dy >= 0). Testing: Unit test with representative quadrants + tie and zero deltas; integration test verifying new edges after deletion carry expected handle IDs.

### Map Actions & Export (FR-044..FR-045b) Implementation Strategy
1. UI Section: Add "Map Actions" heading in Details pane below Theme Manager. Provide two primary controls: Delete Map (button) and Export (menu or two inline buttons: PNG, Markdown). Ensure visual separation (divider) from node metadata & theme sections.
2. Delete Map Flow: On click -> confirm dialog. If confirmed: call existing `removeGraph(graph.id)`, clear local selection/editing, set view to 'library'. Handle failure (catch promise rejection) by showing alert/toast (MVP: alert). Reuse FR-010 confirmation semantics; ensure this path works from Details pane (existing graph list delete remains).
3. Export PNG: Implement `exportGraphAsPng(graph, nodes, edges, theme)` utility. Steps: (a) derive bounding box from nodes (minX, minY, maxX+nodeWidth, maxY+nodeHeight) + padding (e.g., 32px); (b) create canvas; (c) fill background; (d) draw edges (lines from node center to center); (e) draw nodes (rounded rect fill + stroke); (f) draw text centered with line wrapping (simple split by '\n'); (g) `canvas.toBlob` → createObjectURL → trigger download with filename `<graph-name>.png` or fallback id.
4. Export Markdown: Implement `exportGraphAsMarkdown(graph, nodes, edges)` building levels map (reuse existing BFS) and output bullet list in stable deterministic order (by level then creation timestamp). Escape characters: replace `* _ #` with escaped variants (prefix backslash). Newlines in node text replaced with space. Download as `<graph-name>.md`.
5. Accessibility: Buttons must have aria-labels (e.g., "Export map as PNG"). Menu approach (if used) must be keyboard navigable; otherwise two direct buttons acceptable for MVP.
6. Performance: PNG export for large graphs (e.g., >1500 nodes) may be heavy; MVP note: synchronous drawing acceptable; add TODO for off-thread rendering (OffscreenCanvas) future. Ensure export does not trigger autosave (no state mutation).
7. Testing: (a) Integration: delete map via Details pane returns to Library; (b) Integration: export PNG triggers a Blob download stub (intercept anchor click); (c) Integration: export Markdown text includes expected bullet hierarchy lines; (d) Unit: markdown serializer deterministic ordering and escaping; (e) Optional future: pixel comparison / snapshot omitted in MVP (documented).
8. Documentation: Quickstart updated with new Map Actions section & export usage instructions.
9. Events: No new events for exports MVP; future backlog item `export:completed` if instrumentation needed.

### Clone Map (FR-046..FR-046b) Implementation Strategy
1. Name Collision Resolution: Load existing graphs list; generate candidate names `${origName}Clone${i}` starting at i=1, increment until unique.
2. Copy Process: In memory construct new GraphRecord (new id, created/lastModified now, name = uniqueName, copy viewport/settings). Map oldNodeId -> newNodeId via single pass to rebuild edges referencing new IDs.
3. Persistence: Write graph, then batch write nodes, then edges (reuse existing save utilities). After persistence, refresh graph list and select the new graph (invoke existing `selectGraph` or direct state injection + load semantics).
4. State Transition: Clear selection/edit state; optionally auto-select root (mirroring new graph creation) but do NOT enter edit mode unless original root was actively being edited (deferred enhancement; MVP simply no edit mode).
5. Performance: Use simple loops; avoid JSON stringify/parse for cloning to reduce overhead. For very large graphs log duration (optional metric mark `clone:duration`).
6. Testing: (a) Unit: name generation with pre-existing Clone1/Clone2 returns Clone3; (b) Integration: clone action results in structurally identical node/edge counts and new graph id; (c) Unit: verifying new IDs differ from originals; (d) Optional integration: editing original after clone does not affect clone.
7. Non-Goals: Undo stack transfer; differential cloning; partial subset cloning (future enhancements).

### Undo / Redo (Spec Branch 002) Implementation Strategy (Preview)
NOTE: Core specification lives in `specs/002-the-graph-editor/spec.md`; this section summarizes integration intent with existing architecture.
1. Scope: Session-scoped node mutation history only (creation, deletion, text commit, position commit). No persistence of history across reloads; graph state itself is persisted immediately via autosave.
2. Data Model: History forms two logical stacks (or an index boundary) with maximum depth 100 (FR-026). Pushing when full discards oldest entry (drop-from-bottom strategy).
3. Granularity Rules: One entry per committed text change (no merge window), one per completed drag gesture, one per node creation, one per node deletion (compound re-parenting captured inside single entry). No partial entries mid-drag or mid-edit.
4. Exclusions: Export, theme switch, clone, view-only actions produce no entries and do not clear redo. Clone starts a new empty history for the new graph (FR-027); export leaves history untouched (FR-028).
5. LIFO Integrity: Only reverse-walk permitted; user cannot skip older steps (FR-019). Parent dependency restoration safe by design.
6. Deletion Undo: Restores original node, its text, coordinates, and original edge relationships while removing interim re-parent edges; handle assignment on redo uses existing deterministic logic.
7. Depth Enforcement: Implement constant-time check; on push when size==100 remove oldest before append to preserve chronological order.
8. UI: Initial delivery buttons only (no keyboard shortcuts) (FR-029). Disabled state logic derived from boundary index.
9. Accessibility: Aria labels “Undo last change” / “Redo change”; disabled state conveyed via aria-disabled.
10. Integration Points: Graph store mutation functions will notify undo manager with a structured change descriptor after successful commit & persistence scheduling.
11. Testing Strategy (New Tasks to Add):
   - Contract: event exclusion (no spurious events on undo/redo) & history depth enforcement.
   - Unit: creation, deletion, text, move entries; depth rollover; redo clearing on new change.
   - Integration: mixed sequence reversal, redo after undo, disabled states on boundaries, deletion undo restoring relationships.
12. Performance: Target qualitative “instant” (< a frame) restoration; large deletion undo limited by edge reconstruction already optimized.
13. Future Enhancements (Backlog): Shortcut support (Ctrl+Z / Ctrl+Shift+Z), grouping multi-select operations, merging rapid text edits, cross-session history persistence opt-in.

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Constitution v1.0.0 - See `/memory/constitution.md`*
