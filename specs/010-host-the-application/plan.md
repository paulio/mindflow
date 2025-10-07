
# Implementation Plan: Host the application on Azure Static Site

**Branch**: `010-host-the-application` | **Date**: 2025-10-07 | **Spec**: [`spec.md`](specs/010-host-the-application/spec.md)
**Input**: Feature specification from `specs/010-host-the-application/spec.md`

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
Deploy the Mindflow single-page application to Azure Static Web Apps with Entra ID authentication, neutral avatar fallback, per-user data isolation, and telemetry-driven operations that surface deployment failures while the previous release stays live.

## Technical Context
**Language/Version**: TypeScript 5.x with React 18  
**Primary Dependencies**: React Flow 11, Zustand graph store, Vite 7 toolchain, JSZip, `idb`, Azure Static Web Apps auth  
**Storage**: Browser IndexedDB (existing client database) with per-user map partitions  
**Testing**: Vitest (unit/contract), Playwright-driven integration specs, accessibility checks  
**Target Platform**: Azure Static Web Apps (production) + local Vite dev server  
**Project Type**: Web SPA (frontend + Azure Static Web Apps functions)  
**Performance Goals**: First meaningful paint ≤3s on broadband, retain existing client responsiveness  
**Constraints**: Entra ID auth only, no automated failure notifications, telemetry limited to request/deployment events, 90% monthly uptime, neutral avatar fallback  
**Scale/Scope**: Up to 5 active users per month; support operations via local-hosted access fallback

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle 1 – Code Quality & Readability**: Continue enforcing lint-clean commits, keep exported configuration helpers documented, and avoid cross-layer leakage when wiring Azure Static Web Apps auth helpers. Status: PASS.
- **Principle 2 – Test-Driven Development & Coverage**: Add/adjust contract, integration, and regression tests (Vitest/Playwright) for Entra ID flows, deployment telemetry, and avatar fallback before implementation. Status: PASS (plan accounts for new failing tests).
- **Principle 3 – UX & Accessibility**: Avatar fallback must honour design tokens, sign-in/out flows remain keyboard accessible, and empty/error states for failed auth are defined in quickstart/tests. Status: PASS.
- **Principle 4 – Performance & Efficiency**: Introduce telemetry instrumentation (request + deployment status) without regressing performance; respect 3s FMP and document caching/invalidation. Status: PASS.

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
├── index.tsx
├── components/
│   ├── graph/
│   ├── nodes/
│   ├── pages/
│   ├── panels/
│   └── ui/
├── hooks/
├── lib/
├── pages/
├── state/
└── styles/

tests/
├── contract/
├── integration/
├── setup/
└── unit/

docs/
└── ...
```

**Structure Decision**: Single-project SPA; feature work lives in existing `src` and `tests` directories with supporting docs under `specs/010-host-the-application/`.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - Azure Static Web Apps + Entra ID configuration specifics (redirect URIs, avatar claims, session invalidation hooks).
   - Deployment telemetry options that capture request/deployment events without auto-notify (Azure Monitor vs. Static Web Apps diagnostics).
   - Ops process for local-hosted map access when accounts disabled (ensure security guardrails).

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

**Output**: research.md capturing deployment configuration, telemetry pipeline, and support access safeguards.

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Define `DeploymentRecord`, `UserIdentity`, `MapWorkspace`, and `TelemetryEvent` with Azure-specific metadata and lifecycle notes.

2. **Generate API contracts** from functional requirements:
   - Document Azure Static Web Apps auth endpoints (`/.auth/login/aad`, `/.auth/me`) usage contracts.
   - Add schema for telemetry export (request log + deployment status payload) consumed by ops dashboards.
   - Publish artifacts under `specs/010-host-the-application/contracts/`.

3. **Generate contract tests** from contracts:
   - Add Vitest contract specs asserting auth profile fields, avatar fallback, and telemetry payload structure.
   - Mark tests pending/skipped with TODO until implementation.

4. **Extract test scenarios** from user stories:
   - Extend Playwright/Integration specs for sign-in, avatar fallback, and map isolation.
   - Document run sequence in `quickstart.md` for dev/QA validation (including ops telemetry review).

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/* schemas, failing contract test skeletons, quickstart.md, updated `.github/copilot-instructions.md`.

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
| _None_ |  |  |


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
- [x] Complexity deviations documented

---
*Based on Constitution v1.0.0 - See `/memory/constitution.md`*
