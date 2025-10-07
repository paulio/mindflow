# Phase 0 Research: Azure Static Hosting with Entra ID

## Overview
Focus: Configure Mindflow for Azure Static Web Apps deployment with Entra ID authentication, enforce per-user isolation using the existing client database, define operational telemetry, and support fallback access for disabled accounts while preserving performance targets.

## Decisions
### 1. Hosting & Deployment
- **Decision**: Use Azure Static Web Apps (Standard plan) with production served from the default `*.azurestaticapps.net` domain and GitHub Actions-managed CI/CD.
- **Rationale**: Aligns with spec requirement, integrates tightly with GitHub, and supports Entra ID via built-in authentication.
- **Alternatives**: Azure App Service (adds infrastructure overhead) or Vercel/Netlify (conflicts with Azure requirement) were rejected.

### 2. Build & Release Pipeline Ownership
- **Decision**: The GitHub site owner maintains the deployment pipeline YAML, secrets, and environment approvals.
- **Rationale**: Keeps accountability with repository maintainers and matches spec clarification.
- **Alternatives**: Dedicated DevOps team (overhead for 5-user scale) or automated Azure DevOps pipeline (duplicate effort) deemed unnecessary.

### 3. Authentication & Avatar Handling
- **Decision**: Enable Entra ID via Static Web Apps Easy Auth, requesting `profile` and `email` scopes; use `/._auth/me` profile to source avatar URL; default to neutral silhouette asset when absent.
- **Rationale**: Built-in provider simplifies token handling; avatar fallback meets UX requirement.
- **Alternatives**: Custom OAuth gateway or B2C tenant increases complexity without benefit.

### 4. Session Concurrency
- **Decision**: Accept latest session only; invalidate previous refresh tokens by clearing client session storage when a new login occurs.
- **Rationale**: Prevents conflicting edits across devices and satisfies spec clarification.
- **Alternatives**: Multisession sync (requires conflict resolution) deferred; session prompts add friction.

### 5. Data Persistence & Isolation
- **Decision**: Retain current IndexedDB stores (maps, nodes, edges) partitioned by Entra ID subject; no server-side storage change.
- **Rationale**: Meets isolation requirement with minimal refactor; local store already battle-tested.
- **Alternatives**: Cosmos DB or Azure Tables add cost/ops overhead and contradict "existing client database" clarification.

### 6. Disabled Account Support
- **Decision**: Block hosted access when Entra ID disabled; allow support staff to load affected user maps via locally hosted Mindflow using exported IndexedDB backup.
- **Rationale**: Preserves user data, satisfies audit trail, no new infrastructure.
- **Alternatives**: Immediate deletion (data loss risk) or automated archive (adds unneeded servers) rejected.

### 7. Telemetry & Observability
- **Decision**: Stream HTTP request/response logs and deployment status events to Azure Monitor via Static Web Apps diagnostic settings; surface dashboards for daily ops review without push alerts.
- **Rationale**: Meets requirement to flag failures without notifications; uses managed platform features.
- **Alternatives**: App Insights custom SDK (overkill) or no telemetry (violates spec) rejected.

### 8. Performance Budget
- **Decision**: Maintain ≤3s first meaningful paint on broadband using Vite optimizations, dynamic imports for Entra ID boot, and caching static assets via SWA built-in CDN.
- **Rationale**: Matches NFR-004; feasible with current bundle size.
- **Alternatives**: Aggressive code splitting beyond critical path deferred unless metrics regress.

### 9. Availability Target
- **Decision**: Commit to ≥90% uptime with manual monitoring of deployment dashboards.
- **Rationale**: Satisfies clarified reliability target while acknowledging small-team operational capacity.
- **Alternatives**: Higher SLOs (99%+) require paging/on-call which spec explicitly avoids.

### 10. Support & Operations Workflow
- **Decision**: Document daily telemetry review checklist and manual rollback steps in quickstart; rely on GitHub site owner for pipeline triage.
- **Rationale**: Ensures Principle 1 documentation and Principle 2 readiness for regression tests.
- **Alternatives**: Automated on-call rotation not justified for 5-user scope.

## Alternatives Summary
| Topic | Chosen | Alternatives | Reason |
|-------|--------|-------------|--------|
| Hosting | Azure Static Web Apps | App Service, Vercel | Meets spec, minimal ops |
| Auth | Built-in Entra ID | Custom OAuth, B2C | Simplest, secure |
| Storage | IndexedDB per user | Cosmos DB, Azure Tables | Keeps existing client DB |
| Telemetry | Azure Monitor diagnostics | App Insights SDK | Enough signals for ops |
| Session policy | Latest session wins | Multi-session sync | Avoids conflict complexity |

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Manual telemetry review misses failures | Delayed recovery | Daily checklist + dashboard bookmark + backup review reminder |
| Entra ID avatar URL blocked | Broken avatar display | Always render neutral silhouette placeholder |
| IndexedDB schema drift | User data inaccessible | Maintain migration scripts + local export instructions |
| 3s FMP exceeded on cold start | Poor UX | Monitor Lighthouse metrics, ship bundle report guardrail |

## Conclusion
Configuration choices satisfy clarified requirements without introducing new infrastructure. Ready to proceed to Phase 1 design deliverables.
