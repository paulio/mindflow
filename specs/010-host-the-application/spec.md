# Feature Specification: Host the application on Azure Static Site

**Feature Branch**: `010-host-the-application`  
**Created**: 2025-10-07  
**Status**: Draft  
**Input**: User description: "Host the application on an azure static stite. The site should be updated when the github repository successfully merges into main. When the site is hosted this way it should use EntraID to Authenticate and Authorise the user. When the site is hosted this way is should show the avatar of the user who has logged in via EntraID. Each account should store its own maps isolated from any other."

## Execution Flow (main)
```
1. A feature is merged into the main branch.
   → Continuous delivery tooling builds the Mindflow web application bundle.
   → A successful pipeline publishes the new bundle to the Azure static hosting environment.
2. A user navigates to the hosted Mindflow URL.
   → If the visitor lacks an active session, they are redirected to the organization's Entra ID sign-in experience.
   → Upon successful sign-in, Mindflow receives the authenticated profile (display name, avatar URL, unique user identifier) and establishes a session.
3. Mindflow loads the signed-in user's personal workspace.
   → The interface renders the user's avatar in the header and exposes maps linked to that user only.
   → All map reads/writes operate within that user's isolated data partition.
4. The user signs out or the Entra ID token expires.
   → Mindflow clears any cached credentials and returns the visitor to the sign-in prompt before allowing further access.
```

## User Scenarios & Testing *(mandatory)*

### Primary User Story
A returning Mindflow creator visits the public product URL, authenticates through Entra ID, sees their avatar in the header, and resumes working on their personal map collection hosted on the Azure static site.

### Acceptance Scenarios
1. **Given** a change is merged into the main branch with all automated checks green, **When** the deployment pipeline runs to completion, **Then** the Azure static site should serve the updated Mindflow application without manual intervention.
2. **Given** a person with a valid Entra ID account opens the site, **When** they complete the sign-in flow, **Then** Mindflow should grant access, display their profile avatar, and reveal only their own maps.
3. **Given** a person without an authorized Entra ID account attempts to visit the site, **When** they are redirected to sign in, **Then** access should be denied with an appropriate message and no map data should be exposed.

### Edge Cases
- Deployment pipeline failure after a main merge results in the prior static build remaining live while the failed release is flagged in telemetry dashboards for manual review during the next ops check-in.
- If Entra ID does not return an avatar image, display a neutral silhouette placeholder while preserving layout.
- When a user signs in from a new device, the most recent session stays active and all older sessions are invalidated immediately.
- When an Entra ID account is disabled, the user loses hosted access, but their maps remain available through the locally hosted Mindflow environment for support review.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: The Mindflow application MUST be hosted on Azure Static Web Apps using the default `*.azurestaticapps.net` domain in production.
- **FR-002**: The hosting environment MUST redeploy automatically after every successful merge into the `main` branch, using only artifacts that passed automated checks, with the GitHub site owner maintaining the pipeline and tooling.
- **FR-003**: Access to the hosted application MUST require Entra ID authentication before any map data or editing tools are available.
- **FR-004**: After authentication, the interface MUST display the signed-in user's avatar sourced from Entra ID, defaulting to a neutral silhouette placeholder when no avatar is supplied while honoring existing caching controls.
- **FR-005**: Each signed-in user MUST only see, create, update, and delete maps that belong to their own account, with no cross-user leakage; no administrative or shared-map access paths are permitted.
- **FR-006**: The system MUST isolate persisted map data per Entra ID user identifier so that storage, backups, and exports remain scoped to that individual, using the existing client database with its current encryption posture.
- **FR-007**: The system MUST clear session data and require re-authentication when a user signs out, the Entra ID token expires, or a newer session invalidates older ones.
- **FR-008**: Operations staff MUST review deployment telemetry daily; the system will not auto-notify on static site deployment failures, so failures remain flagged in dashboards while the prior release stays live.
- **FR-009**: If an Entra ID account is disabled, hosted access is blocked but the account’s maps remain retrievable through the locally hosted Mindflow environment for authorized support actions.

### Non-Functional Requirements
- **NFR-001**: The Mindflow static site MUST achieve at least 90% monthly uptime (≤72 hours downtime) measured via Azure availability metrics.
- **NFR-002**: The hosted deployment is scoped for up to 5 active users per month; scaling beyond this cohort requires a follow-up initiative.
- **NFR-003**: Telemetry MUST capture HTTP request/response logs and deployment status events (success and failure) so operations can review daily without automated alerts.
- **NFR-004**: The static site MUST deliver first meaningful paint within 3 seconds on broadband connections measured via synthetic checks.

### Key Entities *(include if feature involves data)*
- **Authenticated User Profile**: Represents the Entra ID identity currently using Mindflow, including unique user identifier, display name, email, avatar URL, and session metadata (token expiry, tenant). Used for access decisions and UI personalization.
- **User Map Collection**: Logical grouping of maps owned by a specific authenticated user. Stores references to map documents, last modified timestamps, and tenant/account metadata to enforce isolation.
- **Deployment Record**: Summary of each release pushed to the static site (source commit, build status, deployment timestamp, pipeline run ID) used for auditing and rollback decisions.

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous  
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed

## Clarifications

### Session 2025-10-07
- Q: Which hosting setup should we treat as the canonical Azure static site deployment? → A: Azure Static Web Apps using the default `*.azurestaticapps.net` domain.
- Q: What’s the expected behavior if the deployment pipeline fails after a merge to `main`? → A: Keep the previous version live, mark the release failed, and notify operations for manual follow-up.
- Q: How should Mindflow handle administrators or shared workspaces relative to the per-user isolation rule? → A: No shared access; every account stays fully isolated.
- Q: Where should Mindflow persist each user’s maps and how should encryption be applied? → A: No change to database.
- Q: Where should we source the fallback avatar when Entra ID provides none? → A: Leave the avatar slot empty and show a neutral silhouette.
- Q: Which notification channel should operations use when a static deployment fails? → A: No notification.
- Q: How should Mindflow treat concurrent sessions when a user signs in from multiple devices? → A: Invalidate older sessions and keep only the latest active.
- Q: When an Entra ID account is disabled, what happens to that user’s stored maps? → A: Maps always available to local hosted.
- Q: What availability target should the Mindflow static site meet? → A: 90% uptime.
- Q: What’s the expected upper bound on active Mindflow users per month for this hosted deployment? → A: 5 users.
- Q: Who is responsible for owning and maintaining the static site deployment pipeline? → A: github site owner.
- Q: Which telemetry signals must the hosted site emit for ops visibility? → A: Requests plus deployment status events.
- Q: What’s the maximum acceptable page load time (first meaningful paint) for the hosted site on a broadband connection? → A: ≤3 seconds.

