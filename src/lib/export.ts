import { NodeRecord, EdgeRecord, GraphRecord } from './types';
import { findRootNodeId } from './hierarchy';
import { resolveNodeBackground } from './background-precedence';

function escapeMarkdown(text: string): string {
  // Replace newline sequences with a single space, then collapse runs of spaces to a single space.
  return text
    .replace(/\r?\n+/g, ' ')   // newline -> space
    .replace(/ {2,}/g, ' ')      // collapse multiple spaces
    .trimEnd();                  // avoid trailing spaces at line end
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
  // Multiline + dimension measurement
  const lineHeight = 14; // px (approximate UI line height)
  interface Dim { w: number; h: number; lines: string[]; }
  const dims = new Map<string, Dim>();
  const INNER_PADDING_X = 4; // matches inner body padding in ThoughtNode
  const MAX_W = 240;
  const MIN_W = 100;
  const MIN_H = 30;
  // Helper to estimate width if DOM not found (pre-wrap)
  function roughEstimateWidth(lines: string[]): number {
    const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
    return Math.min(MAX_W, Math.max(MIN_W, longest * 7 + INNER_PADDING_X * 2 + 16));
  }
  function measureFromDOM(id: string): { w: number; h: number } | null {
    try {
      const esc = (window as any).CSS?.escape ? (window as any).CSS.escape(id) : id.replace(/"/g, '\\"');
      const el = document.querySelector(`.react-flow__node[data-id="${esc}"]`);
      if (!el) return null;
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width < 10 || r.height < 10) return null;
      return { w: r.width, h: r.height };
    } catch { return null; }
  }
  // Canvas context for measuring text to wrap accurately
  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d');
  if (mctx) { mctx.font = '12px system-ui'; mctx.textBaseline = 'top'; }
  function wrapLine(raw: string, maxWidth: number): string[] {
    if (!mctx) return [raw];
    if (mctx.measureText(raw).width <= maxWidth) return [raw];
    const words = raw.split(/(\s+)/); // keep whitespace tokens
    const out: string[] = [];
    let cur = '';
    for (const token of words) {
      const candidate = cur + token;
      if (mctx.measureText(candidate).width <= maxWidth) {
        cur = candidate;
      } else {
        if (cur.trim().length) out.push(cur.trimEnd());
        // If single token wider than max, hard-break by characters
        if (mctx.measureText(token).width > maxWidth) {
          let chunk = '';
            for (const ch of token) {
              if (mctx.measureText(chunk + ch).width <= maxWidth) {
                chunk += ch;
              } else {
                if (chunk.length) out.push(chunk);
                chunk = ch;
              }
            }
          if (chunk.length) cur = chunk; else cur = '';
        } else {
          cur = token;
        }
      }
    }
    if (cur.trim().length) out.push(cur.trimEnd());
    return out.length ? out : [''];
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    const rawText = (n.text || 'New Thought');
    const baseLines = rawText.split(/\r?\n/);
    const domDim = measureFromDOM(n.id); // if present we still wrap to keep consistency; width acts as constraint
    let w = domDim ? domDim.w : (n.width ? Math.min(MAX_W, Math.max(MIN_W, n.width)) : roughEstimateWidth(baseLines));
    w = Math.max(MIN_W, Math.min(MAX_W, w));
    const contentMax = Math.max(20, w - INNER_PADDING_X * 2);
    let wrapped: string[] = [];
    for (const bl of baseLines) {
      const parts = wrapLine(bl, contentMax);
      wrapped.push(...parts);
    }
    // Recalculate width to fit the widest wrapped line if we didn't rely on DOM measurement
    if (!domDim && mctx) {
      let maxLine = 0; for (const l of wrapped) { const lw = mctx.measureText(l).width; if (lw > maxLine) maxLine = lw; }
      const targetW = maxLine + INNER_PADDING_X * 2 + 1; // +1 for rounding
      w = Math.max(MIN_W, Math.min(MAX_W, Math.max(w, targetW)));
    }
    let h = Math.max(MIN_H, wrapped.length * lineHeight + 8);
    if (n.height) h = Math.max(h, n.height);
    dims.set(n.id, { w, h, lines: wrapped });
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + w);
    maxY = Math.max(maxY, n.y + h);
  }
  const width = (maxX - minX) + padding * 2;
  const height = (maxY - minY) + padding * 2;
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
    const d = dims.get(n.id)!;
    center.set(n.id, { x: (n.x - minX) + padding + d.w/2, y: (n.y - minY) + padding + d.h/2 });
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
    const { w, h, lines } = dims.get(n.id)!;
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
    // Text lines already prepared in dims
    ctx.fillStyle = theme.nodeText;
    ctx.textBaseline = 'top';
    const totalTextHeight = lines.length * lineHeight;
    let ty = c.y - totalTextHeight / 2;
    for (const line of lines) {
      const clipped = line.slice(0, 500); // generous limit
      ctx.fillText(clipped, c.x, ty);
      ty += lineHeight;
    }
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
