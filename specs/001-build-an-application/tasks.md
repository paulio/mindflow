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
 - [ ] T058 [P] Integration test Enter/blur commits edit without newline (FR-005b) (`tests/integration/edit-commit.spec.ts`)
 - [ ] T059 [P] Integration test edit mode idempotency + Enter no-op (no text change) (`tests/integration/edit-idempotent.spec.ts`)

### Unit / Component Tests (Early Core Logic Without Implementation)
- [X] T021 [P] Unit test graph ID + node/edge uniqueness utilities (`tests/unit/graph-ids.test.ts`)
- [X] T022 [P] Unit test serialization deterministic ordering util (`tests/unit/serialization-order.test.ts`)
- [X] T023 [P] Unit test debounce autosave scheduler (mock timer) (`tests/unit/autosave-scheduler.test.ts`)
- [X] T024 [P] Unit test undo/redo stack operations depth enforcement (`tests/unit/undo-stack.test.ts`)
 - [ ] T060 [P] Unit test atomic node+edge creation invariant (simulate edge failure -> rollback node) (`tests/unit/atomic-node-edge.test.ts`)

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
 - [X] T036 Implement directional handle interaction logic `src/components/nodes/NodeHandles.tsx` (drag threshold 80px)
 - [X] T037 Implement Graph List panel `src/components/panels/GraphListPanel.tsx` (list, select, delete confirm)
 - [X] T038 Implement graph rename & metadata actions `src/components/panels/GraphMetaPanel.tsx`
 - [X] T039 Implement accessibility helpers on nodes & handles (aria-labels, tab index ordering) integrated into components (basic spatial ordering via tab sequence)
- [X] T040 Wire undo/redo UI controls `src/components/ui/UndoRedoBar.tsx`
- [X] T041 Wire autosave status indicator `src/components/ui/SaveStatus.tsx`
 - [ ] T061 Enhance ThoughtNode for double‑click to enter edit mode & caret placement (FR-005a)
 - [ ] T062 Implement commit handling (Enter/blur) + prevent newline insertion (FR-005b) & optional Escape cancel logic

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

## Dependencies
- Setup (T001-T008) before tests.
- All tests (T009-T024) must exist & fail before implementing core (T025+).
- Persistence (T025) before graph store (T030) & autosave (T028) depends on persistence.
- Domain utilities (T027) before hooks (T028, T029) and components (T034-T036).
- Graph store (T030) before GraphCanvas (T034) & panels (T037, T038).
- Accessibility helpers (T039) depend on ThoughtNode (T035) & NodeHandles (T036).
- Integration tasks (T042-T048) depend on core components/hooks completed.
- Polish tasks (T049+) after integration stable.
 - New double-click edit implementation tasks (T061, T062) depend on ThoughtNode base (T035) and should precede undo integration refinements.
 - Edit-related integration tests (T057-T059) precede implementation (T061-T062) per TDD; atomic invariant unit test (T060) precedes any refactors to creation flow.

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

