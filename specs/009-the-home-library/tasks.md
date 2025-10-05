# Tasks: Home Library Map Thumbnails

**Branch**: `009-the-home-library`
**Design Inputs**: `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`
**Goal**: Implement persistent 320×180 Home/Library thumbnails with IndexedDB caching, auto-refresh triggers, LRU eviction, structured telemetry, and retry handling.

> Follow tasks in order unless marked [P] for parallel execution. Tests precede implementation (TDD). Reference Mindflow Constitution for quality gates.

## Phase 3.1 – Setup & Tooling
- [x] **T001** Ensure dependencies installed (`npm install`) and verify tooling versions noted in `plan.md`.
- [x] **T002** Review existing IndexedDB helpers in `src/lib/indexeddb.ts` and graph store in `src/state/graph-store.tsx`; outline integration points (notes only).
- [x] **T003 [P]** Configure placeholder Playwright and Vitest test stubs for new specs (e.g., add empty describe blocks) to confirm runner discovery.

## Phase 3.2 – Tests First (TDD)
- [x] **T004 [P]** Create failing contract tests in `tests/contract/thumbnail-contract.test.ts` covering cache entry schema validation, blob write atomicity, and LRU eviction.
- [x] **T005 [P]** Write failing unit tests in `tests/unit/graph-store-thumbnail.test.tsx` for graph-store refresh actions (export, idle, close) and retry enforcement.
- [x] **T006 [P]** Add failing unit tests in `tests/unit/indexeddb-thumbnail.test.ts` validating persistence helpers (write/update, eviction, structured logging payload).
- [x] **T007 [P]** Draft failing integration test scenario in `tests/integration/home-library-thumbnails.spec.ts` (Playwright) per `quickstart.md` happy path.
- [x] **T008 [P]** Add failing integration scenario for failure/retry handling in `tests/integration/home-library-thumbnails-failure.spec.ts` matching Quickstart Scenario 3.

## Phase 3.3 – Core Implementation
- [x] **T009 [P]** Implement `thumbnail-cache-entry` schema in `specs/009-the-home-library/contracts/thumbnail-cache-entry.schema.ts` (zod or similar) and export types.
- [x] **T010 [P]** Implement `thumbnail-refresh-event` schema in `specs/009-the-home-library/contracts/thumbnail-refresh-event.schema.ts` and share utilities for structured logging.
- [x] **T011** Extend `src/lib/indexeddb.ts` with thumbnail persistence helpers (write/update, blob storage, eviction respecting 10 MB cap, structured logging). Ensure runtime validation via schemas.
- [x] **T012** Update `src/state/graph-store.tsx` to enqueue/dequeue thumbnail refresh actions, track statuses, and enforce retry limit using new helpers.
- [x] **T013** Integrate idle/close triggers via `src/hooks/useAutosave.ts` (and related scheduling) to invoke refresh queue when editor idle/closed.
- [x] **T014** Wire export-completion hook in `src/lib/export.ts` to push refresh events and persist latest PNG to cache.
- [ ] **T015** Update `src/components/pages/MapLibrary.tsx` to render placeholders vs. thumbnails, show progress/failed states, and attach alt text per spec.
- [ ] **T016 [P]** Add reusable UI primitives (skeleton/loading badge) or tokens in `src/components/ui/` for thumbnail status indicators.

## Phase 3.4 – Integration & Observability
- [ ] **T017** Implement structured console logging utility in `src/lib/events.ts` (or dedicated module) emitting `ThumbnailRefreshEvent` payloads for success/failure.
- [ ] **T018** Add eviction/debug logging surfaces (dev-mode console warnings) when thumbnails removed due to 10 MB cap.
- [ ] **T019** Ensure Playwright/automation helpers can seed multiple maps for eviction scenario (extend test setup utilities under `tests/setup/`).
- [ ] **T020 [P]** Introduce configuration toggles or constants (e.g., retry backoff, idle threshold) in shared config module with documentation.

## Phase 3.5 – Polish & Validation
- [ ] **T021 [P]** Add targeted unit tests for UI components (`tests/unit/map-library-thumbnail-view.test.tsx`) verifying accessibility (alt text, focus states).
- [ ] **T022** Record performance measurement script or note (e.g., capture <1 s render via devtools) and add to documentation if thresholds met.
- [ ] **T023 [P]** Update user-facing docs or release notes summarizing thumbnail behaviour and offline considerations in `docs/` or README section.
- [ ] **T024** Execute full test suites (`npm run test`, `npm run lint`, Playwright scenarios) and log results; fix residual issues.

## Dependencies & Parallel Guidance
- Setup (T001–T003) precedes all other tasks.
- Tests (T004–T008) must be implemented and failing before corresponding implementation tasks (T009–T015).
- Schema tasks T009–T010 unblock IndexedDB helpers (T011) and logging utilities (T017).
- Graph store updates (T012) depend on persistence (T011) and logging schema (T010).
- UI integration (T015) depends on state + persistence layers (T011–T014).
- Parallel [P] tasks target distinct files (`contracts/`, tests, UI primitives, docs). Ensure no shared file conflicts before running simultaneously.
- Suggested parallel groups:
  - **Group A (Tests)**: T004, T005, T006, T007, T008
  - **Group B (Schemas & UI primitives)**: T009, T010, T016
  - **Group C (Polish)**: T021, T023 (after core implementation)

## Constitution Alignment
- Principle 1: T011–T018 include documentation/logging, T022 ensures complexity/perf notes.
- Principle 2: T004–T008 enforce TDD; T024 confirms coverage gates.
- Principle 3: T015, T016, T021 address accessibility and design tokens.
- Principle 4: T011, T017, T018, T022 cover performance metrics, eviction logging, and observability.

> All tasks should result in failing tests before implementation and green builds after completion. Update documentation artefacts (`data-model.md`, `research.md`, `quickstart.md`) if final decisions diverge from initial assumptions.
