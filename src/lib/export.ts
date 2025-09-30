import { NodeRecord, EdgeRecord, GraphRecord } from './types';
import { computeLevels, findRootNodeId } from './hierarchy';

function escapeMarkdown(text: string): string {
  return text.replace(/[*_#`>/\\-]/g, m => '\\' + m).replace(/\r?\n+/g, ' ');
}

export function exportGraphAsMarkdown(graph: GraphRecord, nodes: NodeRecord[], edges: EdgeRecord[]): string {
  if (!nodes.length) return `# ${graph.name}\n(Empty graph)`;
  const rootId = findRootNodeId(nodes) as string;
  const levels = computeLevels(rootId, nodes, edges);
  // Deterministic ordering: by level then created timestamp then id
  const byId = new Map(nodes.map(n => [n.id, n] as const));
  const ordered = [...nodes].sort((a,b) => {
    const la = levels.get(a.id) ?? 0; const lb = levels.get(b.id) ?? 0;
    if (la !== lb) return la - lb;
    if (a.created !== b.created) return a.created.localeCompare(b.created);
    return a.id.localeCompare(b.id);
  });
  const lines: string[] = [];
  for (const n of ordered) {
    const lvl = levels.get(n.id) ?? 0;
    const indent = '  '.repeat(lvl);
    const text = escapeMarkdown(n.text || 'New Thought');
    lines.push(`${indent}- ${text}`);
  }
  return lines.join('\n') + '\n';
}

interface CanvasThemeLike {
  nodeBg: string; nodeBorder: string; nodeText: string; edgeColor: string; background: string; borderWidth: number; radius: number;
}

function resolveThemeFromDOM(): CanvasThemeLike {
  const cs = getComputedStyle(document.body);
  return {
    nodeBg: cs.getPropertyValue('--mf-node-bg').trim() || '#1b1b1f',
    nodeBorder: cs.getPropertyValue('--mf-node-border').trim() || '#2a2a30',
    nodeText: cs.getPropertyValue('--mf-node-text').trim() || '#f5f5f5',
    edgeColor: cs.getPropertyValue('--mf-node-border-selected').trim() || '#4f9dff',
    background: cs.getPropertyValue('--color-bg').trim() || '#111',
    borderWidth: parseFloat(cs.getPropertyValue('--mf-node-border-width')) || 1,
    radius: 6,
  };
}

export async function exportGraphAsPng(graph: GraphRecord, nodes: NodeRecord[], edges: EdgeRecord[]): Promise<Blob | null> {
  if (!nodes.length) return null;
  // Approx node dimensions (current styling): width dynamic; we'll measure longest text length
  const theme = resolveThemeFromDOM();
  const padding = 32;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x);
    maxY = Math.max(maxY, n.y);
  }
  const approxW = 160; // heuristic width; nodes have maxWidth 240 but text may wrap
  const approxH = 48;  // includes handles offset margin
  const width = (maxX - minX) + approxW + padding * 2;
  const height = (maxY - minY) + approxH + padding * 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(width, 8000);
  canvas.height = Math.min(height, 8000);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = theme.background;
  ctx.fillRect(0,0,canvas.width, canvas.height);
  // Build node lookup and center positions
  const center = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    center.set(n.id, { x: (n.x - minX) + padding + approxW/2, y: (n.y - minY) + padding + approxH/2 });
  }
  // Edges
  ctx.strokeStyle = theme.edgeColor;
  ctx.lineWidth = 1;
  for (const e of edges) {
    const a = center.get(e.sourceNodeId); const b = center.get(e.targetNodeId);
    if (!a || !b) continue;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // Nodes
  ctx.font = '12px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const n of nodes) {
    const c = center.get(n.id)!;
    const w = approxW; const h = 30;
    const x = c.x - w/2; const y = c.y - h/2;
    ctx.fillStyle = theme.nodeBg; ctx.strokeStyle = theme.nodeBorder; ctx.lineWidth = theme.borderWidth; 
    // rounded rect
    const r = theme.radius;
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    const text = (n.text || 'New Thought').slice(0,60).replace(/\n+/g,' ');
    ctx.fillStyle = theme.nodeText;
    ctx.fillText(text, c.x, c.y);
  }
  return await new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png'));
}

export function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display='none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
}
