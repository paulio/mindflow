# Feature Specification: Reference Connections Between Nodes

**Feature Branch**: `005-provide-the-ability`  
**Created**: 2025-10-01  
**Status**: Draft  
**Input**: User description: "Provide the ability to make reference connections. A reference connection is made between two nodes by dragging from a connection port to another nodes connection where there is not already a connection between the two. The connection has end-cap options of single way arrow (pointing to the target), double arrow (pointing to both) or no arrow. The connection can be repositioned by dragging to another port on any other node or that same target node. When the connection is selected a delete option is provided to allow the user to delete the reference connection"

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
As a user creating a visual knowledge/graph workspace, I want to create, visualize, adjust, and remove directional or non-directional reference connections between two existing nodes so I can represent relationships without duplicating node content.

### Acceptance Scenarios
1. **Given** two existing nodes with no existing reference connection between them, **When** I drag from a connection port on the source node to a connection port on the target node and release, **Then** a new reference connection is created and rendered between the two nodes with a default end‑cap style.
2. **Given** a reference connection is selected, **When** I choose the arrow style option (single, double, none), **Then** the connection immediately reflects the chosen end‑cap(s) without altering its endpoints.
3. **Given** a reference connection exists, **When** I start a reposition gesture from one of its endpoints and drag to a different compatible port (same or different node), **Then** the connection reattaches to the new node/port upon release and remains otherwise unchanged.
4. **Given** a reference connection exists between two nodes, **When** I attempt to create another connection between the same two nodes in the same directional pairing, **Then** the system prevents duplication (no second identical connection is added) and briefly highlights the existing connection.
5. **Given** a reference connection is selected, **When** I activate the delete option, **Then** the connection is removed and no longer rendered while the nodes remain unaffected.
6. **Given** a connection with a single arrow (A→B), **When** I switch its end‑cap style to double arrow, **Then** both endpoints show arrowheads and the semantic meaning updates to bidirectional.
7. **Given** a double‑arrow connection (A↔B), **When** I change style to no arrow, **Then** the line renders with no arrowheads yet still represents a generic association.

### Edge Cases
- User drags from a port to empty canvas and releases → connection creation should cancel gracefully (no orphan). 
-- User drags onto an invalid target (e.g., same port, disabled node, same node) → cancel or snap‑back without creation (self-connections disallowed).
-- Attempt to reposition endpoint onto node already forming identical connection → rejection with highlight of existing connection.
-- Delete action invoked while connection is mid-reposition gesture → gesture cancels first, then deletion proceeds.
- Rapid sequential reattachments (<200ms apart) → system must remain responsive (no stale ghost lines).
-- Arrow style changed while endpoint drag in progress → style change applied after drag completes.
-- Undo/redo expectations for create, modify (style, endpoints), delete → all confirmed actions are undoable.


## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST allow creation of a reference connection by dragging from a connection port on one node to a connection port on a different node.
- **FR-002**: System MUST prevent creation of a duplicate reference connection with the same semantic direction (e.g., an existing A→B blocks another A→B).
- **FR-003**: System MUST support three end‑cap styles for each connection: single arrow (source→target), double arrow (bidirectional), and none (association).
- **FR-004**: System MUST allow changing an existing connection's end‑cap style without recreating the connection.
- **FR-005**: System MUST allow repositioning either endpoint of a connection by dragging it to a new node's compatible port.
- **FR-006**: System MUST disallow endpoint repositioning that would create a duplicate existing connection state (post-move) and retain original attachment instead.
- **FR-007**: System MUST provide a deletion affordance when (and only when) a connection is selected.
- **FR-008**: System MUST remove a connection immediately upon confirmed delete action.
- **FR-009**: System MUST visually indicate selection state of a connection distinctly from normal state.
- **FR-010**: System MUST persist connection endpoints, arrow style, label text, label visibility state so that reloading restores all reference connections.
- **FR-011**: System MUST provide user feedback for a blocked duplicate attempt by momentarily highlighting the existing connection.
- **FR-012**: System MUST expose arrow style options (single, double, none) within the detail pane when the connection is selected.
- **FR-013**: System MUST support undo/redo for create, delete, endpoint reposition, and style change actions.
- **FR-014**: System MUST ensure a cancellation path for partial drags (no partial artifacts, no hidden state retained).
- **FR-015**: System MUST ensure that deleting a node also removes its reference connections and informs the user of the cascade; undo restores node and its connections.
- **FR-016**: System SHOULD preserve connection selection state after style change if still present on canvas.
- **FR-017**: System MUST ensure no more than one active endpoint drag per connection at a time.
- **FR-018**: System HAS no explicit performance target for this release (no enforced connection cap) but must remain functionally responsive under typical usage.
- **FR-019**: System MUST forbid creation or repositioning of a reference connection if either node endpoint is locked; existing connections remain until node removal.
- **FR-020**: System MUST allow keyboard deletion (Delete/Backspace) when a connection is selected.
- **FR-021**: System MUST allow two separate directed connections A→B and B→A simultaneously; these are distinct from a double-arrow connection.
- **FR-022**: System MUST visually curve paired opposite-direction connections outward to avoid overlap.
- **FR-023**: System MUST support an optional textual label attached to a connection (anchored, non-draggable, no background) that the user may hide via detail pane toggle.
- **FR-024**: System MUST persist connection label text and hidden/visible state.
- **FR-025**: System SHOULD apply default React Flow connection drag behaviors where consistent with the above rules.

### Key Entities *(include if feature involves data)*
- **Reference Connection**: Represents a directional or non-directional relationship between two distinct nodes; attributes: unique id, source node id, target node id, style (single, double, none), label text (optional), label visibility flag, created timestamp, last modified timestamp.
- **Node Port**: Existing node connection port(s) as currently implemented; no new port types introduced.

### Assumptions & Dependencies
- Nodes already exist and have stable identifiers.
- User can already select nodes and (presumably) edges/lines in the existing system.
- Visual layering: connections render below nodes; selected connection uses enhanced styling for emphasis (no z-order elevation).
- No security or permission segmentation specified (assume single user local context).

### Decision Log
| # | Decision Summary |
|---|------------------|
| 1 | Duplicate directional connection blocked; highlight existing connection feedback |
| 2 | Self-connections disallowed |
| 3 | Two opposite directed edges ≠ one bidirectional; both allowed |
| 4 | Arrow style options appear in detail pane on selection |
| 5 | All create/delete/reposition/style actions undoable |
| 6 | Cannot drag+delete simultaneously (drag cancelled first) |
| 7 | Delete has no confirmation (undo available) |
| 8 | No explicit performance target / no cap |
| 9 | Locked nodes reject new or repositioned connections |
|10 | Delete key removes selected connection |
|11 | Use default React Flow drag behaviors where possible |
|12 | Node deletion also removes its connections; undo restores |
|13 | Ports unchanged; reuse existing ports |
|14 | Connections render below nodes; selection emphasized via style |
|15 | A→B and B→A both allowed; outward curvature to avoid overlap |
|16 | Highlight feedback method accepted |
|17 | Connection supports optional label (no background) toggleable in detail pane |
|18 | No enforced limit on connection count |


## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [x] No clarification markers remain
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable (e.g., performance thresholds defined)
- [ ] Scope is clearly bounded (creation, style change, reposition, deletion only)
- [ ] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (and resolved)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed

---
