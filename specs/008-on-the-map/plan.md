
# Implementation Plan: Map Library Export & Import

**Branch**: `[008-on-the-map]` | **Date**: 2025-10-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `D:/mindflow/specs/008-on-the-map/spec.md`

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
Enable users to export one or more saved maps from the Map Library as a consolidated ZIP archive and import previously exported ZIPs, with conflict prompts, automatic schema migration, and progress indicators for long-running operations. Implementation will extend existing React + React Flow front-end logic, enriching IndexedDB persistence helpers with manifest packaging/unpacking, and enhancing the Map Library UI with batch selection, download, and upload affordances that align with accessibility and performance expectations.

## Technical Context
**Language/Version**: TypeScript 5.x with React 18  
**Primary Dependencies**: React Flow, Vite toolchain, JSZip (new dependency for ZIP creation), IndexedDB helpers (idb)  
**Storage**: Browser IndexedDB via existing persistence utilities  
**Testing**: Vitest (unit), Playwright (integration), existing contract tests harness  
**Target Platform**: Modern desktop browsers (Chromium, Firefox, Safari) running the Map Library UI  
**Project Type**: Web single-project (frontend with local persistence)  
**Performance Goals**: Maintain responsive UI with visual feedback <100ms and total export/import processing acceptable for up to ~50 maps (<5s target with progress indicator)  
**Constraints**: Must avoid blocking main thread—use progressive UI updates, shared design tokens, no silent overwrites, accessible dialogues  
**Scale/Scope**: Expected library size dozens of maps (<10 MB total export typical); handle worst-case entire library export/import gracefully

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle 1 – Code Quality**: Plan uses named constants for thresholds, adds documentation/comments for new APIs, keeps cyclomatic complexity below 10 by factoring helpers. Lint/type checks remain mandatory.
- **Principle 2 – TDD**: New behavior will start with failing contract + integration tests covering export/download flow, import validation, conflict prompts, and migration handling.
- **Principle 3 – UX & Accessibility**: Dialogs and progress indicators will leverage existing tokens, ensure keyboard control, announce status changes (aria-live), and document error/empty states.
- **Principle 4 – Performance & Observability**: Long-running operations show progress and avoid blocking; export/import routines will emit structured events via existing logging utilities. No new backend endpoints, but front-end telemetry will capture duration metrics.

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
```
src/
├── components/
│   ├── graph/
│   ├── nodes/
│   ├── pages/
│   ├── panels/
│   └── ui/
├── hooks/
├── lib/
│   ├── export.ts
│   ├── indexeddb.ts
│   ├── undo-stack.ts
│   └── types.ts
├── pages/
└── state/

tests/
├── contract/
├── integration/
└── unit/
```

**Structure Decision**: Single front-end project centered under `src/` with supporting tests in `tests/`; new export/import logic will live in `src/lib/` and UI updates within `src/components/panels/` & `src/components/pages/`.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
    - Vet browser-compatible ZIP tooling (JSZip vs. native CompressionStream) for bundles containing binary + JSON.
    - Investigate progressive UI patterns for long-running downloads/uploads in React (aria-live, focus trapping).
    - Confirm IndexedDB export/import consistency and snapshot locking during bulk reads.

2. **Generate and dispatch research agents**:
   ```
   Research JSZip (or alternative) usage for bundling multiple JSON assets in browser.
   Research best practices for React progress indicators & aria-live announcements during async file operations.
   Research IndexedDB bulk export/import patterns ensuring atomicity and data integrity.
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md summarizing ZIP tooling, UI feedback approach, and IndexedDB handling decisions.

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entities: MapSnapshot, ExportManifest, ImportSession, ConflictResolutionResult.
   - Document required fields (ids, names, timestamps, version metadata) and validation constraints (schema version, integrity checks).

2. **Generate API contracts** from functional requirements:
   - Define front-end contracts as TypeScript interface schemas + JSON manifest spec for export ZIP contents.
   - Create contract doc capturing structure of manifest.json and map payload files.

3. **Generate contract tests** from contracts:
   - Add failing contract tests ensuring manifest structure validation and conflict resolution summary handling.

4. **Extract test scenarios** from user stories:
   - Draft Playwright scenarios: multi-select export success, import conflict prompt path, malformed ZIP failure, migration success.
   - Quickstart instructions to walk through export and import flows including progress indicator verification.

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/* (manifest schema + tests), failing tests, quickstart.md, updated `.github/copilot-instructions.md` (or equivalent agent file).

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

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

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
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
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
