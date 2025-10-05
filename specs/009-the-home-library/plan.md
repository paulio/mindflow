# Implementation Plan: Home Library Map Thumbnails

**Branch**: `[009-the-home-library]` | **Date**: 2025-10-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `D:/mindflow/specs/009-the-home-library/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect project type from repository layout (single front-end SPA)
   → Set Structure Decision based on actual directories
3. Populate Constitution Check using Mindflow Constitution v1.0.0
4. Evaluate Constitution Check at outset
   → If violations exist: document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → author `research.md`
   → If open unknowns remain: flag blockers before proceeding
6. Execute Phase 1 → produce `data-model.md`, `contracts/`, `quickstart.md`, update agent context file
7. Re-evaluate Constitution Check after Phase 1
   → If new violations appear: refine design and repeat Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → summarize `/tasks` command approach (do NOT create `tasks.md`)
9. STOP — ready for `/tasks`
```

## Summary
Deliver persistent 320×180 PNG thumbnails for every map in the Home/Library grid by capturing PNG export output, caching it in IndexedDB, and orchestrating automatic refresh flows (export completion, editor close, idle). The work spans persistence helpers, graph-store triggers, and Map Library UI so creators instantly recognize maps while retaining accessible placeholders, telemetry, and retry behaviour when thumbnails fail.

## Technical Context
**Language/Version**: TypeScript 5.x with React 18  
**Primary Dependencies**: React Flow 11, Vite 7, Zustand graph store, JSZip, `idb`  
**Storage**: Browser IndexedDB (graphs, references, thumbnail blobs)  
**Testing**: Vitest (unit & contract), Playwright (integration)  
**Target Platform**: Desktop-class Chromium, Firefox, Safari  
**Project Type**: Single front-end SPA  
**Performance Goals**: Cached thumbnails render ≤1 s post Home/Library load; lazy loading keeps scroll interactions smooth  
**Constraints**: 10 MB thumbnail cache with LRU eviction, offline-friendly behaviour, structured console telemetry for refresh outcomes  
**Scale/Scope**: Dozens of maps per workspace, concurrent background refreshes, retry-once policy for failures

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle 1 – Code Quality & Readability**: Share constants for dimensions/status, document new graph-store actions, keep helper complexity ≤10, and remain lint-clean.
- **Principle 2 – TDD & Coverage**: Begin with failing contract/unit/integration tests covering persistence, refresh triggers, retry/eviction logic; maintain ≥90% coverage on touched modules and ≥80% overall.
- **Principle 3 – UX & Accessibility**: Apply design tokens, ensure alt text and focus states, define placeholder/progress/error behaviour upfront, and comply with WCAG 2.1 AA.
- **Principle 4 – Performance & Observability**: Enforce ≤1 s thumbnail render, avoid N+1 IndexedDB reads via batching/lazy load, emit structured console logs for refresh outcomes, and validate eviction strategy instrumentation.

✅ **Initial Constitution Check: PASS** — Non-functional targets delegated to Phase 0 research for precise thresholds.

## Project Structure

### Documentation (this feature)
```
specs/009-the-home-library/
├── plan.md              # This document (/plan output)
├── research.md          # Phase 0 research findings (/plan)
├── data-model.md        # Phase 1 entity/state design (/plan)
├── quickstart.md        # Phase 1 integration scenario guide (/plan)
├── contracts/           # Phase 1 schemas & failing tests (/plan)
└── tasks.md             # Phase 2 output (/tasks command only)
```

### Source Code (repository root)
```
src/
├── components/
│   ├── pages/MapLibrary.tsx         # Library grid + thumbnail rendering
│   ├── panels/                      # Shared layout containers
│   └── ui/                          # Tokens-based primitives (skeletons, badges)
├── lib/
│   ├── indexeddb.ts                 # Persistence helpers for graph data & blobs
│   ├── export.ts                    # PNG export pipeline hook-in point
│   ├── events.ts                    # Event bus definitions for refresh notifications
│   └── autosave-scheduler.ts        # Idle/close scheduling utilities
├── state/graph-store.tsx            # Zustand store controlling refresh queue & statuses
└── hooks/
    ├── useAutosave.ts               # Idle detection / close triggers
    └── useUndoRedo.ts               # Interaction history (idle interplay)

 tests/
├── contract/                        # Persistence schema tests
├── integration/                     # Playwright Home/Library flows
└── unit/                            # Graph store & helpers
```

**Structure Decision**: Single front-end SPA; feature work updates IndexedDB helpers, graph-store actions, and Map Library UI with supporting automated tests under existing `tests/` suites.

## Phase 0: Outline & Research
1. **Outstanding Unknowns**
   - Confirm lazy-loading strategy and perceived latency expectations for a grid of dozens of thumbnails targeting ≤1 s render.
   - Validate IndexedDB blob quota behaviour across target browsers and how to enforce a 10 MB cap with predictable eviction.
   - Define structured console logging schema (fields, severity levels) for refresh outcomes aligned with debugging workflows.
   - Establish retry timing/backoff approach for the single automatic retry without overwhelming the export pipeline.

2. **Research Tasks**
   - Task: "Assess IndexedDB blob caching best practices (quota enforcement, eviction policies) for offline-first React SPAs managing PNG thumbnails."
   - Task: "Gather UX baselines for responsive thumbnail grids (lazy-load thresholds, skeleton vs. placeholder usage) that keep perceived load ≤1 s."
   - Task: "Identify structured console logging patterns for client-side asset refresh outcomes (fields, batching, severity)."
   - Task: "Review retry/backoff strategies for short-lived browser background tasks balancing reliability and resource usage."

3. **`research.md` Deliverable**
   - Capture each finding with **Decision**, **Rationale**, and **Alternatives**.
   - Translate outcomes into explicit constraints for design (lazy-load thresholds, eviction enforcement, log schema, retry/backoff timings).
   - Note measurement/validation approach (DevTools performance capture, IndexedDB inspection) for later verification.

**Output**: `research.md` documenting resolved unknowns and resulting constraints.

## Phase 1: Design & Contracts
*Prerequisite: `research.md` decisions finalized*

1. **Data Model (`data-model.md`)**
   - Detail `MapThumbnailAsset` fields (`mapId`, `status`, `blobKey`, `width`, `height`, `updatedAt`, `sourceExportAt`, `trigger`, `retryCount`, `failureReason`).
   - Describe relationship to `MapLibraryEntry` and graph metadata; define lifecycle transitions (queued → refreshing → ready / failed) and retry limit (max two attempts including retry).
   - Document eviction metadata (byte size, lastAccessed) supporting 10 MB LRU enforcement and cache health metrics.

2. **Contracts (`contracts/` directory)**
   - Author schema definitions (TypeScript types or JSON schema) for `thumbnail-cache-entry` persistence records and `thumbnail-refresh-event` telemetry payloads.
   - Outline IndexedDB transaction contracts (read-modify-write, error handling) and event bus payload spec consumed by Map Library UI.
   - Create placeholder Vitest contract tests that currently fail, asserting schema validation and required fields (mapId, status, retryCount, updatedAt).

3. **Contract & Unit Tests**
   - Add failing Vitest tests covering: export pipeline writing/updating cache entries, eviction trimming once 10 MB reached, retry count enforcement, and structured log formatting.
   - Add state-management unit tests for graph-store actions triggered by export completion, idle timer, and editor close events.

4. **Quickstart (`quickstart.md`)**
   - Outline Playwright flow: create map, edit, wait 10 s idle trigger, verify placeholder → thumbnail swap ≤1 s, confirm alt text, inspect structured console log.
   - Include failure path: inject corrupt thumbnail, observe retry attempt, check final placeholder with logged failure metadata.

5. **Agent Context Update**
   - Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot` after drafting artifacts; summarize new constraints (cache size, LRU, retry, logging) while preserving manual notes and keeping file <150 lines.

**Output**: `data-model.md`, `contracts/` schemas + failing tests, `quickstart.md`, updated `.github/copilot-instructions.md`.

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do — DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base.
- Derive tasks from Phase 1 artifacts: schema enforcement, graph-store updates, lazy-loading UI work, telemetry wiring, and retry instrumentation.
- Map each contract schema to a contract test task [P]; each entity/state mutation to unit test + implementation tasks; each acceptance scenario to Playwright coverage.
- Include observability/performance validation tasks (structured log checks, render timing capture) to satisfy constitutional gates.

**Ordering Strategy**:
- TDD-first: write failing tests prior to implementation.
- Dependency chain: persistence schema → graph-store actions → UI rendering → telemetry/logging.
- Mark [P] where tasks touch disjoint files (e.g., logging schema vs. UI placeholder styles) to allow parallel effort.

**Estimated Output**: 25–30 ordered tasks in `tasks.md`.

**IMPORTANT**: This phase is executed by the `/tasks` command, NOT by `/plan`.

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (`/tasks` command creates `tasks.md`)  
**Phase 4**: Implementation (execute `tasks.md` following constitutional principles)  
**Phase 5**: Validation (run tests, execute `quickstart.md`, confirm performance targets)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| — | — | — |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [ ] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command — describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Constitution v1.0.0 — see `/memory/constitution.md`*
