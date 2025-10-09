# Azure Static Web Apps Deployment Runbook

## Workflow Overview
- Production deploys are orchestrated by `.github/workflows/azure-static-web-apps.yml`.
- Triggers: push to `main` and manual `workflow_dispatch` for hot fixes.
- Pipeline stages: checkout → install → lint → `npm run test:ci` → `npm run build` → artifact upload → Azure Static Web Apps deploy.
- Deployment metadata is captured in `deployment-metadata.json` (uploaded as an artifact and summarised in the job log).

## Provisioning a Static Web App
Use the helper script to create a new Azure Static Web App and (optionally) link it to the Mindflow GitHub repo. Prerequisites: Azure CLI logged in (`az login`) and permission to create resources in the target subscription.

```powershell
npm run create-static-web-app -- --name mindflow-prod --resource-group mindflow-rg --location eastus2 `
	--source https://github.com/paulio/mindflow --branch main --token <github-pat> --tag project=mindflow --tag env=prod
```

- `--token` or `--login-with-github` is required when linking to a private repository. Use a short-lived PAT scoped to the repo.
- Append `--dry-run` to view the Azure CLI commands without executing them.
- The script will create the resource group if it does not exist and then call `az staticwebapp create` with the supplied parameters.

After provisioning, retrieve the deployment token so the CI workflow can deploy:

```powershell
az staticwebapp secrets list --name <app-name> --resource-group <resource-group> --query properties.deploymentToken --output tsv
```

> If the command prints nothing, double-check that the Static Web App actually exists in the current subscription: `az staticwebapp show --name <app-name> --resource-group <resource-group>`. Creation fails silently when the region is unsupported—use one of the published regions (`westus2`, `centralus`, `eastus2`, `westeurope`, `eastasia`) and rerun the provisioning script before fetching the token.

## GitHub Secrets Configuration
Azure Static Web Apps requires an authenticated deploy token. Without it the workflow fails with `deployment_token was not provided`.

1. In the Azure Portal, open the Static Web App resource for production.
2. Navigate to **Settings → Deployment tokens** and copy the Primary token (regenerate if necessary).
3. In GitHub, go to **Settings → Secrets and variables → Actions** for `/mindflow`.
4. Create a new repository secret:
	- **Name:** `AZURE_STATIC_WEB_APPS_API_TOKEN`
	- **Value:** paste the token copied from Azure.
5. Re-run the **Azure Static Web Apps CI/CD** workflow. The deploy step now authenticates and uploads `dist` successfully.

> Optional: for forks or local testing where the secret is intentionally absent, set `skip_deploy_on_missing_secrets: true` in the deploy step of `.github/workflows/azure-static-web-apps.yml`. The action will skip deployment and report success while continuing to run lint/tests/build.

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
