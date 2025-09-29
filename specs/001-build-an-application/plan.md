
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
Added FR-005a (double‑click activates edit mode) and FR-005b (Enter/blur commits). Strengthened FR-004 to require atomic node+edge creation (no orphan nodes). Acceptance scenarios renumbered to include editing interactions (scenarios 3 & 4). Plan adjustments:
1. New integration tests for double‑click entry, commit behavior, and edit-mode idempotency.
2. New unit/domain test enforcing rollback if edge creation fails (atomic invariant of FR-004).
3. ThoughtNode component enhancement to support double‑click activation & caret placement.
4. Update quickstart & documentation to mention double‑click editing.
5. Potential undo stack inclusion for edit begin/commit events (evaluate minimal granularity vs current text commit entries).

## Technical Context
**Language/Version**: TypeScript (ES2022 target) via Vite + React 18
**Primary Dependencies**: React, ReactFlow, panzoom helper (if needed), IndexedDB wrapper (idb) (optional), Testing: Vitest + React Testing Library, Playwright for integration.
**Storage**: IndexedDB (stores: graphs, graphNodes, graphEdges, settings); future JSON export/import (backlog).
**Testing**: Unit (Vitest), Component (RTL), Integration (Playwright), Performance smoke (custom script + PerformanceObserver), Accessibility (axe testing).
**Target Platform**: Modern desktop browsers (Chromium, Firefox, Safari latest), PWA potential backlog.
**Project Type**: Single web frontend (no backend service). All logic client-side.
**Performance Goals**: 500-node cold load <1500ms; warm load <500ms; autosave p95 <150ms; frame render avg <40ms p95 <80ms during pan/zoom.
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

**Estimated Output**: 34-38 tasks (expanded to include double‑click editing + atomic invariant tests) in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

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
