# Feature Specification: Node Border Colour Overrides & Hierarchical Defaults

**Feature Branch**: `007-nodes-can-override`  
**Created**: 2025-10-01  
**Status**: Draft  
**Input**: User description: "Nodes can override their border colour using a colour selection in the Detail pane. By default each nodel cihld level is represented by a different colour. Once the default colours have been exchausted the next colour choice wraps back to the starting colour."

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
As a user editing a graph, I want each node to have a meaningful default border colour based on its depth level in the hierarchy, but also be able to manually override a node's border colour via the Detail pane so that I can visually categorize or highlight specific nodes beyond the automatic scheme.

### Acceptance Scenarios
1. **Given** a graph with a root node and newly created child nodes, **When** I add children at successive depth levels, **Then** each node receives an initial default border colour determined by its depth using the defined palette (depth % paletteLength) and after exhausting colours the assignment wraps from the start.
2. **Given** a selected node in the Detail pane, **When** I choose a different border colour (palette swatch or valid hex), **Then** the node's border updates immediately and is marked as user-overridden.
3. **Given** a node (default or overridden), **When** I re-parent it to a different depth, **Then** its displayed border colour does not change automatically (no implicit recolouring after placement).
4. **Given** a node with an override, **When** I clear the override (reset action), **Then** the node's border colour reverts to its originally assigned default colour (the colour captured at initial assignment) even if its depth has changed since.
5. **Given** a deeply nested hierarchy exceeding the palette length, **When** new deeper nodes are created, **Then** their initial defaults continue wrapping deterministically (depth % length) ensuring reproducible results.
6. **Given** I perform an undo after changing a node's border override, **When** the undo executes, **Then** the node's prior colour state (value + override flag) is restored in a single step.

### Edge Cases
- Palette Exhaustion: Very deep depth values still map correctly using depth % paletteLength; verified for large depths (e.g., 10,000).
- Invalid Palette Configuration: If palette list missing or length = 0, system uses root colour (#1e222b) for initial assignment; if individual index missing, also fall back to root colour (#1e222b).
- Re-parenting: Moving nodes does not alter any existing colour (default or overridden) post initial placement.
- Reset After Re-parent: Clearing override restores the node's original initial default colour (captured at creation) even if depth changed.
- Undo/Redo: Each committed override change (apply or clear) is one undo step; no partial intermediate values.
- Custom Hex Input: Invalid hex entries ignored silently (no change) until a valid 7‑char #rrggbb submitted.
- Single Parent Assumption: Feature assumes strict tree; cycles or multiple parents are invalid and out of scope.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST assign a default border colour to each node at creation based on its depth using `(depth % paletteLength)` over the defined palette order.
- **FR-002**: Palette MUST be the same sequence used for existing node colours: `["#1e222b","#2d323f","#444b5a","#556070","#6b7687","#8892a0","#b48ead","#a3be8c","#d08770","#bf616a"]`.
- **FR-003**: System MUST allow a user to override a node's border colour via the Detail pane choosing either a palette swatch or a valid custom hex (`^#[0-9a-fA-F]{6}$`).
- **FR-004**: Override selection MUST update the node border immediately (no intermediate flicker or delay).
- **FR-005**: System MUST persist: originalDefaultColour (initial assigned), currentBorderColour, overrideFlag (boolean), paletteIndex (initial depth % length).
- **FR-006**: System MUST NOT auto-change a node's border colour after initial assignment due to depth changes (no passive recolouring).
- **FR-007**: Clearing an override MUST restore the node's originalDefaultColour (captured at creation). If missing, recompute using current depth mapping.
- **FR-008**: Initial colour assignment MUST be deterministic: identical hierarchy at creation time yields identical colours.
- **FR-009**: Each completed override action (apply new override or clear override) MUST be one undo/redo unit.
- **FR-010**: If palette list is invalid or length = 0, system MUST fall back to root colour `#1e222b` for new assignments (and record paletteIndex = 0); if a specific index lookup fails, also fall back to root colour `#1e222b`.
- **FR-011**: Colours MUST be stored as hex strings; paletteIndex stored separately for defaults.
- **FR-012**: Multi-node (batch) border override editing is explicitly OUT OF SCOPE for this iteration.
- **FR-013**: Different colour alone indicates override; no additional badge or icon required.
- **FR-014**: System MUST assume a single-parent tree; nodes having more than one parent are invalid input.
- **FR-015**: Once a node is created, only explicit user override or reset may change its border colour.
- **FR-016**: A palette length of zero SHOULD be treated as a configuration error but handled gracefully (see FR-010) without crashing.

### Non-Functional / Constraints
- **NFR-001**: No explicit performance target required for this iteration; operations SHOULD remain responsive under typical graph sizes (<200 nodes).
- **NFR-002**: Undo/redo MUST be idempotent (re-applying state does not re-trigger extra computations).
- **NFR-003**: Palette MUST be defined in one location to prevent divergence (single source of truth).

### Key Entities
- **Node**: id, parentId, children[], depth (at creation), paletteIndex, originalDefaultColour, currentBorderColour, overrideFlag.
- **Colour Palette**: Ordered list of hex colour strings used for initial depth-based assignment.

### Derived Rules
- Initial Mapping: `originalDefaultColour = palette[ depth % palette.length ]` captured once at creation.
- Display Colour: If `overrideFlag=true` → `currentBorderColour = userOverrideColour`; else `currentBorderColour = originalDefaultColour`.
- Reset Override: Set `overrideFlag=false`, `currentBorderColour = originalDefaultColour`.
- Missing Palette Entry: If paletteIndex out of range, use root fallback `#1e222b`.
- Invalid Palette (empty): Use root colour `#1e222b` for new nodes (still record paletteIndex = 0).

## Clarifications
### Session 2025-10-01
- Palette: Fixed 11-colour sequence `["#0e4ee6ff","#225a0cff","#c2961fff","#556070","#6b7687","#8892a0","#b48ead","#a3be8c","#d08770","#bf616a","#99c7ffff"]`.
- Behaviour Adjustment (Post-implementation): Override selection affects the border (accent) only; the "Colors" section sets background fill. (Label in UI will be corrected to avoid confusion.)
- Initial assignment only uses depth at creation; later depth changes do not auto recolour.
- Single parent tree; multiple parents / cycles out of scope.
- Multi-node batch editing: Out of scope this iteration.
- Override indication: Different colour alone (no badge/icon).
- Fallbacks: Empty palette or bad index → root colour `#1e222b`.
- Undo granularity: One undo per completed override apply or clear.
- Storage: Hex strings plus recorded paletteIndex and originalDefaultColour at creation.
- Post-placement changes: Only explicit user override/reset can change colour.
- Collaboration: No multi-user considerations in scope.

### Open Questions / Clarifications Needed
None. All prior ambiguities resolved in requirements above.


---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

---
