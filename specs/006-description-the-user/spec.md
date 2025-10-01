# Feature Specification: Multi-Select Bounding Box for Nodes

**Feature Branch**: `006-description-the-user`  
**Created**: 2025-10-01  
**Status**: Draft  
**Input**: User description: "The user should be able to drag a bounding box around a number of nodes to mulit-select them. Once selected they can be moved collectively."

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies  
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a user working on a graph, I want to drag a selection rectangle (marquee) around multiple nodes so that I can move them together and reorganize related thoughts efficiently.

### Acceptance Scenarios
1. **Given** a graph with several nodes, **When** the user presses and drags on an empty canvas area creating a visible selection rectangle that intersects any part of multiple nodes, **Then** all intersecting nodes become selected together (overlap rule: any overlap counts).
2. **Given** multiple nodes are selected via the bounding box, **When** the user drags any one of the selected nodes, **Then** all selected nodes move together maintaining their relative positions.
3. **Given** multiple nodes are selected, **When** the user clicks on an empty canvas area without dragging, **Then** the multi-selection is cleared.
4. **Given** multiple nodes are selected, **When** the user initiates a new bounding box drag, **Then** the previous selection is replaced by the new overlapped set on mouse/touch release (only one marquee interaction active at a time).
5. **Given** the user starts a drag on top of a node (with or without modifiers), **When** they drag, **Then** the system treats it as a node (or group) drag and NOT a marquee (marquee can only start on empty canvas).
6. **Given** multiple nodes are selected, **When** the user performs an action that applies to a single selected node (e.g., rename), **Then** only that node is modified while selection state persists unless explicitly cleared. [NEEDS CLARIFICATION: Should certain single-node actions clear multi-selection?]
7. **Given** at least one node is selected, **When** the user adds a new node outside the selection, **Then** the existing selection remains unchanged. [NEEDS CLARIFICATION: Should creation clear selection?]
8. **Given** multiple nodes are selected, **When** the user presses an escape/cancel gesture, **Then** all selections are cleared.

### Edge Cases
- Marquee drag started then aborted (mouse up with negligible movement): should not change current selection.
- Nodes exactly on the selection rectangle boundary: considered selected (any overlap counts).
- Extremely fast click-drag with minimal distance: treat as click (no selection) if below threshold.
- Drag starting over UI overlays (panels/toolbars) should not initiate selection. [NEEDS CLARIFICATION: Should selection be allowed when starting over whitespace inside side panels?]
- Overlapping nodes: both should be selected if fully inside rectangle.
- Selection while graph is panned or zoomed: rectangle logic should reflect transformed coordinates (no visual mismatch). (Assumed requirement)
- Touch input: multi-select gesture parity. [NEEDS CLARIFICATION: Is touch multi-select required in this iteration?]
- Accessibility: keyboard-only users may need alternate multi-select method. [NEEDS CLARIFICATION: Include keyboard multi-select now?]

## Requirements *(mandatory)*

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: The system MUST allow users to initiate a multi-select by click-dragging (mouse primary button) from an empty canvas area to form a visible rectangular marquee.
- **FR-002**: The system MUST render a semi-transparent selection rectangle while the user is dragging.
-- **FR-003**: The system MUST highlight / mark each node whose bounding box overlaps (intersects) the marquee rectangle when the drag ends (any overlap rule).
-- **FR-004**: The system MUST support additive and toggled modification of the existing selection via modifier keys (e.g., Shift-drag adds overlapping nodes; Ctrl/Cmd-click toggles individual node membership) and MUST otherwise replace the selection when a plain (no-modifier) marquee finishes.
- **FR-005**: The system MUST allow all currently selected nodes to translate together when the user drags any one of them.
- **FR-006**: The system MUST preserve relative positions among selected nodes during collective movement.
- **FR-007**: The system MUST update each moved node’s stored position consistently after a multi-node drag completes.
- **FR-008**: The system MUST clear the multi-selection when the user clicks on empty canvas (single click, not drag).
- **FR-009**: The system MUST ignore marquee initiation if the drag starts on interactive UI elements (panels, buttons, controls outside the canvas).
-- **FR-010**: The system MUST apply an 8px minimum drag distance threshold (in screen space before zoom transform) to distinguish a click from a marquee.
- **FR-011**: The system MUST visually indicate selected nodes (e.g., consistent existing single-node selection style applied to each). [NEEDS CLARIFICATION: Distinct visual for multi vs single?]
- **FR-012**: The system MUST maintain selection state through viewport pan/zoom interactions (selection unaffected).
- **FR-013**: The system MUST allow pressing Escape (or a designated cancel action) to clear the current selection.
-- **FR-014**: The system MUST NOT treat drags that start on a node (with or without modifiers) as marquee selection (they initiate a node/group drag instead).
- **FR-015**: The system MUST support multi-selection of heterogeneous node types (thought, note, rect) equally.
- **FR-016**: The system MUST ensure performance: selecting up to an assumed maximum (e.g., 200 nodes) should complete marquee resolution within an acceptable UX frame budget. [NEEDS CLARIFICATION: Target performance metric]
- **FR-017**: The system MUST allow continuing to edit a previously selected single node only if multi-selection is not active (editing state cancels or prevents new marquee). [NEEDS CLARIFICATION: Editing behavior precedence]
- **FR-018**: The system MUST reset multi-selection when a different graph/map is loaded.
- **FR-019**: The system MUST expose an internal event or state change when multi-selection set changes (for future feature hooks).
- **FR-020**: The system SHOULD (optional) allow keyboard navigation to extend or contract selection. [NEEDS CLARIFICATION: Include initial keyboard scope now?]

### Key Entities *(include if feature involves data)*
- **Selection State**: Represents the current set of selected node IDs; transient (not persisted in long-term storage). Attributes: list of node IDs, timestamp of last update, anchor node (optional for future operations like alignment), mode (single | multi).
- **Marquee Gesture**: Ephemeral structure while dragging: start x/y, current x/y, derived bounds, active flag.

**Assumptions**
- Marquee selection uses overlap (any-intersection) inclusion rule.
- Multi-selection is not persisted across sessions (transient only).
- Touch multi-select may be deferred unless explicitly required.
- Additive selection & toggle are supported as defined (Shift adds via marquee; Ctrl/Cmd-click toggles nodes).
- Only one marquee gesture can be active at a time.

**Open Questions / Clarifications Needed**
<!-- Resolved: containment rule = overlap; additive selection = yes; marquee start on node = no; threshold = 8px; single active marquee = yes -->
- Visual differentiation for multi-selection vs single selection? (E.g., subtle outline vs highlight)
- Touch support scope now or later?
- Keyboard-based multi-select in scope?
- Behavior when creating a new node during active multi-selection (preserve or clear?).
- Performance target (max nodes, frame budget) to formalize FR-016.
- Editing precedence: if a node is in text edit mode, should marquee initiation be blocked?

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain (pending answers)
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed

---
