# Research: Node Border Colour Overrides

## Decisions
- Palette Source: Reuse existing 10-colour list from UI background palette to avoid divergence.
- Mapping Rule: `colour = palette[depth % palette.length]` (at creation only).
- Persistence Fields: `originalBorderColour`, `currentBorderColour`, `borderPaletteIndex`, `borderOverrideFlag`, optional `borderOverrideColour` (alias of current when overridden).
- Undo Model: Each override apply or clear is a single undo stack entry.
- Fallback Strategy: If palette invalid/empty or index OOB, use root colour `#1e222b`.
- Reset Behavior: Restore `originalBorderColour` without recomputation; if missing (legacy node), compute on demand.

## Rationale
- Determinism: Guarantees reproducible colour mapping for consistent visual parsing.
- Minimal Surface: Client-only state change; no backend or schema changes needed.
- Performance: O(1) per node creation; no re-colour passes on depth changes.

## Alternatives Considered
- Dynamic Re-colour on Re-parent: Rejected (adds cognitive churn, breaks visual memory).
- Random Colour Assignment: Rejected (non-deterministic, hurts user scanning).
- Storing Only Override Colour: Rejected (needed original for reliable reset & undo fidelity).

## Risks & Mitigations
- Risk: Palette duplication elsewhere → Mitigation: Export central constant.
- Risk: Undo stack bloat on rapid colour cycling → Mitigation: Commit only on colour selection blur/click finalization.
- Risk: Accessibility contrast insufficient for some colours → Future task: introduce contrast validation.

## Open Items
None for this iteration.
