# Quickstart: Host Mindflow on Azure Static Web Apps

## Goal
Validate the Azure Static Web Apps deployment with Entra ID authentication, avatar fallback, map isolation, telemetry capture, and manual operations workflow.

## Prerequisites
- GitHub repository with the `010-host-the-application` branch merged into `main`.
- Azure Static Web Apps resource configured with Entra ID provider and GitHub Actions workflow secrets.
- Entra ID test accounts: one active, one disabled (or ability to toggle status).
- Local environment capable of running `npm install` and `npm run dev`.

## Steps
1. **Trigger Deployment**
   - Push or merge an update into `main` to start the **Azure Static Web Apps CI/CD** workflow.
   - Monitor the run in GitHub Actions; it must pass lint, tests, and build stages before deployment begins.
   - Download the `deployment-metadata` artifact (captures commit, actor, run number) for audit notes.

2. **Review Deployment Telemetry**
   - In Azure Portal → Static Web Apps → Monitor → Logs, run the saved query `mindflow-deployment-status` to confirm the new event with status `succeeded` and matching commit.
   - Record the run in the operations log; no automated notifications are configured.

3. **Access Production Site**
   - Visit the default production URL (`https://<app-name>.azurestaticapps.net`).
   - Verify redirect to Entra ID sign-in and complete login with the active account.

4. **Confirm Avatar & Isolation**
   - After login, ensure the header shows the avatar or neutral silhouette placeholder if no avatar is present.
   - Create or open a map; confirm only maps for the signed-in user appear.

5. **Validate Telemetry Request Event**
   - Refresh the page; in Azure Monitor Logs run the saved query `mindflow-http-summary` (or the ad‑hoc request query) to observe the new `http_request` event.

6. **Check Concurrent Session Policy**
   - Log in from a second browser/incognito window; confirm the first session is revoked and prompts for sign-in on next interaction.

7. **Disabled Account Fallback**
   - Disable the test account in Entra ID.
   - Attempt to access the hosted site (access should be denied with the disabled message).
   - With the local dev server running, export the workspace using the CLI:
     ```powershell
     npm run export-disabled-account -- --subject <entra-subject-id> --output ./exports/<alias>.zip
     ```
   - Import the archive into the locally hosted Mindflow instance for support verification.

8. **Rollback Drill (Optional)**
   - Mark a failed deployment in GitHub Actions to simulate an error.
   - Confirm the site continues serving the previous build and the failure appears in telemetry dashboards awaiting manual review.

## Expected Results
- Deployment completes via GitHub Actions and emits a telemetry event.
- Entra ID login succeeds, avatar fallback works, and user data remains isolated.
- Telemetry captures request and deployment events only.
- Older sessions are invalidated immediately after a new login succeeds.
- Disabled accounts retain maps accessible through local hosting, not production.
- Failed deployments leave previous build live and appear in dashboards without sending alerts.

## Troubleshooting
- **No Entra ID redirect**: Verify Static Web Apps auth provider settings and allowed audiences.
- **Avatar missing with broken image**: Check for HTTPS URL in profile; fallback asset should appear when URL blank/invalid.
- **Telemetry empty**: Ensure diagnostic settings stream to Azure Monitor, the saved queries exist, and the app was visited after deployment.
- **Sessions not revoking**: Confirm client clears session storage and refresh tokens when receiving new session metadata.
- **Local fallback access denied**: Double-check IndexedDB export uses matching `subjectId` isolation tag.
