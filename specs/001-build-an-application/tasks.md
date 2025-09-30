# Tasks: Interactive Mind-Map Thought Organizer

**Input**: Design documents from `/specs/001-build-an-application/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/, quickstart.md

## Phase 3.1: Setup
- [X] T001 Create base project structure (src/components/{graph,nodes,panels,ui}, src/hooks, src/state, src/lib, src/styles, tests/{unit,contract,integration})
 - [X] T002 Initialize Vite + React + TypeScript project (package.json, tsconfig.json, vite.config.ts)
- [X] T003 [P] Add dependencies: react, react-dom, reactflow, idb (optional), @testing-library/react, vitest, playwright, axe-core, @axe-core/playwright, typescript, eslint, prettier
- [X] T004 [P] Configure ESLINT + Prettier + TypeScript strict settings (eslint.config.js, .prettierrc, tsconfig updates)
- [X] T005 [P] Add design tokens stylesheet `src/styles/tokens.css` (colors, spacing, motion, focus ring) + `globals.css`
- [X] T006 Setup basic index.html + entry `src/index.tsx` mounting <App /> with empty layout
- [X] T007 Add accessibility helper script `src/lib/a11y.ts` (focus-outline management, aria utility)
- [X] T008 Add performance metrics helper `src/lib/metrics.ts` (mark/measure, frame observer skeleton)

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
### Contract Tests (Derived from contracts/)
- [X] T009 [P] Contract test persistence schema validation (`tests/contract/persistence-schema.test.ts`) – validate sample serialized graph matches `persistence-schema.json`
- [X] T010 [P] Contract test serialization ordering (`tests/contract/serialization-order.test.ts`) – ensure nodes & edges sorted per contract
- [X] T011 [P] Contract test events emission shape (`tests/contract/events-contract.test.ts`) – mock emitter verifies required payload keys
 - [ ] T088 [P] Contract test theme:changed event schema (`tests/contract/theme-event-contract.test.ts`) – ensure payload includes previousTheme (nullable), newTheme (required), timestamp
 - [ ] T089 [P] Contract test theme definitions completeness (`tests/contract/themes-config.test.ts`) – assert each theme exports required semantic keys (nodeBg,nodeBorderColor,nodeBorderWidth,nodeTextColor,handleSourceColor,handleTargetColor,selectionOutline,editorBg,editorTextColor)
 - [ ] T116 [P] Contract test deletion event ordering (FR-043c) (`tests/contract/deletion-event-order.test.ts`) – simulate deletion, assert sequence: node:deleted then edge:created[*] (sorted by child id)
 - [ ] T117 [P] Contract test root deletion prohibition (FR-043a) (`tests/contract/root-delete-prohibit.test.ts`) – attempt root delete, assert no node:deleted event & operation returns no-op
 - [ ] T135 [P] Contract test export markdown structure (FR-045b) (`tests/contract/export-markdown-contract.test.ts`) – given small graph, exported markdown lines match bullet hierarchy spec (Root, indented children)
 - [ ] T136 [P] Contract test export PNG metadata (FR-045a) (`tests/contract/export-png-metadata.test.ts`) – stub canvas, assert filename pattern `<graph-name>.png` and no structural events emitted
 - [ ] T154 [P] Contract test clone naming uniqueness (FR-046a) (`tests/contract/clone-naming.test.ts`) – precreate graphs Original, OriginalClone1, ensure next is OriginalClone2

### Integration Tests (User Scenarios & Validation Checklist)
- [X] T012 [P] Integration test create first node & autosave (`tests/integration/create-first-node.spec.ts`)
- [X] T013 [P] Integration test directional handle node creation (>=80px drag threshold) (`tests/integration/handle-create-node.spec.ts`)
- [X] T014 [P] Integration test rapid node creation spam – no orphan edges (`tests/integration/rapid-create.spec.ts`)
- [X] T015 [P] Integration test reload auto-loads last map (`tests/integration/reload-autoload.spec.ts`)
- [X] T016 [P] Integration test deletion with confirm removes graph (`tests/integration/delete-graph.spec.ts`)
- [X] T017 [P] Integration test text length enforcement (255 char limit) (`tests/integration/text-limit.spec.ts`)
- [X] T018 [P] Integration test undo/redo depth 10 (`tests/integration/undo-redo.spec.ts`)
- [X] T019 [P] Integration test pan & zoom responsiveness baseline metrics (<40ms avg frame) (`tests/integration/perf-panzoom.spec.ts`)
- [X] T020 [P] Integration test accessibility (tab order + handle aria labels) (`tests/integration/accessibility.spec.ts`)
 - [ ] T057 [P] Integration test double-click enters edit mode & caret at end (FR-005a) (`tests/integration/dblclick-edit.spec.ts`)
 - [ ] T058 [P] Integration test Enter (no modifiers)/blur commits edit (FR-005b) (`tests/integration/edit-commit.spec.ts`)
 - [ ] T059 [P] Integration test edit mode idempotency + Enter no-op (no text change) (`tests/integration/edit-idempotent.spec.ts`)
 - [ ] T066 [P] Integration test Shift+Enter inserts newline, remains editing, later Enter commits multi-line (FR-005c) (`tests/integration/multiline-edit.spec.ts`)
 - [ ] T067 [P] Integration test node reposition drag persists final position & edges update (FR-025) (`tests/integration/reposition-node.spec.ts`)
 - [ ] T068 [P] Integration test <80px connection drag cancels node creation (FR-020) (`tests/integration/drag-threshold-cancel.spec.ts`)
 - [ ] T073 [P] Integration test Library lists existing maps & selecting one transitions to canvas (FR-031, FR-032) (`tests/integration/library-open-map.spec.ts`)
 - [ ] T074 [P] Integration test Back to Library hides canvas & shows list (FR-033) (`tests/integration/library-back.spec.ts`)
 - [ ] T075 [P] Integration test unsaved change warning on navigating back (modify text then attempt back) (FR-030, FR-033) (`tests/integration/library-unsaved-warning.spec.ts`)
 - [ ] T076 [P] Integration test creating new map from Library transitions + root node focused + appears in list after initial autosave (FR-001a, FR-031, FR-032, FR-034) (`tests/integration/library-new-map.spec.ts`)
 - [ ] T077 [P] Integration test per-map viewport isolation & restoration (different pans across two maps restore correctly) (FR-035) (`tests/integration/viewport-restore.spec.ts`)
 - [ ] T090 [P] Integration test theme switch immediate visual update (<100ms, same frame) (FR-040) (`tests/integration/theme-switch-live.spec.ts`)
 - [ ] T091 [P] Integration test theme persistence across reload (apply before first paint; no flash) (FR-039) (`tests/integration/theme-persist-reload.spec.ts`)
 - [ ] T092 [P] Integration test Details pane shows Global Theme section separated from graph metadata (FR-040a) (`tests/integration/theme-ui-separation.spec.ts`)
 - [ ] T093 [P] Integration test subtle theme maintains accessibility contrast (computed style ratio >=4.5:1) (FR-038) (`tests/integration/theme-contrast.spec.ts`)
 - [ ] T108 [P] Integration test node hierarchy levels display (Root, Child 1, Child 2) (FR-042) (`tests/integration/node-level-display.spec.ts`)
 - [ ] T118 [P] Integration test delete non-root re-parents children (FR-043, FR-043b) (`tests/integration/delete-node-reparent.spec.ts`)
 - [ ] T119 [P] Integration test root deletion disabled (UI control + blocked action) (FR-043a) (`tests/integration/root-delete-disabled.spec.ts`)
 - [ ] T120 [P] Integration test duplicate edge prevention on deletion (existing parent-child edge not duplicated) (FR-043b) (`tests/integration/delete-duplicate-prevention.spec.ts`)
 - [ ] T121 [P] Integration test deletion performance multi-child (<100ms d<=50) (FR-043 performance) (`tests/integration/delete-perf.spec.ts`)
 - [ ] T137 [P] Integration test delete map via Details pane returns to library (FR-044) (`tests/integration/delete-map-details-pane.spec.ts`)
 - [ ] T138 [P] Integration test export PNG triggers download (blob URL intercepted) (FR-045a) (`tests/integration/export-png.spec.ts`)
 - [ ] T139 [P] Integration test export Markdown triggers download & content snapshot (FR-045b) (`tests/integration/export-markdown.spec.ts`)
 - [ ] T166 [P] Integration test re-parent edges assign nearest directional handles (FR-043d) (`tests/integration/reparent-handle-assignment.spec.ts`)
 - [ ] T155 [P] Integration test clone map creates deep copy & switches context (FR-046b) (`tests/integration/clone-map-switch.spec.ts`)
 - [ ] T156 [P] Integration test clone large map performance (<500ms 500 nodes) (FR-046 performance) (`tests/integration/clone-perf.spec.ts`)

### Unit / Component Tests (Early Core Logic Without Implementation)
- [X] T021 [P] Unit test graph ID + node/edge uniqueness utilities (`tests/unit/graph-ids.test.ts`)
- [X] T022 [P] Unit test serialization deterministic ordering util (`tests/unit/serialization-order.test.ts`)
- [X] T023 [P] Unit test debounce autosave scheduler (mock timer) (`tests/unit/autosave-scheduler.test.ts`)
- [X] T024 [P] Unit test undo/redo stack operations depth enforcement (`tests/unit/undo-stack.test.ts`)
 - [ ] T060 [P] Unit test atomic node+edge creation invariant (simulate edge failure -> rollback node) (`tests/unit/atomic-node-edge.test.ts`)
 - [ ] T069 [P] Unit test multi-line length limit (255 total incl newlines) (`tests/unit/multiline-length.test.ts`)
 - [ ] T070 [P] Unit test moveNode single persistence event after drag stop (`tests/unit/move-node.test.ts`)
 - [ ] T078 [P] Unit test viewport persistence serialize/restore logic (FR-035) (`tests/unit/viewport-persistence.test.ts`)
 - [ ] T079 [P] Unit test library isolation (operations on non-active maps do not mutate active canvas) (FR-034) (`tests/unit/library-isolation.test.ts`)
 - [ ] T094 [P] Unit test theme persistence loader fallback to default on invalid stored key (`tests/unit/theme-fallback.test.ts`)
 - [ ] T095 [P] Unit test subtle theme contrast ratio calculation >=4.5 (config-level) (`tests/unit/theme-contrast-config.test.ts`)
 - [ ] T096 [P] Unit test theme:changed event emission on switch (`tests/unit/theme-event.test.ts`)
 - [ ] T097 [P] Unit test CSS variable mapping completeness (all semantic keys map to vars) (`tests/unit/theme-css-vars.test.ts`)
 - [ ] T109 [P] Unit test BFS hierarchy level computation (fan-out & chain) (FR-042) (`tests/unit/node-level-bfs.test.ts`)
 - [ ] T110 [P] Unit test hierarchy cache invalidation on node/edge mutation (FR-042) (`tests/unit/node-level-cache.test.ts`)
 - [ ] T122 [P] Unit test re-parent algorithm basic fan-out (FR-043b) (`tests/unit/reparent-basic.test.ts`)
 - [ ] T123 [P] Unit test deterministic parent selection tie-break (earliest created) (FR-043b) (`tests/unit/reparent-parent-select.test.ts`)
 - [ ] T124 [P] Unit test atomic rollback on simulated failure (inject error before commit) (FR-043) (`tests/unit/reparent-atomic-rollback.test.ts`)
 - [ ] T125 [P] Unit test duplicate edge skip logic (FR-043b) (`tests/unit/reparent-duplicate-skip.test.ts`)
 - [ ] T140 [P] Unit test markdown serializer deterministic ordering + escaping (FR-045b) (`tests/unit/markdown-serializer.test.ts`)
 - [ ] T141 [P] Unit test export bounding box computation (FR-045a) (`tests/unit/export-bbox.test.ts`)
 - [ ] T142 [P] Unit test PNG export draws all nodes & edges count parity (mock canvas) (FR-045a) (`tests/unit/export-png-render.test.ts`)
 - [ ] T143 [P] Unit test exports do not emit graph mutation events (FR-045/immutability) (`tests/unit/export-no-events.test.ts`)
 - [ ] T157 [P] Unit test clone name generator increments correctly skipping existing numbers (FR-046a) (`tests/unit/clone-name-generator.test.ts`)
 - [ ] T158 [P] Unit test clone deep copy (IDs differ, text/positions equal) (FR-046) (`tests/unit/clone-deep-copy.test.ts`)
 - [ ] T159 [P] Unit test clone does not mutate source graph (FR-046) (`tests/unit/clone-source-immutability.test.ts`)
 - [ ] T165 [P] Unit test re-parent handle selection algorithm (dx/dy quadrants + tie) (FR-043d) (`tests/unit/reparent-handle-selection.test.ts`)

## Phase 3.3: Core Implementation (ONLY after above tests are added & failing)
- [X] T025 Implement persistence layer IndexedDB adapter `src/lib/indexeddb.ts` (init stores, CRUD, batch writes)
- [X] T026 Implement event bus `src/lib/events.ts` (typed emit/on, queue for tests)
- [X] T027 Implement graph domain utilities `src/lib/graph-domain.ts` (node/edge creation, validation, invariant enforcement)
 - [X] T028 Implement autosave hook `src/hooks/useAutosave.ts` (debounce + retry logic + events)
 - [X] T029 Implement undo/redo hook `src/hooks/useUndoRedo.ts` (command stack depth 10)
 - [X] T030 Implement graph store hook/context `src/state/graph-store.ts` (load graph, mutations calling domain utils)
- [X] T031 Implement performance metrics overlay component `src/components/ui/PerfOverlay.tsx` (dev only gating)
- [X] T032 Implement design tokens import & global theming (ensure focus styles) `src/styles/tokens.css` usage in `src/styles/globals.css`
- [X] T033 Implement base App shell `src/pages/App.tsx` (layout regions: canvas, side panel)
- [X] T034 Implement ReactFlow wrapper `src/components/graph/GraphCanvas.tsx` (node/edge types, pan/zoom config, selection)
- [X] T035 Implement ThoughtNode component `src/components/nodes/ThoughtNode.tsx` with inline editing + default text fallback (basic version)
 - [X] T036 Implement directional handles via native React Flow (n/e/s/w) + connection-based node creation (>=80px threshold)
 - [X] T037 Implement Graph List panel `src/components/panels/GraphListPanel.tsx` (list, select, delete confirm)
 - [X] T038 Implement graph rename & metadata actions `src/components/panels/GraphMetaPanel.tsx`
 - [X] T039 Implement accessibility helpers on nodes & handles (aria-labels, tab index ordering) integrated into components (basic spatial ordering via tab sequence)
- [X] T040 Wire undo/redo UI controls `src/components/ui/UndoRedoBar.tsx`
- [X] T041 Wire autosave status indicator `src/components/ui/SaveStatus.tsx`
 - [ ] T061 Enhance ThoughtNode for double‑click to enter edit mode & caret placement (FR-005a)
 - [ ] T062 Implement commit handling (Enter/blur) plain Enter commits; optional Escape cancel (FR-005b)
 - [ ] T064 Replace single-line input with auto-resizing textarea; Shift+Enter newline insertion (FR-005c)
 - [ ] T065 Auto-resize node container for multi-line text (max height or scroll strategy)
 - [ ] T080 Implement dedicated Map Library view component (replaces in-canvas list) (FR-031)
 - [ ] T081 Implement navigation control (Back to Library) + unsaved-change guard (FR-033, FR-030)
 - [ ] T082 Implement new map creation flow from Library (transition + root focus) (FR-001a, FR-032)
 - [ ] T083 Enforce non-destructive library operations (create/rename/delete isolated until map loaded) (FR-034)
 - [ ] T084 Persist & restore per-map viewport (pan/zoom) (FR-035)
 - [ ] T085 Reset selection & editing state cleanly on map switch (FR-032)
 - [ ] T098 Implement theme definitions module `src/lib/themes.ts` (classic + subtle) (FR-037, FR-038)
 - [ ] T099 Refactor tokens/colors to semantic CSS variables under theme root classes (FR-036, FR-037)
 - [ ] T100 Implement theme persistence (settings store read/write) with preload before first paint (FR-039)
 - [ ] T101 Implement global theme provider / store & event emission `theme:changed` (FR-040)
 - [ ] T102 Implement Theme Manager UI in Details pane with visual separation header "Global Theme" (FR-036, FR-040a)
 - [ ] T103 Implement fallback invalid stored theme key -> default + warning (FR-039)
 - [ ] T104 Add performance metric capture for theme switch duration (FR-040)
 - [ ] T111 Implement hierarchy level computation (BFS + cache) (FR-042)
 - [ ] T112 Display node level in Details pane (GraphMetaPanel) (FR-042)
 - [ ] T113 Fallback root detection on load (first node by created timestamp) (FR-042)
 - [ ] T126 Implement deletion domain logic (parent/children resolution, edge diff, validation) (FR-043..FR-043c)
 - [ ] T127 Implement trash-can UI control (selected node overlay, disabled for root) (FR-043a)
 - [ ] T128 Implement ordered event emission (node:deleted then edge:created) & update types (FR-043c)
 - [ ] T129 Integrate hierarchy cache invalidation & mutation counter increment on deletion (FR-043)
 - [ ] T130 (Backlog) Wrap deletion as single undo/redo compound action (FR-043) – optional post-MVP
 - [ ] T144 Implement Map Actions UI section in Details pane (FR-044)
 - [ ] T145 Wire Delete Map button to removeGraph + view transition (FR-044)
 - [ ] T146 Implement markdown export utility (FR-045b)
 - [ ] T147 Implement PNG export utility (FR-045a)
 - [ ] T148 Implement export download trigger helper (anchor/objectURL abstraction) (FR-045a/045b)
 - [ ] T149 Integrate export actions into Map Actions UI (FR-045)
 - [ ] T150 Add export performance timing (optional) (FR-045a performance note)
 - [ ] T160 Implement clone utility & persistence (FR-046)
 - [ ] T161 Wire Clone action into Map Actions UI (FR-046b)
 - [ ] T162 Add clone performance timing metric (optional) (FR-046 performance)
 - [ ] T167 Implement re-parent edge handle assignment logic (nearest cardinal selection) (FR-043d)
 - [ ] T126 Implement deletion domain logic (parent/children resolution, edge diff, validation) (FR-043..FR-043c)
 - [ ] T127 Implement trash-can UI control (selected node overlay, disabled for root) (FR-043a)
 - [ ] T128 Implement ordered event emission (node:deleted then edge:created) & update types (FR-043c)
 - [ ] T129 Integrate hierarchy cache invalidation & mutation counter increment on deletion (FR-043)
 - [ ] T130 (Backlog) Wrap deletion as single undo/redo compound action (FR-043) – optional post-MVP

## Phase 3.4: Integration
- [ ] T042 Integrate autosave + event bus into GraphCanvas lifecycle
- [ ] T043 Integrate undo/redo with event bus & graph store mutations
- [ ] T044 Integrate performance metrics overlay toggle (feature flag or env)
- [ ] T045 Implement accessibility tab ordering algorithm (spatial sort) in `graph-domain.ts`
- [ ] T046 Implement storage quota measurement & warning banner `src/components/ui/QuotaWarning.tsx`
- [ ] T047 Implement orphan edge cascade delete logic inside edge/node removal domain paths
- [ ] T048 Implement validation failure banner (node text too long, persistence validation error)

## Phase 3.5: Polish
- [ ] T049 [P] Refine styling & focus outlines (WCAG contrast check) `src/styles/tokens.css`
- [ ] T050 [P] Add axe automated accessibility test script (`tests/integration/accessibility.spec.ts` enhancement)
- [ ] T051 [P] Add performance synthetic 500-node fixture & load test (`tests/integration/perf-load.spec.ts`)
- [ ] T052 [P] Add export (DEV ONLY temporary) JSON function for debugging `src/lib/debug-export.ts` (behind flag)
- [ ] T053 Remove duplication & dead code (scan lib + hooks) `scripts/prune-report.md`
- [ ] T054 Update quickstart with any new flags (perf overlay, export) `/specs/001-build-an-application/quickstart.md`
- [ ] T055 Manual validation checklist execution record `/specs/001-build-an-application/manual-validation.md`
- [ ] T056 Final coverage & performance report generation `scripts/report-summary.md`
 - [ ] T063 Update quickstart & user help to document double‑click editing `/specs/001-build-an-application/quickstart.md`
 - [ ] T071 Update quickstart/docs for multi-line editing (Shift+Enter) & reposition drag
 - [ ] T072 Update serialization contract to note newline characters in node text
 - [ ] T086 Update quickstart/docs to describe Library vs Canvas separation & navigation (FR-031..FR-035)
 - [ ] T087 Add manual validation checklist entries for Library ↔ Canvas transitions & viewport restore
 - [ ] T105 Update quickstart/docs for Theme Manager usage & global scope labeling (FR-036..FR-040a)
 - [ ] T106 Add manual validation checklist entries for theme switching, persistence, accessibility contrast
 - [ ] T107 Extend performance overlay to display last theme switch timing metric
 - [ ] T114 Update quickstart/docs to mention node level display semantics (FR-042)
 - [ ] T115 Add manual validation checklist entries for hierarchy levels (FR-042)
 - [ ] T131 Update events contract doc for deletion ordering & root prohibition (FR-043c, FR-043a)
 - [ ] T132 Update quickstart/docs for node deletion & re-parent semantics (FR-043..FR-043b)
 - [ ] T133 Add manual validation checklist entries for deletion scenarios & performance target (FR-043)
 - [ ] T134 Add performance metric (mark/measure) around deletion operation (FR-043 performance)
 - [ ] T151 Update quickstart/docs for Map Actions section & delete map from Details pane (FR-044)
 - [ ] T152 Update quickstart/docs for Export PNG & Markdown usage (FR-045a, FR-045b)
 - [ ] T153 Add manual validation checklist entries for exports (PNG visual, Markdown structure) (FR-045)
 - [ ] T163 Update quickstart/docs for Clone Map action (FR-046..FR-046b)
 - [ ] T164 Add manual validation checklist entries for clone scenarios & performance target (FR-046)
 - [ ] T168 Update quickstart/docs to note re-parent handle direction logic (FR-043d)
 - [ ] T131 Update events contract doc for deletion ordering & root prohibition (FR-043c, FR-043a)
 - [ ] T132 Update quickstart/docs for node deletion & re-parent semantics (FR-043..FR-043b)
 - [ ] T133 Add manual validation checklist entries for deletion scenarios & performance target (FR-043)
 - [ ] T134 Add performance metric (mark/measure) around deletion operation (FR-043 performance)

### Undo / Redo (Spec 002) – Tests First Then Implementation
#### Contract & Unit Tests (Must fail first)
 - [ ] T169 [P] Contract test undo history exclusion (export & clone produce no entries) (`tests/contract/undo-exclusion.test.ts`) (FR-004, FR-027, FR-028)
 - [X] T170 [P] Unit test history depth rollover (push 101 entries -> oldest dropped, size=100) (`tests/unit/undo-depth-rollover.test.ts`) (FR-026)
 - [X] T171 [P] Unit test single drag yields one entry (simulate drag lifecycle) (`tests/unit/undo-move-single-entry.test.ts`) (FR-015)
 - [X] T172 [P] Unit test text commit only (no entry on no-op / abandoned) (`tests/unit/undo-text-noop.test.ts`) (FR-016, FR-018)
 - [X] T173 [P] Unit test redo cleared after new change post-undo (`tests/unit/undo-redo-clear.test.ts`) (FR-006)
 - [ ] T174 [P] Unit test deletion undo restores original relationships & removes interim edges (`tests/unit/undo-delete-restore.test.ts`) (FR-011)
 - [ ] T175 [P] Unit test creation undo removes node & edges then redo restores identically (`tests/unit/undo-create-redo.test.ts`) (FR-009, FR-010)
 - [ ] T176 [P] Unit test sequential mixed changes reverse in LIFO order (`tests/unit/undo-mixed-sequence.test.ts`) (FR-020)
 - [ ] T177 [P] Unit test clone resets history (empty after switch) (`tests/unit/undo-clone-reset.test.ts`) (FR-027)
 - [ ] T178 [P] Unit test graph switch resets history (`tests/unit/undo-graph-switch-reset.test.ts`) (FR-023)

#### Integration Tests
 - [ ] T179 [P] Integration test node deletion undo/redo full cycle (`tests/integration/undo-delete-cycle.spec.ts`) (FR-011, FR-012)
 - [ ] T180 [P] Integration test text edit multi commits then multi undo (`tests/integration/undo-text-multi.spec.ts`) (FR-013, FR-016)
 - [ ] T181 [P] Integration test move then undo then redo (`tests/integration/undo-move-cycle.spec.ts`) (FR-014)
 - [ ] T182 [P] Integration test mixed sequence create/edit/move/delete undo chain (`tests/integration/undo-mixed-sequence.spec.ts`) (FR-005, FR-020)
 - [ ] T183 [P] Integration test redo disabled after new change (`tests/integration/undo-redo-clear.spec.ts`) (FR-006)
 - [ ] T184 [P] Integration test session reload clears history (buttons disabled) while graph state persisted (`tests/integration/undo-session-reload.spec.ts`) (FR-021)
 - [ ] T185 [P] Integration test depth limit (perform 105 edits -> oldest 5 not undoable) (`tests/integration/undo-depth-limit.spec.ts`) (FR-026)

#### Implementation Tasks
 - [ ] T186 Implement history manager with depth 100 drop-oldest policy (FR-026)
 - [ ] T187 Integrate creation/deletion/text/position commits to push entries (FR-003, FR-015, FR-016)
 - [ ] T188 Implement undo operation (switch on entry type, ensure atomic state application) (FR-005, FR-009..FR-015)
 - [ ] T189 Implement redo operation (FR-002, FR-010..FR-014)
 - [ ] T190 Implement deletion undo relationship restoration & interim edge removal reconciliation (FR-011)
 - [ ] T191 Implement redo for deletion with deterministic re-parent handles (FR-012)
 - [ ] T192 Integrate redo clearing logic on new change after undo (FR-006)
 - [ ] T193 Ensure exclusion of export/clone/theme/view actions (FR-004, FR-027, FR-028)
 - [ ] T194 Wire Undo/Redo buttons disabled state logic (FR-007, FR-008, FR-022)
 - [ ] T195 Add accessibility labels & aria-disabled states (FR-024)
 - [ ] T196 Ensure atomic visual updates (batch state) during undo/redo (FR-025)
 - [ ] T197 Reset history on graph switch & clone (FR-023, FR-027)
 - [ ] T198 Prevent root creation/history pollution on load (baseline clean) (FR-021)
 - [ ] T199 Documentation updates (quickstart + spec cross-link notes) (FR-001..FR-003 summary)

#### Polish & Backlog
 - [ ] T200 Add performance metric marks around undo/redo operations
 - [ ] T201 Backlog: future keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z) design note
 - [ ] T202 Backlog: multi-select grouped history entry
 - [ ] T203 Backlog: text edit merge window option

## Dependencies
- Setup (T001-T008) before tests.
- All tests (T009-T024) must exist & fail before implementing core (T025+).
- Persistence (T025) before graph store (T030) & autosave (T028) depends on persistence.
- Domain utilities (T027) before hooks (T028, T029) and components (T034-T036).
- Graph store (T030) before GraphCanvas (T034) & panels (T037, T038).
- Accessibility helpers (T039) depend on ThoughtNode (T035) & handles (T036).
- Integration tasks (T042-T048) depend on core components/hooks completed.
- Polish tasks (T049+) after integration stable.
 - Edit-related integration tests (T057-T059, T066-T068) precede implementation enhancements (T061-T065) per TDD.
 - Atomic invariant unit test (T060) precedes any refactors to creation flow.
 - Library separation integration tests (T073-T077) must be authored & failing before implementing T080-T085.
 - Viewport persistence unit test (T078) precedes implementation task T084.
 - Library isolation unit test (T079) precedes implementation task T083.
 - Theme contract & config tests (T088-T089) MUST precede theme implementation tasks (T098+).
 - Theme integration tests (T090-T093) MUST precede implementation tasks (T098+).
 - Theme unit tests (T094-T097) MUST precede implementation tasks (T098+).
 - Theme implementation ordering: T098 (definitions) → T099 (CSS vars) → T100 (persistence preload) → T101 (provider & events) → T102 (UI) → T103 (fallback) → T104 (performance metric). Docs/polish (T105-T107) after successful integration tests pass.
 - Hierarchy tests (T108, T109-T110) MUST precede hierarchy implementation tasks (T111-T113).
 - Hierarchy implementation ordering: T111 (compute + cache) → T113 (root detection integrated) → T112 (Details pane display). Docs/polish (T114-T115) after tests pass.
 - Deletion tests (T116-T125) MUST precede deletion implementation tasks (T126-T129).
 - Deletion implementation ordering: T126 (domain logic) → T127 (UI control) → T128 (ordered events) → T129 (cache invalidation ensure) → (optional) T130 (undo compound). Docs/polish (T131-T133) + performance metric (T134) after stable implementation & passing tests.
 - Export tests (T135-T143) MUST precede export implementation tasks (T144-T149).
 - Export implementation ordering: T144 (Map Actions UI skeleton) → T145 (Delete Map wiring) → T146 (markdown utility) → T147 (PNG utility) → T148 (download helper) → T149 (UI integration). Docs/polish (T151-T153) after tests pass. Performance metric (T150 optional) can follow utilities.
 - Clone tests (T154-T159) MUST precede clone implementation tasks (T160-T161).
 - Clone implementation ordering: T160 (utility) → T161 (UI wiring) → optional performance metric T162. Docs/polish (T163-T164) after implementation passes tests.
 - Re-parent handle tests (T165, T166) MUST precede implementation task (T167). Docs update (T168) after successful tests & implementation.

## Parallel Execution Examples
```
# Example 1: Run initial contract test authoring in parallel
Task: T009 Contract test persistence schema validation
Task: T010 Contract test serialization ordering
Task: T011 Contract test events emission shape

# Example 2: Run integration scenario test skeletons
Task: T012 Create first node & autosave
Task: T013 Directional handle node creation
Task: T014 Rapid creation spam
Task: T015 Reload autoload last map
Task: T016 Delete graph confirm
Task: T017 Text length enforcement
Task: T018 Undo/redo depth
Task: T019 Pan & zoom perf baseline
Task: T020 Accessibility tab order & aria labels

# Example 3: Early unit utility tests
Task: T021 Graph ID uniqueness utilities
Task: T022 Serialization ordering util
Task: T023 Autosave scheduler debounce
Task: T024 Undo stack depth enforcement
```

## Notes
- [P] tasks = different files, no dependencies
- Commit after each task; ensure failing tests before implementing
- Maintain coverage thresholds (overall >=80%, domain critical >=90%)
- Use small PRs (<300 added LOC) per constitution Principle 1
- Performance metrics overlay optional but instrument marks early

## Validation Checklist
- [ ] All contract files mapped to tests (persistence-schema, events, serialization)
- [ ] All entities (Graph, Node, Edge, UndoEntry) have implementation tasks
- [ ] Tests precede implementation tasks
- [ ] Parallel tasks only touch unique files
- [ ] Accessibility & performance tasks included before polish completion
- [ ] Coverage & performance report tasks present

