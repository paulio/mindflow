#!/usr/bin/env tsx
import { spawnSync, type SpawnSyncOptions } from 'node:child_process';
import process from 'node:process';

const AZ_EXECUTABLE = process.platform === 'win32' ? 'az.cmd' : 'az';
const AZ_SHELL = process.platform === 'win32';

function spawnAz(args: string[], options: SpawnSyncOptions = {}) {
  return spawnSync(AZ_EXECUTABLE, args, { shell: AZ_SHELL, ...options });
}

type RawValue = string | boolean | string[] | undefined;

interface CreateOptions {
  name: string;
  resourceGroup: string;
  location: string;
  sku: string;
  subscription?: string;
  source?: string;
  branch: string;
  githubToken?: string;
  loginWithGithub: boolean;
  appLocation: string;
  apiLocation?: string;
  outputLocation: string;
  tags: string[];
  dryRun: boolean;
}

type ParsedArgs = Record<string, RawValue>;

const USAGE = `\nCreate or update an Azure Static Web App.\n\nExamples:\n  npm run create-static-web-app -- --name mindflow-prod --resource-group mindflow-rg --location eastus2 \\
    --source https://github.com/paulio/mindflow --branch main --token <github-pat>\n\n  npm run create-static-web-app -- --name mindflow-dev --resource-group mindflow-dev-rg --location centralus --dry-run\n\nRequired:\n  --name <app-name>                Static Web App name\n  --resource-group <rg-name>       Resource group to create/use\n\nOptional:\n  --location <azure-region>        Azure region (default: eastus2)\n  --sku <Free|Standard>            SKU tier (default: Free)\n  --subscription <id>              Subscription ID or name\n  --source <repo-url>              Git repository URL to link\n  --branch <branch-name>           Repo branch (default: main)\n  --token <github-pat>             GitHub Personal Access Token for repo access\n  --login-with-github              Use interactive GitHub auth instead of --token\n  --app-location <path>            App folder (default: /)\n  --api-location <path>            API folder (optional)\n  --output-location <path>         Build output folder (default: dist)\n  --tag key=value                 Repeatable tag assignments\n  --dry-run                        Show commands without executing\n`;

function parseArguments(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      // boolean flag
      result[key] = true;
    } else {
      if (result[key]) {
        const current = result[key];
        if (Array.isArray(current)) {
          current.push(next);
          result[key] = current;
        } else {
          result[key] = [current as string, next];
        }
      } else {
        result[key] = next;
      }
      i++;
    }
  }
  return result;
}

function asArray(value: RawValue): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
}

function getString(raw: RawValue): string | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw[raw.length - 1];
  if (typeof raw === 'boolean') return raw ? 'true' : undefined;
  return raw;
}

function buildOptions(parsed: ParsedArgs): CreateOptions {
  const name = getString(parsed.name);
  const resourceGroup = getString(parsed['resource-group']);
  if (!name || !resourceGroup) {
    console.error(USAGE);
    throw new Error('Both --name and --resource-group are required.');
  }
  const location = getString(parsed.location) ?? 'eastus2';
  const sku = getString(parsed.sku) ?? 'Free';
  const subscription = getString(parsed.subscription);
  const source = getString(parsed.source);
  const branch = getString(parsed.branch) ?? 'main';
  const githubToken = getString(parsed.token);
  const loginWithGithub = parsed['login-with-github'] === true;
  if (githubToken && loginWithGithub) {
    throw new Error('Use either --token or --login-with-github, not both.');
  }
  const appLocation = getString(parsed['app-location']) ?? '/';
  const apiLocation = getString(parsed['api-location']);
  const outputLocation = getString(parsed['output-location']) ?? 'dist';
  const tags = asArray(parsed.tag);
  const dryRun = parsed['dry-run'] === true;
  return {
    name,
    resourceGroup,
    location,
    sku,
    subscription,
    source,
    branch,
    githubToken,
    loginWithGithub,
    appLocation,
    apiLocation,
    outputLocation,
    tags,
    dryRun,
  };
}

function ensureAzCliAvailable(dryRun: boolean): void {
  if (dryRun) {
    console.log('ℹ Dry run: skipping Azure CLI availability check.');
    return;
  }
  const check = spawnAz(['--version'], { stdio: 'ignore' });
  if (check.status !== 0) {
    throw new Error('Azure CLI (az) not found. Install it from https://aka.ms/install-azure-cli and ensure it is on PATH.');
  }
}

function runAzCommand(label: string, args: string[], dryRun: boolean): number {
  const printable = ['az', ...args].join(' ');
  console.log(`\n▶ ${label}\n   ${printable}`);
  if (dryRun) {
    return 0;
  }
  const result = spawnAz(args, { stdio: 'inherit' });
  if (result.error) {
    throw result.error;
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${printable}`);
  }
  return result.status ?? 0;
}

function resourceGroupExists(resourceGroup: string, subscription: string | undefined, dryRun: boolean): boolean {
  if (dryRun) {
    console.log('\nℹ Skipping resource group existence check (dry run).');
    return false;
  }
  const args = ['group', 'show', '--name', resourceGroup, '--output', 'none'];
  if (subscription) {
    args.push('--subscription', subscription);
  }
  const result = spawnAz(args, { stdio: 'ignore' });
  return result.status === 0;
}

async function main() {
  try {
    const parsed = parseArguments(process.argv.slice(2));
    const options = buildOptions(parsed);
  ensureAzCliAvailable(options.dryRun);

    console.log('Azure Static Web App provisioning starting…');

    const { name, resourceGroup, location, sku, subscription, source, branch, githubToken, loginWithGithub, appLocation, apiLocation, outputLocation, tags, dryRun } = options;

    if (!dryRun) {
  const login = spawnAz(['account', 'show'], { stdio: 'ignore' });
      if (login.status !== 0) {
        console.warn('ℹ You are not logged into Azure CLI. Run `az login` before executing this script.');
      }
    }

    const rgExists = resourceGroupExists(resourceGroup, subscription, dryRun);
    if (!rgExists) {
      const createGroupArgs = ['group', 'create', '--name', resourceGroup, '--location', location];
      if (subscription) {
        createGroupArgs.push('--subscription', subscription);
      }
      if (tags.length > 0) {
        createGroupArgs.push('--tags', ...tags);
      }
      runAzCommand(rgExists ? 'Resource group exists' : 'Create resource group', createGroupArgs, dryRun);
    } else {
      console.log(`\n✔ Resource group '${resourceGroup}' already exists; skipping creation.`);
    }

    const createArgs: string[] = [
      'staticwebapp',
      'create',
      '--name',
      name,
      '--resource-group',
      resourceGroup,
      '--location',
      location,
      '--sku',
      sku,
      '--app-location',
      appLocation,
      '--output-location',
      outputLocation,
      '--branch',
      branch,
    ];

    if (subscription) {
      createArgs.push('--subscription', subscription);
    }
    if (source) {
      createArgs.push('--source', source);
    }
    if (apiLocation) {
      createArgs.push('--api-location', apiLocation);
    }
    if (githubToken) {
      createArgs.push('--token', githubToken);
    }
    if (loginWithGithub) {
      createArgs.push('--login-with-github');
    }
    if (tags.length > 0) {
      createArgs.push('--tags', ...tags);
    }

    runAzCommand('Create or update Static Web App', createArgs, dryRun);

    console.log(`\n✅ Static Web App '${name}' provisioning completed.`);
    console.log('Next steps:');
    console.log('  • Capture the deployment token: az staticwebapp secrets list --name', name, '--resource-group', resourceGroup);
    console.log('  • Store the token as AZURE_STATIC_WEB_APPS_API_TOKEN in GitHub repository secrets.');
  } catch (error) {
    console.error('\n❌ Failed to create Static Web App.');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

void main();
