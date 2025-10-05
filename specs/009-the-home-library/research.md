# Research Log: Home Library Map Thumbnails

**Feature Branch**: `009-the-home-library`
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

> Document each investigation with Decision, Rationale, and Alternatives. Link measurable constraints directly to requirements and test plans.

## Open Questions
1. Lazy-loading approach and perceived latency target for dozens of thumbnails in the Home/Library grid.
2. IndexedDB blob quota behaviour across target browsers and enforcing a 10 MB cap with predictable LRU eviction.
3. Structured console logging schema (fields, severity, batching) for thumbnail refresh outcomes.
4. Retry/backoff strategy for a single automatic retry after refresh failures without overloading export pipeline.

## Findings
> Populate each subsection as research completes. Remove entries when resolved.

### Lazy-loading & Perceived Latency
- **Decision**: _TBD_
- **Rationale**: _TBD_
- **Alternatives**: _TBD_
- **Follow-up Metrics**: Capture DevTools screen recording verifying ≤1 s render for cached thumbnails; document scroll smoothness observations.

### IndexedDB Quotas & Eviction
- **Decision**: _TBD_
- **Rationale**: _TBD_
- **Alternatives**: _TBD_
- **Follow-up Metrics**: Confirm eviction behaviour via IndexedDB inspector at 10 MB threshold across Chromium, Firefox, Safari.

### Structured Console Logging Schema
- **Decision**: _TBD_
- **Rationale**: _TBD_
- **Alternatives**: _TBD_
- **Follow-up Metrics**: Validate console output format in integration tests; ensure logs group by mapId + trigger.

### Retry & Backoff Strategy
- **Decision**: _TBD_
- **Rationale**: _TBD_
- **Alternatives**: _TBD_
- **Follow-up Metrics**: Document retry timing + stop conditions; confirm no more than two attempts via unit tests.

## Constraints Exported to Plan
- Pending completion of research tasks above.

## Notes
- Capture citations/links for reference material inside Findings subsections.
- Update the plan once all Decisions are filled and non-functional constraints are explicit.
