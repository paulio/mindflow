# Tasks: Reference Connections Between Nodes (Feature Branch `005-provide-the-ability`)

This plan enumerates implementation, QA, and polish tasks required to deliver all Functional Requirements (FR-001 .. FR-025) from `spec.md`.

Legend:
- [ ] = Not started
- [~] = In progress / partial
- [x] = Complete

## 1. Foundations & Planning
- [x] T-001 Confirm clarified decisions & freeze scope (Decision Log embedded in spec)  (FR-* all)
- [ ] T-002 Add CHANGELOG entry stub for feature introduction (meta)
- [ ] T-003 Create feature flag or rollout guard (if needed) — (Assumed NOT needed; skip if remains true)

## 2. Data Model & Persistence
- [ ] T-010 Extend connection persistence schema: add fields `style` (enum: single|double|none), `label` (string, optional), `labelHidden` (boolean) (FR-003, FR-010, FR-023, FR-024)
- [ ] T-011 Migration: default existing connections to `style: 'single'`, `label: ''`, `labelHidden: false` (FR-010)
- [ ] T-012 Update TypeScript types for ReferenceConnection (FR-010)
- [ ] T-013 Update serialization order tests to include new fields (FR-010, FR-024)
- [ ] T-014 Add contract test ensuring round-trip persistence of label visibility and style (FR-010, FR-023, FR-024)

## 3. Event & State Management
- [ ] T-020 Add store actions: createReferenceConnection, updateReferenceConnectionStyle, reattachReferenceConnectionEndpoint, deleteReferenceConnection, updateReferenceConnectionLabel, toggleReferenceConnectionLabelVisibility (FR-001, FR-003, FR-005, FR-008, FR-011, FR-012, FR-013, FR-019, FR-023, FR-024)
- [ ] T-021 Duplicate prevention logic in creation + endpoint reattach (FR-002, FR-006, FR-011)
- [ ] T-022 Enforce locked node rule in create & reattach (FR-019)
- [ ] T-023 Undo stack integration wrappers for each mutating action (FR-013)
- [ ] T-024 Batched undo group for sequential endpoint drags (FR-017, FR-013)
- [ ] T-025 Emit domain events for UI feedback (e.g., `reference:duplicate-blocked`, `reference:styleChanged`) (FR-011, FR-012)

## 4. UI: Canvas Rendering
- [ ] T-030 Render new reference connections distinct from existing structural edges (if separate category) (FR-001, FR-003)
- [ ] T-031 Draw arrowheads: single, double, none (FR-003)
- [ ] T-032 Curve paired opposite-direction connections outward (FR-022)
- [ ] T-033 Style adjustments for selection (stroke, glow, or emphasis) (FR-009)
- [ ] T-034 Subtle highlight animation for duplicate attempt (FR-011)
- [ ] T-035 Prevent self-connections (gesture cancel) (FR-002)
- [ ] T-036 Cancel partial drag gracefully (esc / invalid target drop) (FR-014)
- [ ] T-037 Enforce single active drag per connection (FR-017)
- [ ] T-038 Reattach endpoint behavior using default React Flow as far as possible (FR-005, FR-025)
- [ ] T-039 Support two separate directed connections A→B and B→A plus distinct double arrow (FR-021, FR-003)

## 5. UI: Detail / Properties Pane
- [ ] T-050 Display style selector (radio/icons) for selected connection (FR-012)
- [ ] T-051 Label editor (inline text field, 255 char limit, trims trailing whitespace) (FR-023, FR-024)
- [ ] T-052 Label visibility toggle (FR-023, FR-024)
- [ ] T-053 Show cascade notice when node is selected & has N references (prep for deletion prompt message) (FR-015)

## 6. UI: Connection Label
- [ ] T-060 Render anchored label along path midpoint (auto orientation; no background) (FR-023)
- [ ] T-061 Responsive reposition on node move / path recompute (FR-023)
- [ ] T-062 Hide when `labelHidden` true (FR-023, FR-024)
- [ ] T-063 Accessible name: include label text in connection’s aria-label if visible (FR-023)

## 7. Keyboard & Accessibility
- [ ] T-070 Ensure connection focusability (tab order) (FR-020)
- [ ] T-071 Delete / Backspace removes focused connection (FR-020)
- [ ] T-072 Arrow style buttons in detail pane have aria-labels (FR-012)
- [ ] T-073 Provide aria-label pattern: "Reference connection: A to B, single arrow" / "double arrow" / "no arrow" (FR-009, FR-003)
- [ ] T-074 Ensure highlight feedback is non-color-only (maybe brief thickness pulse) (FR-011, accessibility)

## 8. Duplicate & Feedback Mechanics
- [ ] T-080 Implement runtime duplicate detection set/hash for O(1) lookup (FR-002, FR-006, FR-011)
- [ ] T-081 Visual flash animation (CSS or canvas) duration <400ms (FR-011)
- [ ] T-082 Throttle duplicate feedback to prevent flicker on rapid repeated attempts (FR-011)

## 9. Deletion & Cascade
- [ ] T-090 Connection delete via contextual UI (button) (FR-007, FR-008)
- [ ] T-091 Node deletion cascade enumerates affected connections (FR-015)
- [ ] T-092 Show informational prompt / inline note for cascade (FR-015)
- [ ] T-093 Undo restores node and prior connections (FR-015, FR-013)
- [ ] T-094 Cannot delete while endpoint drag active: cancel then delete (FR-014, FR-006)

## 10. State Integrity & Edge Cases
- [ ] T-100 Reject operations targeting missing nodes (graceful no-op) (FR-014)
- [ ] T-101 Ensure style changes during drag are deferred until commit (FR-012)
- [ ] T-102 Block operations when either endpoint node locked (FR-019)
- [ ] T-103 Validate label before persist (length/trim) (FR-024)
- [ ] T-104 Ensure label hidden state persists across reload (FR-024)

## 11. Undo/Redo Specifics
- [ ] T-110 Implement inverse operations for create/delete/style/reattach/label change/toggle hide (FR-013)
- [ ] T-111 Group fine-grained drag updates into single undo entry (FR-017, FR-013)
- [ ] T-112 Add tests verifying undo fidelity for each operation (FR-013)

## 12. Testing
### Unit
- [ ] T-120 Duplicate prevention logic (FR-002)
- [ ] T-121 Endpoint reattach rule set (FR-005, FR-006)
- [ ] T-122 Style change state transition (FR-003, FR-012)
- [ ] T-123 Label visibility & persistence serialization (FR-023, FR-024)
- [ ] T-124 Undo/redo operations for each action (FR-013)
- [ ] T-125 Locked node blocking (FR-019)
- [ ] T-126 Curved rendering logic chooses distinct curvature for reverse edges (FR-022)
- [ ] T-127 Connection aria-label generation (FR-003, FR-009, FR-023)

### Integration / UI
- [ ] T-130 Create connection via drag (FR-001)
- [ ] T-131 Prevent duplicate creation highlight appears (FR-002, FR-011)
- [ ] T-132 Create opposite direction as separate edge (FR-021)
- [ ] T-133 Switch to double arrow style (FR-003, FR-012)
- [ ] T-134 Reattach endpoint to new node (FR-005)
- [ ] T-135 Reattach duplicate target blocked with highlight (FR-006, FR-011)
- [ ] T-136 Delete connection via button (FR-007, FR-008)
- [ ] T-137 Delete node cascades connections (FR-015)
- [ ] T-138 Undo after cascade restores connections (FR-015, FR-013)
- [ ] T-139 Label edit & hide toggle (FR-023, FR-024)
- [ ] T-140 Keyboard delete (FR-020)
- [ ] T-141 Style change while dragging deferred (FR-012, FR-014)

### Accessibility
- [ ] T-150 Tab focus cycles through connections (FR-020)
- [ ] T-151 Screen reader announces connection & style & label (FR-009, FR-003, FR-023)
- [ ] T-152 Highlight feedback accessible alternative (thickness / outline) (FR-011)

### Regression / Non-Functional
- [ ] T-160 Stress: rapid create/delete cycles maintain integrity (FR-014, FR-017)
- [ ] T-161 Stress: many connections basic pan/zoom interact remains responsive (FR-018)
- [ ] T-162 Serialization round trip for large set (FR-010, FR-024)

## 13. Documentation & Dev Support
- [ ] T-170 Update spec status to "Ready" after test coverage baseline met
- [ ] T-171 Add README section summarizing reference connections feature
- [ ] T-172 Changelog entry completion (initial stub filled) (meta)
- [ ] T-173 Add inline code comments for curvature & duplicate prevention logic (FR-022, FR-002)
- [ ] T-174 Developer guide snippet for adding new connection styles in future (extensibility)

## 14. Nice-to-Have (Defer if time-constrained)
- [ ] T-180 Convert paired directed edges → single double-arrow via quick action
- [ ] T-181 Auto-label suggestion (first letter of node titles) on creation
- [ ] T-182 Connection search/filter integration

## FR ↔ Task Mapping Summary
(Primary implementers can use to confirm coverage; some tasks map to multiple FRs.)
- FR-001: T-020, T-030, T-130
- FR-002: T-021, T-035, T-080, T-121, T-131
- FR-003: T-030, T-031, T-122, T-133, T-073
- FR-004: T-020, T-050, T-122, T-133
- FR-005: T-020, T-038, T-121, T-134
- FR-006: T-021, T-121, T-135
- FR-007: T-090, T-136
- FR-008: T-090, T-136
- FR-009: T-033, T-073, T-151
- FR-010: T-010, T-011, T-012, T-013, T-014, T-120, T-162
- FR-011: T-021, T-034, T-081, T-082, T-131
- FR-012: T-050, T-101, T-133, T-141
- FR-013: T-023, T-024, T-110, T-111, T-112, T-124, T-138
- FR-014: T-036, T-141, T-160
- FR-015: T-091, T-092, T-093, T-137, T-138
- FR-016: T-016 (implicit via style change code) *Add: covered by state mgmt review*
- FR-017: T-037, T-024, T-111, T-160
- FR-018: T-161 (observational), baseline architecture
- FR-019: T-022, T-102, T-125
- FR-020: T-070, T-071, T-140, T-150
- FR-021: T-039, T-132
- FR-022: T-032, T-126, T-173
- FR-023: T-060, T-061, T-062, T-063, T-139, T-123, T-151
- FR-024: T-010, T-011, T-014, T-103, T-104, T-123, T-139
- FR-025: T-038, T-025 (ensuring minimal divergence)

## 15. Sequencing Recommendation (High-Level)
1. Data & types (T-010..T-014, T-012) → 2. Store & events (T-020..T-025) → 3. Basic rendering & creation (T-030, T-031, T-035, T-036) → 4. Duplicate prevention & feedback (T-021, T-034, T-080..) → 5. Reattach & opposite edges (T-038, T-039, T-032) → 6. Style selector & arrow changes (T-050, T-012 integration) → 7. Label system (T-060..T-063) → 8. Undo/Redo full coverage (T-023, T-110..) → 9. Deletion cascade & lock rules (T-090..T-094, T-022) → 10. Keyboard & accessibility (T-070..T-074) → 11. Tests breadth (unit then integration) → 12. Docs & polish.

## 16. Exit Criteria
- All FRs mapped to at least one completed task
- Unit + integration tests green (core pathways: create, duplicate blocked, reattach, style change, delete, undo/redo, label hide)
- No unresolved TODOs referencing FRs
- Changelog & README updated
- Spec status can advance from Draft once ≥80% of core tasks (excluding nice-to-have) are complete & tests cover every MUST.

---
_End of tasks plan._
