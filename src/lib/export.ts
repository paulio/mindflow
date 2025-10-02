import { NodeRecord, EdgeRecord, GraphRecord } from './types';
import { findRootNodeId } from './hierarchy';
import { resolveNodeBackground } from './background-precedence';

function escapeMarkdown(text: string): string {
  return text.replace(/[*_#`>/\\-]/g, m => '\\' + m).replace(/\r?\n+/g, ' ');
}

export function exportGraphAsMarkdown(graph: GraphRecord, nodes: NodeRecord[], edges: EdgeRecord[]): string {
  if (!nodes.length) return `# ${graph.name}\n(Empty graph)`;

  // Build adjacency (undirected)
  const adj = new Map<string, Set<string>>();
  function add(a: string, b: string) { (adj.get(a) || adj.set(a, new Set()).get(a)!).add(b); }
  for (const e of edges) { add(e.sourceNodeId, e.targetNodeId); add(e.targetNodeId, e.sourceNodeId); }

  const byId = new Map(nodes.map(n => [n.id, n] as const));
  // Sort all nodes by created then id for stable deterministic ordering.
  const globalOrder = [...nodes].sort((a,b) => a.created === b.created ? a.id.localeCompare(b.id) : a.created.localeCompare(b.created));
  const globalRootId = findRootNodeId(nodes) as string; // earliest created overall

  const visited = new Set<string>();
  const lines: string[] = [];

  interface ParentMap { [id: string]: string | null; }

  // Build a spanning tree for a component starting from a chosen root (earliest created in that component)
  function buildComponentTree(rootId: string) {
    const queue: string[] = [rootId];
    visited.add(rootId);
    const depth = new Map<string, number>(); depth.set(rootId, 0);
    const parent: ParentMap = { [rootId]: null };
    while (queue.length) {
      const cur = queue.shift()!;
      const nbrs = adj.get(cur);
      if (!nbrs) continue;
      // Determine traversal order: stable by (created, id)
      const orderedNbrs = [...nbrs].filter(id => !visited.has(id)).sort((a,b) => {
        const na = byId.get(a)!; const nb = byId.get(b)!;
        return na.created === nb.created ? na.id.localeCompare(nb.id) : na.created.localeCompare(nb.created);
      });
      for (const nId of orderedNbrs) {
        visited.add(nId);
        parent[nId] = cur;
        depth.set(nId, (depth.get(cur) || 0) + 1);
        queue.push(nId);
      }
    }
    // Build children map
    const children = new Map<string, string[]>();
    for (const id of Object.keys(parent)) { const p = parent[id]; if (p !== null) { (children.get(p) || children.set(p, []).get(p)!).push(id); } }
    // Sort each children list deterministically
    for (const [pid, arr] of children) {
      arr.sort((a,b) => {
        const na = byId.get(a)!; const nb = byId.get(b)!;
        return na.created === nb.created ? na.id.localeCompare(nb.id) : na.created.localeCompare(nb.created);
      });
    }
    // DFS output respecting child ordering
    function emit(id: string) {
      const d = depth.get(id) || 0;
      const indent = '  '.repeat(d);
      const rec = byId.get(id)!;
      lines.push(`${indent}- ${escapeMarkdown(rec.text || 'New Thought')}`);
      const kids = children.get(id) || [];
      for (const k of kids) emit(k);
    }
    emit(rootId);
  }

  // Components: first ensure the global root component is emitted first, then others in creation order.
  if (globalRootId) buildComponentTree(globalRootId);
  for (const n of globalOrder) {
    if (!visited.has(n.id)) {
      buildComponentTree(n.id);
    }
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
    // Derive colours using the same precedence as the live node components
    const fill = resolveNodeBackground(n) || theme.nodeBg;
    const borderColour = n.currentBorderColour || n.originalBorderColour || theme.nodeBorder;
    ctx.fillStyle = fill; ctx.strokeStyle = borderColour; ctx.lineWidth = theme.borderWidth;
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
