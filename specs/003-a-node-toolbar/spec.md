# Feature Specification: Node Toolbar & Additional Node Types

**Feature Branch**: `003-a-node-toolbar`  
**Created**: 2025-09-30  
**Status**: Draft  
**Input**: User description: "A node toolbar in the graph editor that allows additional node types to be placed on the screen. To include a simple text note node, and simple rectangle node. Should be able to change the background and foreground colours of the nodes (via the detail pane when selected). The nodes should be included in the Undo/Redo stacks. The nodes can be placed in-front or behind the thought-nodes, via a choice in the detail pane. Tools can be toggled on or off but only one tool can be on at a time. Placement of a tool is when a selection is made at least 50px away from an existing node."

## Clarifications
### Session 1 (2025-09-30)
1. Distance metric: edge-to-edge, inclusive at 50px.
2. Tool remains active after placement until toggled off manually.
3. Placement during text edit commits the edit first.
4. Text Note: multi-line supported; Rectangle: no text.
5. Colors: palette + custom hex + picker (sample existing node).
6. Z-order: binary front/back only.
7. Toolbar nodes deletable (root thought node rule unchanged).
8. No Escape deactivation requirement.
9. Accessible names: "note", "rectangle", tools: "note tool", "rectangle tool".
10. Double-click editing parity with thought nodes.
11. (Update) Rectangle nodes will support resizing via visible drag handles when the Rectangle tool is active. Size changes persist and are undoable.

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
As a user organizing ideas visually, I want a toolbar to quickly add non-thinking decorative/support nodes (notes, colored rectangles) so I can annotate or visually group thoughts without disrupting existing thought node behaviors.

### Acceptance Scenarios
1. Toolbar Visibility & Single Selection: **Given** I open the graph canvas, **When** I view the toolbar, **Then** I see tools for "Text Note" and "Rectangle", and activating one deactivates any previously active tool.
2. Tool Activation Toggle: **Given** the Text Note tool is active, **When** I click it again, **Then** it deactivates (no tool active).
3. Placement Distance Constraint: **Given** the Text Note tool is active, **When** I click at a location at least 50px away from the nearest existing node, **Then** a new Text Note node appears at that location; **And** if I click closer than 50px, **Then** no new node is created.
4. Rectangle Node Creation: **Given** the Rectangle tool is active, **When** I place a rectangle, **Then** a rectangle node appears with default background & foreground colors.
5. Style Editing via Details Pane: **Given** I select a Text Note node, **When** I change its background and foreground colors in the details pane and commit, **Then** the node updates visually; **And** Undo becomes available.
6. Undo/Redo Creation: **Given** I create a Rectangle node, **When** I Undo, **Then** the rectangle disappears; **When** I Redo, **Then** it reappears with identical size, colors, and z-order.
7. Undo/Redo Style Change: **Given** I change a Text Note node's colors, **When** I Undo, **Then** its prior colors are restored; **When** I Redo, **Then** the new colors return.
8. Z-Order Front/Back Toggle: **Given** I select a Text Note node, **When** I choose "Send Behind" (or "Bring In Front") in the details pane, **Then** its stacking order updates relative to thought nodes; **And** Undo captures the change.
9. Mixed History Integrity: **Given** I create a note, recolor it, change z-order, create a rectangle, **When** I perform sequential Undo steps, **Then** each change reverses in reverse chronological order without affecting unrelated thought nodes.
10. Tool Deactivation on Non-Placement: **Given** a tool is active, **When** I press Escape, **Then** the tool deactivates without creating a node.
11. Selection Behavior: **Given** I place a new rectangle, **When** it appears, **Then** it becomes the selected node for immediate styling.
12. Overlap Prevention Near Threshold: **Given** I attempt to place a node within <50px of another, **When** placement is rejected, **Then** no partial visual artifact or orphan record remains.
13. Persistent Attributes on Reload: **Given** I modify a note's colors and z-order, **When** I reload the application, **Then** the note reappears with the saved colors and z-order (history cleared per global undo rules).
14. Tool Exclusivity: **Given** the Rectangle tool is active, **When** I activate the Text Note tool, **Then** Rectangle tool auto-deactivates.
15. No Impact on Thought Node Creation: **Given** a toolbar tool is active, **When** I perform a standard directional handle drag to create a thought node, **Then** the thought creation still works and the tool remains active (tool persists until manually toggled off).

### Edge Cases
- Clicking exactly at 50px edge-to-edge distance counts as valid placement (inclusive).
- Attempt to place when no tool active: no-op.
- Attempt to place while editing node text: current edit is accepted/committed first, then placement proceeds.
- Rapid double placement clicks: each distinct qualifying click results in a separate node (no artificial rate limiting required).
- Changing colors to identical values produces no Undo entry (consistent with existing no-op rule).
- Z-order changes that produce no visual difference (already at front/back) produce no Undo entry.
- Deleting a styled note/rectangle uses existing deletion semantics (deletable unless root which applies only to thought root).
- Rectangle resize not in scope (fixed size this release).
- Accessibility: default accessible name for Text Note nodes is "note"; Rectangle nodes use "rectangle".


## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: The system MUST provide a node toolbar visible in the graph editing view.
- **FR-002**: The toolbar MUST allow only one active tool at a time (activating a tool deactivates any previously active tool).
- **FR-003**: The system MUST support creation of a Text Note node type via the toolbar.
- **FR-004**: The system MUST support creation of a Rectangle node type via the toolbar.
- **FR-005**: A toolbar tool MUST toggle off when clicked while already active.
- **FR-006**: A node placement MUST only occur when the click/tap location results in the new node's default bounding box being at least 50px edge-to-edge from every existing node's bounding box (inclusive boundary allowed at exactly 50px).
- **FR-007**: Placement distance threshold (50px) is code-defined (no user UI to adjust).
- **FR-008**: Successful placement MUST create exactly one node of the active tool type at the clicked location; tool remains active after placement.
- **FR-009**: Newly created toolbar nodes MUST become the current selection immediately.
- **FR-010**: Text Note nodes MUST support multi-line editable text (double-click to edit, same interaction as thought nodes including Enter/Escape semantics already defined globally).
- **FR-011**: Rectangle nodes MUST NOT contain text (no inline editing behavior) in this release.
- **FR-012**: The details pane MUST allow changing background color of a selected Text Note or Rectangle node using a shared palette plus a custom color input.
- **FR-013**: The details pane MUST allow changing foreground (text) color of a Text Note node; foreground color control is hidden for Rectangle nodes.
- **FR-014**: Color changes MUST persist and reload with the graph.
- **FR-015**: Color changes MUST be undoable/redone (one history entry per commit; no entry for no-op same value).
- **FR-016**: Creation of toolbar nodes MUST be undoable/redone.
- **FR-017**: Z-order (front/back) of a selected toolbar node MUST be changeable via details pane controls (binary only: Front or Behind Thought Nodes).
- **FR-018**: Z-order changes MUST apply relative ordering across all node types (thought + toolbar nodes) without visual overlap artifacts; only two tiers (front/back) are required.
- **FR-019**: Z-order changes MUST be undoable/redone (one entry per user action).
- **FR-020**: The system MUST allow a toolbar node to be designated "In Front" or "Behind" thought nodes (only these two tiers supported).
- **FR-021**: Undo/Redo integration MUST preserve node colors and z-order on recreation (redo after undo creation).
- **FR-022**: Escape key deactivation is NOT required for this release (no dedicated deactivation shortcut).
- **FR-023**: Attempted placement within <50px MUST produce no node and no history entry.
- **FR-024**: Attempted placement with no active tool MUST produce no node and no history entry.
- **FR-025**: Toolbar presence MUST NOT interfere with existing thought node creation via directional drag.
- **FR-026**: Deleting a toolbar node MUST integrate with existing deletion undo/redo rules (toolbar nodes are deletable; root thought node rule unchanged).
- **FR-027**: Toolbar and its tools MUST be keyboard accessible (tab focus, ARIA labels) using labels: "note tool" and "rectangle tool"; nodes announce as "note" / "rectangle".
- **FR-028**: The system MUST prevent simultaneous activation of multiple tools even under rapid clicks.
- **FR-029**: Reloading the app MUST restore toolbar nodes (data persisted) but NOT restore undo history (current global rule reference).
- **FR-030**: Performance: toolbar node creation SHOULD appear within one animation frame (<16ms) for graphs up to 300 nodes (qualitative acceptance: no noticeable lag).
- **FR-031**: Rectangle and Text Note nodes MUST not automatically create edges.
- **FR-032**: Toolbar nodes MUST be movable (drag) consistent with thought nodes and movements undoable.
- **FR-033**: Users may pick from a predefined palette AND specify a custom color (hex) AND use a color picker to sample an existing node's color.
- **FR-034**: Z-order state MUST persist with the graph data (not derived transiently each session).
- **FR-035**: If a tool is active and user starts editing text in an existing node, the tool remains active (no auto-deactivation).
- **FR-036**: No node may overlap EXACTLY on the same coordinates as another at creation time (enforced by distance rule already).
- **FR-037**: Toolbar nodes MUST be visually distinguishable (e.g., subtle border/style) from thought nodes (no badge text required).
- **FR-038**: Undoing a z-order change MUST not alter node selection focus.
- **FR-039**: Undoing/redoing a color change MUST not alter node selection focus.
- **FR-040**: Attempting to activate a tool while another activation toggle animation is mid-flight MUST still result in only the last chosen tool active.
- **FR-041**: When the Rectangle tool is active and a rectangle node is selected, the rectangle MUST display resize handles (at least corners) enabling drag-resize.
- **FR-042**: Rectangle resize MUST enforce a minimum size (≥ 40x40 px) and snap dimensions to whole pixels.
- **FR-043**: Rectangle size changes MUST be persisted with the graph data and restored on reload.
- **FR-044**: Each completed rectangle resize gesture MUST produce exactly one undo entry (no entry for net-zero size change).
- **FR-045**: Undoing/redoing a rectangle resize MUST not alter the current node selection.
- **FR-046**: Resizing a rectangle MUST continue to honor the 50px placement distance rule for newly created nodes but does NOT retroactively adjust existing overlaps (non-goal).

### Key Entities *(include if feature involves data)*
- **Toolbar Tool**: Represents a selectable creation mode (id, label, active state, nodeType produced, icon reference). Only one may be active at a time.
- **Text Note Node**: Annotation node (id, position, multiLineText, backgroundColor, textColor, frontFlag, createdTimestamp, lastModifiedTimestamp).
- **Rectangle Node**: Decorative block node (id, position, backgroundColor, frontFlag, createdTimestamp, lastModifiedTimestamp) (no text).
- **Z-Order Attribute**: Binary frontFlag (true=in front of thought nodes, false=behind) — no intermediate tiers.
- **Color Setting Change**: A user action capturing previous & new color values for undo/redo.


### Key Entities *(include if feature involves data)*
- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [ ] Success criteria are fully measurable (performance broad target could be refined later)
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities resolved
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed (pending clarification resolution)

---
