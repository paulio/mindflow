import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface ExportOptions {
  subjectId: string;
  host: string;
  endpoint: string;
  output?: string;
  format: 'zip' | 'json';
  verbose: boolean;
}

interface ParsedArgs {
  subjectId?: string;
  host?: string;
  endpoint?: string;
  output?: string;
  format?: 'zip' | 'json';
  verbose?: boolean;
  help?: boolean;
}

const DEFAULT_HOST = process.env.MINDFLOW_EXPORT_HOST ?? 'http://localhost:4280';
const DEFAULT_ENDPOINT = process.env.MINDFLOW_EXPORT_ENDPOINT ?? '/api/disabled-account-export';
const SUPPORTED_FORMATS: Array<'zip' | 'json'> = ['zip', 'json'];

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--subject':
      case '--subjectId':
        parsed.subjectId = argv[i + 1];
        i += 1;
        break;
      case '--host':
        parsed.host = argv[i + 1];
        i += 1;
        break;
      case '--endpoint':
        parsed.endpoint = argv[i + 1];
        i += 1;
        break;
      case '--output':
        parsed.output = argv[i + 1];
        i += 1;
        break;
      case '--format': {
        const value = argv[i + 1] as 'zip' | 'json';
        parsed.format = value;
        i += 1;
        break;
      }
      case '--verbose':
      case '-v':
        parsed.verbose = true;
        break;
      case '--help':
      case '-h':
        parsed.help = true;
        break;
      default:
        break;
    }
  }

  return parsed;
}

function logUsage(): void {
  console.log(`Mindflow Disabled Account Export CLI\n\nUsage:\n  npm run export-disabled-account -- --subject <subjectId> [--output <file>] [--host <url>] [--endpoint <path>] [--format zip|json]\n\nOptions:\n  --subject, --subjectId   Required Entra ID subject identifier\n  --output                 Destination file path (default: ./exports/<subjectId>-workspace.<ext>)\n  --host                   Base URL for the local dev server (default: ${DEFAULT_HOST})\n  --endpoint               API endpoint path returning the export archive (default: ${DEFAULT_ENDPOINT})\n  --format                 Expected response type: zip (default) or json\n  --verbose, -v            Print additional diagnostics\n  --help, -h               Show this message\n\nExample:\n  npm run export-disabled-account -- --subject 0000-aaaa-bbbb-cccc --output ./exports/alice.zip\n`);
}

function resolveOptions(args: ParsedArgs): ExportOptions {
  if (!args.subjectId) {
    throw new Error('Missing required --subject argument.');
  }

  if (args.format && !SUPPORTED_FORMATS.includes(args.format)) {
    throw new Error(`Unsupported format '${args.format}'. Expected one of: ${SUPPORTED_FORMATS.join(', ')}`);
  }

  const format = args.format ?? 'zip';
  return {
    subjectId: args.subjectId,
    host: args.host ?? DEFAULT_HOST,
    endpoint: args.endpoint ?? DEFAULT_ENDPOINT,
    output: args.output,
    format,
    verbose: Boolean(args.verbose)
  };
}

function buildRequestUrl(options: ExportOptions): URL {
  const base = options.host.endsWith('/') ? options.host.slice(0, -1) : options.host;
  const endpoint = options.endpoint.startsWith('/') ? options.endpoint : `/${options.endpoint}`;
  const url = new URL(`${base}${endpoint}`);
  url.searchParams.set('subjectId', options.subjectId);
  url.searchParams.set('format', options.format);
  return url;
}

async function ensureDirectory(filePath: string): Promise<void> {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });
}

async function writeBufferToFile(buffer: Buffer, filePath: string): Promise<void> {
  await ensureDirectory(filePath);
  await writeFile(filePath, buffer);
}

async function exportWorkspace(options: ExportOptions): Promise<string> {
  const url = buildRequestUrl(options);

  if (options.verbose) {
    console.log(`[mindflow] Requesting workspace export from ${url.toString()}`);
  }

  const response = await fetch(url, {
    headers: {
      Accept: options.format === 'zip' ? 'application/zip' : 'application/json'
    }
  });

  if (response.status === 404) {
    throw new Error('Export endpoint not found. Ensure the local dev server is running with export support enabled.');
  }

  if (!response.ok) {
    throw new Error(`Export request failed with status ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') ?? '';
  const extension = options.output?.split('.').pop() ?? (contentType.includes('json') ? 'json' : 'zip');
  const output = options.output ?? path.resolve(process.cwd(), 'exports', `${options.subjectId}-workspace.${extension}`);

  await writeBufferToFile(buffer, output);

  if (options.verbose) {
    console.log(`[mindflow] Export saved to ${output}`);
  }

  return output;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    logUsage();
    return;
  }

  let options: ExportOptions;
  try {
    options = resolveOptions(args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    logUsage();
    process.exitCode = 1;
    return;
  }

  try {
    const destination = await exportWorkspace(options);
    console.log(`✅ Workspace export complete: ${destination}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Export failed: ${message}`);
    if (!options.verbose) {
      console.error('Re-run with --verbose for additional diagnostics.');
    }
    process.exitCode = 1;
  }
}

await main();
