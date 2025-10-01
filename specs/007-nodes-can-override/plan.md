
# Implementation Plan: Node Border Colour Overrides & Hierarchical Defaults

**Branch**: `007-nodes-can-override` | **Date**: 2025-10-01 | **Spec**: `specs/007-nodes-can-override/spec.md`
**Input**: Feature specification from `specs/007-nodes-can-override/spec.md`

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
Provide depth-based initial assignment of node border colours using existing 10-colour palette, allow user override per node (palette or custom hex), persist original default, and enable reset to original without auto-changes after re-parenting. Fallbacks: root colour (#1e222b) on invalid palette; single-parent tree enforced; override actions undoable in single steps. No batch editing this iteration.

## Technical Context
**Language/Version**: TypeScript (React + React Flow)  
**Primary Dependencies**: react, reactflow, zustand (state via `useGraph`), Vite build  
**Storage**: In-browser (IndexedDB / local persistence already present)  
**Testing**: Vitest + existing contract/integration/unit test suites  
**Target Platform**: Browser (desktop web)  
**Project Type**: Single-page web application (frontend only)  
**Performance Goals**: Maintain current interaction responsiveness; no additional perf SLA introduced  
**Constraints**: Must not introduce visual lag during node creation or selection; no palette fetch (static)  
**Scale/Scope**: Palette fixed at 10 colours; typical graphs < 200 nodes (assumed)  

Rationale: Feature is purely client-side visual + state persistence enhancement; leverages existing node model extension.

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Derived Gates (Principles 1-4):
1. Code Quality: Keep functions < cyclomatic 10; introduce constants for palette and fallback keys; add doc comments for new exported selectors/mutators.
2. TDD & Coverage: Add failing tests first (unit: mapping function, reset behavior; integration: override workflow; undo/redo regression test). Maintain coverage ≥ existing baseline; no untested branches.
3. UX & Accessibility: Use design tokens where possible; ensure colour buttons have aria-labels & focus ring; no hard-coded style duplication outside tokens except the palette constants (documented).
4. Performance: Mapping O(1); no traversal beyond node creation path; avoid re-colouring passes on re-parent; no performance regression risk.

Initial Constitution Check: PASS (no violations anticipated; no NEEDS CLARIFICATION pending).

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
ios/ or android/
```
specs/007-nodes-can-override/
   spec.md
   plan.md
   research.md (to be generated Phase 0)
   data-model.md (Phase 1)
   quickstart.md (Phase 1)
   contracts/ (Phase 1 if any service contracts needed – likely none for pure client feature)

src/
   state/graph-store.tsx (extend node model / persistence fields)
   components/panels/GraphMetaPanel.tsx (add border override UI if placed here or new Detail pane component)
   components/nodes/* (apply border colour styling logic)
   lib/ (new palette constants, mapping helper)

tests/
   unit/node-border-mapping.test.ts
   integration/override-border-colour.spec.ts
   undo/ (existing) add undo-colour-override.test.ts
```

**Structure Decision**: Single-page web app; modifications localized to existing `src/state`, `src/components`, and new helper in `src/lib` + new tests.

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

**Identified Unknowns**: None (all clarifications resolved). Minimal research: confirm no conflict with existing node colour/background system & undo stack semantics.

**Research Tasks Executed (lightweight reasoning)**:
- Palette Source Confirmation: Verified palette presence in `GraphMetaPanel` for background colours; reused constant for border mapping to avoid duplication.
- Undo Integration: Reviewed existing undo tests (undo-depth, undo-move) to ensure adding colour override events fits existing stack abstraction.
- Persistence Strategy: Node already stores bg/text colours; add fields `borderOverrideColour?`, `originalBorderColour`, `borderPaletteIndex`, `borderOverrideFlag`.

**Decisions** recorded in `research.md` (to be generated):
- Reuse palette constant; define central export in `lib/themes.ts` or new `lib/palette.ts`.
- Add pure function `computeInitialBorderColour(nodeDepth: number, palette: string[]): { colour: string; index: number }`.
- Extend store actions: `overrideNodeBorder(id, hex)`, `clearNodeBorderOverride(id)`; integrate into undo stack as atomic entries.

**Output**: research.md with decisions above (will be created now).

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

**Design Steps**:
1. Data Model Extension: Document new node border fields & invariants in `data-model.md`.
2. Mapping Helper: Document pure function & signature (inputs: depth, palette; outputs: colour, paletteIndex).
3. Store Contracts: Since feature is client-only, no network API; create pseudo-contract markdown describing actions & state transitions in `contracts/` (e.g., `contracts/store-border-colour.md`).
4. Quickstart: Steps to verify feature manually (create nodes, override, undo, reset) in `quickstart.md`.
5. Tests (Phase 1 planning): Write failing unit test for mapping, failing integration test for override workflow, failing undo test.

**Contract Elements (logical, not HTTP)**:
- Action: `overrideNodeBorder(id, hex)` → Preconditions: valid #rrggbb; Effects: sets overrideFlag true, sets currentBorderColour, pushes undo entry.
- Action: `clearNodeBorderOverride(id)` → Preconditions: node has overrideFlag true; Effects: overrideFlag false, currentBorderColour = originalDefaultColour.

**Accessibility Considerations**:
- Provide aria-labels for colour buttons: e.g., `aria-label="Set border colour #556070"`.
- Ensure focus outline via existing focus ring classes.

**Post-Design Constitution Check**: PASS (no added violations; palette constant considered acceptable explicit constant list).

**Output**: data-model.md, research.md, quickstart.md, contracts placeholder, plus updated plan checklist.

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
- [x] Phase 1: Design complete (/plan command) (research.md, data-model.md, quickstart.md, contracts created)
- [x] Phase 2: Task planning approach documented (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented (none required)

---
*Based on Constitution v1.0.0 - See `/memory/constitution.md`*
