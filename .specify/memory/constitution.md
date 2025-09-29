<!--
Sync Impact Report
Version change: N/A (template) → 1.0.0
Modified principles: (initial adoption)
Added sections: Core Principles (4 defined), Quality & Performance Standards, Development Workflow & Quality Gates, Governance
Removed sections: Placeholder Principle 5 block (template unused)
Templates requiring updates:
 - .specify/templates/plan-template.md ✅ updated version reference
 - .specify/templates/tasks-template.md ✅ categories expanded (UX, Performance)
 - .specify/templates/spec-template.md ✅ no change needed (already aligned)
Follow-up TODOs:
 - TODO(THROUGHPUT_TARGET): Define baseline requests/sec & concurrency assumptions for performance Principle 4.
-->

# Mindflow Constitution

## Core Principles

### 1. Code Quality & Readability (NON‑NEGOTIABLE)
Rules:
- Every change MUST pass automated linting with zero errors and zero new warnings.
- Cyclomatic complexity per function MUST remain <= 10 (justify exceptions in PR description).
- Public APIs (exported functions, endpoints, components) REQUIRE doc comments (purpose, inputs, outputs, error modes).
- Pull Requests SHOULD target < 300 added LOC (excluding generated code); larger PRs MUST be split unless atomic migration.
- No dead code: Any removal of usages MUST remove definitions in same PR.
- Explicit > implicit: magic numbers / strings MUST be replaced with named constants.
- Layer boundaries MUST be clear: UI → Services → Domain → Persistence; cross-layer calls are forbidden.
Rationale: Enforces maintainability, reduces cognitive load, and ensures the codebase scales without fracturing into inconsistent styles.

### 2. Test-Driven Development & Coverage Discipline (NON‑NEGOTIABLE)
Rules:
- New behavior MUST begin with failing tests (unit or contract) before implementation.
- Minimum coverage: 90% for domain & critical path modules; 80% overall project line coverage; NO decline >1% allowed in a PR.
- Each bug fix MUST include a regression test that fails before the fix.
- Integration tests MUST cover each user-visible flow enumerated in specs; contract tests MUST exist for every public API endpoint.
- Performance-critical code MUST include micro-bench or threshold test when practical (skipped tests MUST justify skip reason).
- Tests MUST be deterministic (<1% flake over 20 reruns) — eliminate sources of nondeterminism (time, randomness, network) via injection.
Rationale: Guarantees correctness, enables fearless refactoring, and encodes business rules as executable specification.

### 3. User Experience Consistency & Accessibility
Rules:
- Components MUST use shared design tokens (colors, spacing, typography, motion) — no hard-coded style values.
- All interactive elements MUST be keyboard navigable and provide visible focus state.
- Accessibility: Conform to WCAG 2.1 AA (landmarks, aria attributes, contrast >= 4.5:1, semantic HTML).
- Error & empty states MUST be defined in spec or plan before implementation; no placeholder lorem text in production.
- Latency: User-perceived action feedback (visual affordance/spinner/state change) MUST occur <100ms; otherwise show progress indicator.
- UI state transitions MUST avoid layout shift > 0.1 CLS in performance tooling.
Rationale: Delivers predictable, inclusive experience, reducing user friction and support overhead.

### 4. Performance & Efficiency Targets
Rules:
- Backend p95 latency for primary endpoints MUST be <200ms at baseline load (define in performance doc).
- Largest Contentful Paint (LCP) MUST be <2.5s on 75th percentile of supported devices & network (simulate Slow 4G profile in CI perf run).
- No endpoint may introduce N+1 database/query patterns (enforce via integration + EXPLAIN plan review for new queries).
- Memory growth per request path MUST be stable (no >5% retained heap increase over 5 consecutive identical load test runs).
- Observability: Each endpoint MUST emit structured log (trace/span id, user/session id if available, latency, status) and key metrics (latency histogram, error count, request count).
- Caching decisions MUST declare invalidation strategy in code comments or docstring.
- Performance regression threshold: >5% degradation in p95 latency OR >10% LCP increase blocks merge.
- TODO(THROUGHPUT_TARGET): Define sustainable RPS & concurrency for baseline + stress profiles.
Rationale: Embeds performance as a design constraint, not an afterthought, ensuring scalability and responsive UX.

## Quality & Performance Standards
Scope Definitions:
- Critical Path Modules: Authentication, authorization, data integrity, payment or billing related logic (extend list in docs/perf.md when added).
- Baseline Load Profile: Representative average concurrent sessions & requests (to be defined alongside TODO(THROUGHPUT_TARGET)).

Validation Mechanisms:
- CI Quality Gate runs: lint, type (if applicable), unit, integration, coverage, accessibility scan, performance smoke.
- Weekly trend dashboard MUST be reviewed (coverage %, p95, LCP, open accessibility violations).

Non-Functional Targets:
- Error budget: <0.1% failed requests (5xx or contract validation failure) per rolling 7-day window.
- Build time: <10 min full pipeline; fast feedback (<2 min) via split test stages.

## Development Workflow & Quality Gates
Pull Request Checklist (enforced via automation + review):
- [ ] Principle 1: Lint clean, complexity within threshold, docs added.
- [ ] Principle 2: New tests first, coverage thresholds satisfied, no untested branches.
- [ ] Principle 3: Accessibility & UX acceptance states present, tokens used.
- [ ] Principle 4: No performance regression (automated thresholds) and observability instrumentation present.

Branching & Release:
- Trunk-based with short-lived feature branches; rebase preferred over merge commits.
- Semantic versioning applies to any published API schemas; breaking changes require major version bump and deprecation notice (≥2 minor releases prior when feasible).

Documentation:
- Each feature spec MUST enumerate user flows mapped to integration tests.
- Any introduced config toggles MUST have default rationale & rollback path.

Failure Handling:
- Rollbacks MUST be favored over hotfix commits when regressions detected unless data migration reversal risk > fix risk.

## Governance
Amendment Procedure:
1. Propose change via PR updating this constitution with rationale + impact analysis.
2. Label PR governance; require approval from at least 2 maintainers (or 1 maintainer + QA lead if defined).
3. Determine version bump type (PATCH, MINOR, MAJOR) per Versioning Policy below.
4. Merge triggers update of version reference lines in templates and announcement in CHANGELOG (if present).

Versioning Policy (for this constitution):
- MAJOR: Removal or redefinition of a principle, weakening a non‑negotiable rule, or altering governance flow.
- MINOR: Addition of a new principle, new mandatory gate, or material expansion of rule scope.
- PATCH: Editorial clarifications, typo fixes, non-behavioral wording.

Compliance & Review:
- Constitution Check sections in plans MUST list gating rules generated from Principles 1‑4.
- Quarterly audit: sample 5 recent merges for each principle; publish findings.
- Violations discovered post-merge MUST create follow-up tasks within 24h.

Emergency Amendments:
- Security or legal compliance changes may be fast-tracked with single maintainer approval + retroactive review within 72h.

Sunsetting / Deviation:
- Temporary deviations require explicit EXPIRY date & tracking issue; unresolved by expiry → auto escalation.

**Version**: 1.0.0 | **Ratified**: 2025-09-29 | **Last Amended**: 2025-09-29