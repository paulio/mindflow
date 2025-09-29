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

