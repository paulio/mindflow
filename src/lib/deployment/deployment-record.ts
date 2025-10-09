export type DeploymentStatus = 'succeeded' | 'failed' | 'rolledBack';

export interface DeploymentRecord {
  deploymentId: string;
  commitSha: string;
  branch: string;
  status: DeploymentStatus;
  deployedAt: string;
  reviewer?: string;
  notes?: string;
}

export interface DeploymentMetadata {
  deploymentId: string;
  commitSha: string;
  branch?: string;
  status: 'succeeded' | 'failed';
  reviewer?: string;
  notes?: string;
  timestamp?: string;
}

function assertCommitSha(value: string) {
  if (!value || typeof value !== 'string') {
    throw new Error('Deployment commit SHA missing');
  }
  const trimmed = value.trim();
  if (trimmed.length < 7 || trimmed.length > 40) {
    throw new Error(`Deployment commit SHA must be 7-40 characters (received ${trimmed.length})`);
  }
  if (!/^[0-9a-f]+$/i.test(trimmed)) {
    throw new Error('Deployment commit SHA must be hexadecimal');
  }
}

function coerceBranch(branch?: string): string {
  const normalized = branch?.trim() ?? 'main';
  if (normalized !== 'main') {
    throw new Error(`Unsupported deployment branch: ${normalized}`);
  }
  return normalized;
}

export function createDeploymentRecord(metadata: DeploymentMetadata): DeploymentRecord {
  if (!metadata.deploymentId || !metadata.deploymentId.trim()) {
    throw new Error('Deployment ID required');
  }
  assertCommitSha(metadata.commitSha);
  const branch = coerceBranch(metadata.branch);
  const deployedAt = metadata.timestamp ?? new Date().toISOString();

  return {
    deploymentId: metadata.deploymentId.trim(),
    commitSha: metadata.commitSha.trim(),
    branch,
    status: metadata.status,
    deployedAt,
    reviewer: metadata.reviewer?.trim() || undefined,
    notes: metadata.notes?.trim() || undefined,
  };
}

export function markDeploymentRolledBack(record: DeploymentRecord, reviewer: string, notes?: string): DeploymentRecord {
  if (!reviewer?.trim()) {
    throw new Error('Reviewer name required to mark deployment rolled back');
  }

  return {
    ...record,
    status: 'rolledBack',
    reviewer: reviewer.trim(),
    notes: notes?.trim() || record.notes,
    deployedAt: new Date().toISOString(),
  };
}

export function isDeploymentFailure(record: DeploymentRecord): boolean {
  return record.status === 'failed';
}

export function summarizeDeployment(record: DeploymentRecord): string {
  const statusLabel = record.status === 'succeeded'
    ? 'Deployment succeeded'
    : record.status === 'failed'
      ? 'Deployment failed'
      : 'Deployment rolled back';
  const reviewerSuffix = record.reviewer ? ` · reviewer ${record.reviewer}` : '';
  return `${statusLabel} · commit ${record.commitSha.slice(0, 7)} on ${record.branch}${reviewerSuffix}`;
}
