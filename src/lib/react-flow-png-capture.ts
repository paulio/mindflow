import { toCanvas } from 'html-to-image';

const MAX_RASTER_EDGE = 8_000;
const GRAPH_PADDING = 80;
const MARKER_PADDING_MULTIPLIER = 4;
// GraphCanvas uses 9px React Flow markers; this capture bound leaves room for marker geometry.
const CAPTURE_MARKER_PADDING = 12;
const DEFAULT_EDGE_STROKE_WIDTH = 1;
const EDGE_LABEL_SELECTORS = [
  '.react-flow__edge-label',
  '[data-edge-label]',
  '.react-flow__edgelabel-renderer text',
  '.react-flow__edge-text',
];
const EXCLUDED_SELECTORS = [
  '.react-flow__controls',
  '.react-flow__attribution',
  '.react-flow__nodesselection',
  '.react-flow__selection',
  '.react-flow__connectionline',
  '.react-flow__edgeupdater',
  '.react-flow__handle',
  '.react-flow__resize-control',
];

interface GraphBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface ViewportTransform {
  x: number;
  y: number;
  zoom: number;
}

export async function captureReactFlowPng(surface: HTMLElement | null): Promise<HTMLCanvasElement | null> {
  if (!isReactFlowSurface(surface)) return null;

  let stage: HTMLElement | null = null;
  try {
    const sourceViewportTransform = getViewportTransform(surface);
    const bounds = getGraphBounds(surface, sourceViewportTransform);
    if (!bounds) return null;

    const clone = surface.cloneNode(true) as HTMLElement;
    copyComputedStyles(surface, clone);
    stage = document.createElement('div');
    stage.dataset.mfExportStage = '';
    stage.style.cssText = 'position:fixed;left:-100000px;top:0;overflow:hidden;pointer-events:none;';

    const width = Math.max(1, Math.ceil(bounds.maxX - bounds.minX + GRAPH_PADDING * 2));
    const height = Math.max(1, Math.ceil(bounds.maxY - bounds.minY + GRAPH_PADDING * 2));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_RASTER_EDGE / Math.max(width, height));

    clone.style.width = `${width}px`;
    clone.style.height = `${height}px`;
    clone.style.background = '#0d0f17';
    const viewport = clone.querySelector<HTMLElement>('.react-flow__viewport');
    if (!viewport) return null;
    const captureZoom = Math.min(
      (width - GRAPH_PADDING * 2) / (bounds.maxX - bounds.minX),
      (height - GRAPH_PADDING * 2) / (bounds.maxY - bounds.minY),
    );
    viewport.style.transform = `translate(${GRAPH_PADDING - bounds.minX * captureZoom}px, ${GRAPH_PADDING - bounds.minY * captureZoom}px) scale(${captureZoom})`;
    viewport.style.transformOrigin = '0 0';
    EXCLUDED_SELECTORS.forEach(selector => clone.querySelectorAll(selector).forEach(element => element.remove()));

    stage.append(clone);
    document.body.append(stage);
    document.dispatchEvent(new CustomEvent('mindflow:png-capture', {
      detail: {
        hasGrid: clone.querySelector('.react-flow__background') !== null,
        controlsCount: clone.querySelectorAll('.react-flow__controls').length,
        handlesCount: clone.querySelectorAll('.react-flow__handle').length,
      },
    }));
    return await toCanvas(clone, {
      backgroundColor: '#0d0f17',
      cacheBust: true,
      width,
      height,
      pixelRatio,
    });
  } catch {
    return null;
  } finally {
    stage?.remove();
  }
}

function isReactFlowSurface(surface: HTMLElement | null): surface is HTMLElement {
  return surface !== null
    && surface.classList.contains('react-flow')
    && surface.querySelector('.react-flow__viewport') !== null
    && surface.querySelector('.react-flow__node') !== null;
}

function getGraphBounds(surface: HTMLElement, viewportTransform: ViewportTransform): GraphBounds | null {
  const surfaceRect = surface.getBoundingClientRect();
  const nodes = Array.from(surface.querySelectorAll<HTMLElement>('.react-flow__node'));
  const nodeBounds = nodes.map(node => getNodeBounds(node, surfaceRect, viewportTransform)).filter((bounds): bounds is GraphBounds => bounds !== null);
  const edgeBounds = Array.from(surface.querySelectorAll<SVGGraphicsElement>('.react-flow__edge path, .react-flow__edges path'))
    .map(edge => getEdgeBounds(edge, surfaceRect, viewportTransform))
    .filter((bounds): bounds is GraphBounds => bounds !== null);
  const edgeLabelBounds = getEdgeLabelBounds(surface, surfaceRect, viewportTransform);
  const allBounds = [...nodeBounds, ...edgeBounds, ...edgeLabelBounds];
  if (allBounds.length === 0) return null;

  const [firstBounds, ...remainingBounds] = allBounds;
  return remainingBounds.reduce<GraphBounds>((combined, bounds) => ({
    minX: Math.min(combined.minX, bounds.minX),
    minY: Math.min(combined.minY, bounds.minY),
    maxX: Math.max(combined.maxX, bounds.maxX),
    maxY: Math.max(combined.maxY, bounds.maxY),
  }), firstBounds);
}

function getNodeBounds(node: HTMLElement, surfaceRect: DOMRect, viewportTransform: ViewportTransform): GraphBounds | null {
  const rect = node.getBoundingClientRect();
  if (isUsableRect(rect)) {
    return getScreenBounds(rect, surfaceRect, viewportTransform);
  }

  const position = parseTranslate(node.style.transform);
  const width = Number.parseFloat(node.style.width);
  const height = Number.parseFloat(node.style.height);
  if (!position || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return {
    minX: (position.x - viewportTransform.x) / viewportTransform.zoom,
    minY: (position.y - viewportTransform.y) / viewportTransform.zoom,
    maxX: (position.x + width - viewportTransform.x) / viewportTransform.zoom,
    maxY: (position.y + height - viewportTransform.y) / viewportTransform.zoom,
  };
}

function getScreenBounds(rect: DOMRect, surfaceRect: DOMRect, viewportTransform: ViewportTransform): GraphBounds | null {
  if (!isUsableRect(rect)) return null;
  return {
    minX: (rect.left - surfaceRect.left - viewportTransform.x) / viewportTransform.zoom,
    minY: (rect.top - surfaceRect.top - viewportTransform.y) / viewportTransform.zoom,
    maxX: (rect.right - surfaceRect.left - viewportTransform.x) / viewportTransform.zoom,
    maxY: (rect.bottom - surfaceRect.top - viewportTransform.y) / viewportTransform.zoom,
  };
}

function isUsableRect(rect: DOMRect): boolean {
  return [rect.left, rect.top, rect.right, rect.bottom, rect.width, rect.height].every(Number.isFinite)
    && rect.width > 0
    && rect.height > 0;
}

function getViewportTransform(surface: HTMLElement): ViewportTransform {
  const viewport = surface.querySelector<HTMLElement>('.react-flow__viewport');
  return parseViewportTransform(viewport?.style.transform ?? '');
}

function parseViewportTransform(transform: string): ViewportTransform {
  const translateMatch = transform.match(/translate\(\s*(-?[\d.]+)px[\s,]+\s*(-?[\d.]+)px\s*\)/);
  const scaleMatch = transform.match(/scale\(\s*(-?[\d.]+)\s*\)/);
  const matrixMatch = transform.match(/matrix\(\s*(-?[\d.e+-]+)[\s,]+(-?[\d.e+-]+)[\s,]+(-?[\d.e+-]+)[\s,]+(-?[\d.e+-]+)[\s,]+(-?[\d.e+-]+)[\s,]+(-?[\d.e+-]+)\s*\)/);
  if (matrixMatch) {
    const a = Number.parseFloat(matrixMatch[1]);
    const b = Number.parseFloat(matrixMatch[2]);
    const c = Number.parseFloat(matrixMatch[3]);
    const d = Number.parseFloat(matrixMatch[4]);
    const x = Number.parseFloat(matrixMatch[5]);
    const y = Number.parseFloat(matrixMatch[6]);
    const zoom = a;
    if (![a, b, c, d, x, y].every(Number.isFinite) || b !== 0 || c !== 0 || a !== d || zoom <= 0) {
      return { x: 0, y: 0, zoom: 1 };
    }
    return {
      x,
      y,
      zoom,
    };
  }

  const x = translateMatch ? Number.parseFloat(translateMatch[1]) : 0;
  const y = translateMatch ? Number.parseFloat(translateMatch[2]) : 0;
  const zoom = scaleMatch ? Number.parseFloat(scaleMatch[1]) : 1;
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : 1,
  };
}

function parseTranslate(transform: string): { x: number; y: number } | null {
  const match = transform.match(/translate(?:3d)?\(\s*(-?[\d.]+)px[\s,]+\s*(-?[\d.]+)px/);
  if (!match) return null;
  return { x: Number.parseFloat(match[1]), y: Number.parseFloat(match[2]) };
}

function copyComputedStyles(source: HTMLElement, clone: HTMLElement): void {
  const computed = window.getComputedStyle(source);
  [
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'letter-spacing',
    'text-rendering',
    'color',
    'width',
    'height',
    'background-color',
  ].forEach(property => clone.style.setProperty(property, computed.getPropertyValue(property)));
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);
    if (property.startsWith('--')) clone.style.setProperty(property, computed.getPropertyValue(property));
  }
}

function getEdgeBounds(
  edge: SVGGraphicsElement,
  surfaceRect: DOMRect,
  viewportTransform: ViewportTransform,
): GraphBounds | null {
  const bounds = getScreenBounds(edge.getBoundingClientRect(), surfaceRect, viewportTransform);
  if (!bounds || (!edge.getAttribute('marker-end') && !edge.getAttribute('marker-start'))) return bounds;

  const strokeWidth = Number.parseFloat(window.getComputedStyle(edge).strokeWidth);
  const edgeStrokePadding = Math.max(
    Number.isFinite(strokeWidth) && strokeWidth > 0 ? strokeWidth : DEFAULT_EDGE_STROKE_WIDTH,
    DEFAULT_EDGE_STROKE_WIDTH,
  ) * MARKER_PADDING_MULTIPLIER;
  const markerPadding = CAPTURE_MARKER_PADDING;
  return {
    minX: bounds.minX - markerPadding - edgeStrokePadding,
    minY: bounds.minY - markerPadding - edgeStrokePadding,
    maxX: bounds.maxX + markerPadding + edgeStrokePadding,
    maxY: bounds.maxY + markerPadding + edgeStrokePadding,
  };
}

function getEdgeLabelBounds(
  surface: HTMLElement,
  surfaceRect: DOMRect,
  viewportTransform: ViewportTransform,
): GraphBounds[] {
  const selector = EDGE_LABEL_SELECTORS.join(',');
  return Array.from(surface.querySelectorAll<HTMLElement | SVGGraphicsElement>(selector))
    .map(label => getScreenBounds(label.getBoundingClientRect(), surfaceRect, viewportTransform))
    .filter((bounds): bounds is GraphBounds => bounds !== null);
}