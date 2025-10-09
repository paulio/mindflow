# Azure Static Web Apps Deployment Runbook

## Workflow Overview
- Production deploys are orchestrated by `.github/workflows/azure-static-web-apps.yml`.
- Triggers: push to `main` and manual `workflow_dispatch` for hot fixes.
- Pipeline stages: checkout → install → lint → `npm run test:ci` → `npm run build` → artifact upload → Azure Static Web Apps deploy.
- Deployment metadata is captured in `deployment-metadata.json` (uploaded as an artifact and summarised in the job log).

## Daily Telemetry Review
1. Navigate to **Azure Portal → Static Web Apps → mindflow-prod → Monitor**.
2. Open the saved Log Analytics query `mindflow-http-summary`:
	```kusto
	requests
	| where timestamp > ago(24h)
	| summarize count() by bin(timestamp, 1h), resultCode
	| order by timestamp desc
	```
	- Confirm request volume and status codes remain in expected ranges.
3. Switch to the **Custom** tab and run the saved query `mindflow-deployment-status`:
	```kusto
	customEvents
	| where name == "deployment_status"
	| extend status = tostring(customDimensions["status"])
	| project timestamp, status, customDimensions.deploymentId, customDimensions.commit
	| order by timestamp desc
	```
	- Verify the latest GitHub run is represented and marked `succeeded`.
4. Record findings, anomalies, and follow-up actions in the operations log (`OneNote / Mindflow Ops / Daily Checks`).

## Rollback Checklist
1. Locate the failing run in **GitHub → Actions → Azure Static Web Apps CI/CD**.
	- Download the `deployment-metadata` artifact and attach it to the incident ticket.
2. In Azure Portal select **Hosting → Deployment history** and choose the last successful build.
3. Click **Promote** to redeploy the previous build. Wait for green confirmation toast.
4. Re-run the monitoring queries above to confirm the rollback emitted a `deployment_status` event with `failed` → `succeeded` transition.
5. Update the deployment record notes with remediation details and ensure the GitHub run summary reflects the manual rollback.

## Disabled Account Recovery
1. Ask the identity administrator to confirm the Entra ID account is disabled (audit trail requirement).
2. Start the local dev server: `npm run dev` (requires `.env.local` Entra placeholders from setup phase).
3. Run the export CLI:
	```powershell
	npm run export-disabled-account -- --subject <entra-subject-id> --output ./exports/<alias>.zip
	```
	- The script calls the local API (`http://localhost:4280/api/disabled-account-export`) and saves the IndexedDB snapshot.
4. Import the archive into the locally hosted Mindflow instance using the existing import dialog for authorized review.
5. Store the export securely for 30 days, then purge according to the data retention guideline.
6. Coordinate with the identity administrator for reactivation or permanent deprovisioning.

## Reference Dashboards & Contacts
| Purpose | Location | Notes |
|---------|----------|-------|
| Request trends | Azure Portal → Static Web Apps → Monitor → Requests | Saved query `mindflow-http-summary` |
| Deployment status | Azure Portal → Log Analytics → customEvents | Saved query `mindflow-deployment-status` |
| Ops log | OneNote → Mindflow Ops → Daily Checks | Record daily review and follow-ups |
| Escalation | Teams channel `#mindflow-ops` | Ping @site-owner during business hours |
