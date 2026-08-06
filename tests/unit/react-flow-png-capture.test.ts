import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureReactFlowPng } from '../../src/lib/react-flow-png-capture';

const toCanvasMock = vi.fn();

vi.mock('html-to-image', () => ({
  toCanvas: (...args: unknown[]) => toCanvasMock(...args),
}));

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) } as DOMRect;
}

function createSurface(): HTMLElement {
  const surface = document.createElement('div');
  surface.className = 'react-flow';
  surface.innerHTML = `
    <svg class="react-flow__background"><pattern id="grid" /></svg>
    <div class="react-flow__viewport">
      <svg class="react-flow__edges">
        <defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M 0 0 L 9 4.5 L 0 9 z" /></marker></defs>
        <g class="react-flow__edge">
          <path class="graph-edge" d="M 0 0 L 10 10" />
        </g>
      </svg>
      <div class="react-flow__edgelabel-renderer">
        <div class="react-flow__edge-label" data-edge-label>Reference Label</div>
      </div>
      <div class="react-flow__node" style="width: 120px; height: 50px; transform: translate(100px, 200px)">First</div>
      <div class="react-flow__node" style="width: 80px; height: 40px; transform: translate(600px, 500px)">Second</div>
      <div class="react-flow__handle" />
      <div class="react-flow__resize-control" />
      <div class="react-flow__nodesselection" />
      <div class="react-flow__selection" />
      <div class="react-flow__connectionline" />
      <div class="react-flow__edgeupdater" />
    </div>
    <div class="react-flow__controls" />
    <div class="react-flow__attribution" />
  `;
  surface.getBoundingClientRect = () => rect(0, 0, 1_000, 800);
  const nodes = surface.querySelectorAll<HTMLElement>('.react-flow__node');
  nodes[0].getBoundingClientRect = () => rect(100, 200, 120, 50);
  nodes[1].getBoundingClientRect = () => rect(600, 500, 80, 40);
  const edgeLabel = surface.querySelector<HTMLElement>('.react-flow__edge-label');
  if (edgeLabel) {
    edgeLabel.getBoundingClientRect = () => rect(250, 260, 90, 20);
  }
  document.body.append(surface);
  return surface;
}

function disableNodeBounds(surface: HTMLElement): void {
  surface.querySelectorAll<HTMLElement>('.react-flow__node').forEach(node => {
    node.getBoundingClientRect = () => rect(0, 0, 0, 0);
    node.style.width = '0px';
    node.style.height = '0px';
    node.style.transform = 'none';
  });
}

describe('captureReactFlowPng', () => {
  beforeEach(() => {
    toCanvasMock.mockReset();
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('prepares a complete, control-free staged clone and bounds whole-graph raster dimensions', async () => {
    const surface = createSurface();
    const captureEvent = vi.fn();
    document.addEventListener('mindflow:png-capture', captureEvent);
    let resolveCanvas: (canvas: HTMLCanvasElement) => void = () => undefined;
    toCanvasMock.mockImplementation(() => new Promise<HTMLCanvasElement>(resolve => { resolveCanvas = resolve; }));

    const capture = captureReactFlowPng(surface);

    const stage = document.querySelector<HTMLElement>('[data-mf-export-stage]');
    const clone = stage?.firstElementChild as HTMLElement;
    expect(stage).not.toBeNull();
    expect(clone.querySelector('.react-flow__background')).not.toBeNull();
    expect(clone.querySelector('.react-flow__edges path')).not.toBeNull();
    expect(clone.querySelector('.react-flow__controls')).toBeNull();
    expect(clone.querySelector('.react-flow__attribution')).toBeNull();
    expect(clone.querySelector('.react-flow__nodesselection')).toBeNull();
    expect(clone.querySelector('.react-flow__selection')).toBeNull();
    expect(clone.querySelector('.react-flow__connectionline')).toBeNull();
    expect(clone.querySelector('.react-flow__edgeupdater')).toBeNull();
    expect(clone.querySelector('.react-flow__handle')).toBeNull();
    expect(clone.querySelector('.react-flow__resize-control')).toBeNull();
    expect(clone.querySelector<HTMLElement>('.react-flow__viewport')?.style.transform).toContain('translate');
    expect(captureEvent).toHaveBeenCalledWith(expect.objectContaining({
      detail: { hasGrid: true, controlsCount: 0, handlesCount: 0 },
    }));
    expect(toCanvasMock).toHaveBeenCalledWith(clone, expect.objectContaining({
      backgroundColor: '#0d0f17',
      cacheBust: true,
      width: expect.any(Number),
      height: expect.any(Number),
      pixelRatio: expect.any(Number),
    }));
    const [, options] = toCanvasMock.mock.calls[0] as [HTMLElement, { width: number; height: number; pixelRatio: number }];
    expect(options.width).toBe(740);
    expect(options.height).toBe(500);
    expect(options.pixelRatio * Math.max(options.width, options.height)).toBeLessThanOrEqual(8_000);

    const canvas = document.createElement('canvas');
    resolveCanvas(canvas);
    await expect(capture).resolves.toBe(canvas);
    expect(document.querySelector('[data-mf-export-stage]')).toBeNull();
    expect(surface.querySelector('.react-flow__controls')).not.toBeNull();
    document.removeEventListener('mindflow:png-capture', captureEvent);
  });

  it('copies inherited font, color, and custom property styles to the staged clone', async () => {
    const surface = createSurface();
    surface.style.fontFamily = 'Georgia';
    surface.style.color = 'rgb(240, 240, 240)';
    surface.style.setProperty('--xy-node-background-color', 'rgb(20, 30, 40)');
    toCanvasMock.mockResolvedValueOnce(document.createElement('canvas'));

    await captureReactFlowPng(surface);

    const clone = document.querySelector<HTMLElement>('[data-mf-export-stage]');
    expect(clone).toBeNull();
    expect(toCanvasMock).toHaveBeenCalledTimes(1);
    const capturedClone = toCanvasMock.mock.calls[0][0] as HTMLElement;
    expect(capturedClone.style.fontFamily).toBe('Georgia');
    expect(capturedClone.style.color).toBe('rgb(240, 240, 240)');
    expect(capturedClone.style.fontSize).toBe(window.getComputedStyle(surface).fontSize);
    expect(capturedClone.style.fontWeight).toBe(window.getComputedStyle(surface).fontWeight);
    expect(capturedClone.style.lineHeight).toBe(window.getComputedStyle(surface).lineHeight);
    expect(capturedClone.style.letterSpacing).toBe(window.getComputedStyle(surface).letterSpacing);
    expect(capturedClone.style.textRendering).toBe(window.getComputedStyle(surface).textRendering);
    expect(capturedClone.style.width).toBe('740px');
    expect(capturedClone.style.height).toBe('500px');
    expect(capturedClone.style.backgroundColor).toBe('rgb(13, 15, 23)');
    expect(capturedClone.style.getPropertyValue('--xy-node-background-color')).toBe('rgb(20, 30, 40)');
  });

  it('includes edge path bounds when framing the graph', async () => {
    const surface = createSurface();
    const edge = surface.querySelector<SVGPathElement>('.graph-edge');
    if (!edge) throw new Error('Expected graph edge');
    edge.getBoundingClientRect = () => rect(-1_000, -500, 3_000, 2_000);
    toCanvasMock.mockResolvedValueOnce(document.createElement('canvas'));

    await captureReactFlowPng(surface);

    const [, options] = toCanvasMock.mock.calls[0] as [HTMLElement, { width: number; height: number }];
    expect(options.width).toBeGreaterThan(3_000);
    expect(options.height).toBeGreaterThan(2_000);
  });

  it('pads real SVG edge bounds for marker-start and marker-end using 9px marker-derived capture padding', async () => {
    const surface = createSurface();
    const edge = surface.querySelector<SVGPathElement>('.graph-edge');
    if (!edge) throw new Error('Expected graph edge');
    disableNodeBounds(surface);
    const edgeLabel = surface.querySelector<HTMLElement>('.react-flow__edge-label');
    if (edgeLabel) {
      edgeLabel.getBoundingClientRect = () => rect(0, 0, 0, 0);
    }
    edge.setAttribute('marker-start', 'url(#arrow)');
    edge.setAttribute('marker-end', 'url(#arrow)');
    edge.style.strokeWidth = '2px';
    edge.getBoundingClientRect = () => rect(2_000, 1_500, 100, 80);
    toCanvasMock.mockResolvedValueOnce(document.createElement('canvas'));

    await captureReactFlowPng(surface);

    const [, options] = toCanvasMock.mock.calls[0] as [HTMLElement, { width: number; height: number }];
    expect(options.width).toBe(300);
    expect(options.height).toBe(280);
  });

  it('keeps marker padding in logical graph units after source viewport conversion', async () => {
    const surface = createSurface();
    const viewport = surface.querySelector<HTMLElement>('.react-flow__viewport');
    const edge = surface.querySelector<SVGPathElement>('.graph-edge');
    if (!viewport || !edge) throw new Error('Expected viewport and graph edge');
    viewport.style.transform = 'translate(0px, 0px) scale(2)';
    disableNodeBounds(surface);
    const edgeLabel = surface.querySelector<HTMLElement>('.react-flow__edge-label');
    if (edgeLabel) {
      edgeLabel.getBoundingClientRect = () => rect(0, 0, 0, 0);
    }
    edge.setAttribute('marker-start', 'url(#arrow)');
    edge.setAttribute('marker-end', 'url(#arrow)');
    edge.style.strokeWidth = '2px';
    edge.getBoundingClientRect = () => rect(800, 400, 100, 100);
    toCanvasMock.mockResolvedValueOnce(document.createElement('canvas'));

    await captureReactFlowPng(surface);

    const [, options] = toCanvasMock.mock.calls[0] as [HTMLElement, { width: number; height: number }];
    expect(options.width).toBe(250);
    expect(options.height).toBe(250);
    const cloneViewport = toCanvasMock.mock.calls[0][0].querySelector<HTMLElement>('.react-flow__viewport');
    expect(cloneViewport?.style.transform).toBe('translate(-300px, -100px) scale(1)');
    expect(viewport.style.transform).toBe('translate(0px, 0px) scale(2)');
  });

  it('includes rendered edge label bounds that extend beyond edge paths', async () => {
    const surface = createSurface();
    const edge = surface.querySelector<SVGPathElement>('.graph-edge');
    const edgeLabel = surface.querySelector<HTMLElement>('.react-flow__edge-label');
    if (!edge || !edgeLabel) throw new Error('Expected graph edge and edge label');
    disableNodeBounds(surface);
    edge.getBoundingClientRect = () => rect(200, 200, 120, 60);
    edgeLabel.getBoundingClientRect = () => rect(520, 180, 110, 30);
    toCanvasMock.mockResolvedValueOnce(document.createElement('canvas'));

    await captureReactFlowPng(surface);

    const [, options] = toCanvasMock.mock.calls[0] as [HTMLElement, { width: number; height: number }];
    expect(options.width).toBe(590);
    expect(options.height).toBe(240);
  });

  it('does not let a viewport-sized edge label renderer container inflate bounds', async () => {
    const surface = createSurface();
    const edge = surface.querySelector<SVGPathElement>('.graph-edge');
    const edgeLabel = surface.querySelector<HTMLElement>('.react-flow__edge-label');
    const edgeLabelRenderer = surface.querySelector<HTMLElement>('.react-flow__edgelabel-renderer');
    if (!edge || !edgeLabel || !edgeLabelRenderer) throw new Error('Expected graph edge, edge label, and renderer');
    disableNodeBounds(surface);
    edge.getBoundingClientRect = () => rect(200, 200, 120, 60);
    edgeLabelRenderer.getBoundingClientRect = () => rect(0, 0, 1_000, 800);
    edgeLabel.getBoundingClientRect = () => rect(520, 180, 110, 30);
    toCanvasMock.mockResolvedValueOnce(document.createElement('canvas'));

    await captureReactFlowPng(surface);

    const [, options] = toCanvasMock.mock.calls[0] as [HTMLElement, { width: number; height: number }];
    expect(options.width).toBe(590);
    expect(options.height).toBe(240);
  });

  it('converts screen-space node bounds through the source viewport before framing the clone', async () => {
    const surface = createSurface();
    const viewport = surface.querySelector<HTMLElement>('.react-flow__viewport');
    if (!viewport) throw new Error('Expected viewport');
    viewport.style.transform = 'matrix(2, 0, 0, 2, 120, 80)';
    const nodes = surface.querySelectorAll<HTMLElement>('.react-flow__node');
    nodes[0].getBoundingClientRect = () => rect(320, 480, 240, 100);
    nodes[1].getBoundingClientRect = () => rect(1320, 1080, 160, 80);
    const edgeLabel = surface.querySelector<HTMLElement>('.react-flow__edge-label');
    if (edgeLabel) {
      edgeLabel.getBoundingClientRect = () => rect(0, 0, 0, 0);
    }
    let resolveCanvas: (canvas: HTMLCanvasElement) => void = () => undefined;
    toCanvasMock.mockImplementationOnce(() => new Promise<HTMLCanvasElement>(resolve => { resolveCanvas = resolve; }));

    const capture = captureReactFlowPng(surface);

    const cloneViewport = document.querySelector<HTMLElement>('[data-mf-export-stage] .react-flow__viewport');
    expect(cloneViewport?.style.transform).toBe('translate(-20px, -120px) scale(1)');
    expect(viewport.style.transform).toBe('matrix(2, 0, 0, 2, 120, 80)');
    resolveCanvas(document.createElement('canvas'));
    await capture;
  });

  it('inverts the source viewport for inline node-position fallbacks', async () => {
    const surface = createSurface();
    const viewport = surface.querySelector<HTMLElement>('.react-flow__viewport');
    if (!viewport) throw new Error('Expected viewport');
    viewport.style.transform = 'translate(120px, 80px) scale(2)';
    surface.querySelectorAll<HTMLElement>('.react-flow__node').forEach(node => {
      node.getBoundingClientRect = () => rect(0, 0, 0, 0);
    });
    toCanvasMock.mockResolvedValueOnce(document.createElement('canvas'));

    await captureReactFlowPng(surface);

    const [, options] = toCanvasMock.mock.calls[0] as [HTMLElement, { width: number; height: number }];
    expect(options.width).toBe(450);
    expect(options.height).toBe(330);
  });

  it('normalizes non-uniform matrix transforms instead of using only the first coefficient', async () => {
    const surface = createSurface();
    const viewport = surface.querySelector<HTMLElement>('.react-flow__viewport');
    if (!viewport) throw new Error('Expected viewport');
    viewport.style.transform = 'matrix(2, 0, 0, 3, 120, 80)';
    surface.querySelectorAll<HTMLElement>('.react-flow__node').forEach(node => {
      node.getBoundingClientRect = () => rect(0, 0, 0, 0);
    });
    toCanvasMock.mockResolvedValueOnce(document.createElement('canvas'));

    await captureReactFlowPng(surface);

    const [, options] = toCanvasMock.mock.calls[0] as [HTMLElement, { width: number; height: number }];
    expect(options.width).toBe(740);
    expect(options.height).toBe(500);
  });

  it('passes full logical dimensions with a bounded pixel ratio for oversized graphs', async () => {
    const surface = createSurface();
    const nodes = surface.querySelectorAll<HTMLElement>('.react-flow__node');
    nodes[0].getBoundingClientRect = () => rect(-10_000_000, -10_000_000, 100, 100);
    nodes[1].getBoundingClientRect = () => rect(10_000_000, 10_000_000, 100, 100);
    toCanvasMock.mockResolvedValueOnce(document.createElement('canvas'));

    await captureReactFlowPng(surface);

    const [, options] = toCanvasMock.mock.calls[0] as [HTMLElement, { width: number; height: number; pixelRatio: number }];
    expect(options.width).toBe(20_000_260);
    expect(options.height).toBe(20_000_260);
    expect(options.pixelRatio).toBeGreaterThan(0);
    expect(options.pixelRatio).toBeLessThanOrEqual(window.devicePixelRatio || 1);
    expect(options.width * options.pixelRatio).toBeLessThanOrEqual(8_000);
    expect(options.height * options.pixelRatio).toBeLessThanOrEqual(8_000);
  });

  it('returns null and removes the stage when preparation throws', async () => {
    const surface = createSurface();
    vi.spyOn(window, 'getComputedStyle').mockImplementationOnce(() => {
      throw new Error('style failed');
    });

    await expect(captureReactFlowPng(surface)).resolves.toBeNull();

    expect(document.querySelector('[data-mf-export-stage]')).toBeNull();
    expect(surface.querySelector('.react-flow__background')).not.toBeNull();
  });

  it('removes the stage and returns null when rasterization rejects', async () => {
    toCanvasMock.mockRejectedValueOnce(new Error('rasterization failed'));

    await expect(captureReactFlowPng(createSurface())).resolves.toBeNull();

    expect(document.querySelector('[data-mf-export-stage]')).toBeNull();
  });

  it('removes the stage when capture event dispatch fails', async () => {
    const surface = createSurface();
    vi.spyOn(document, 'dispatchEvent').mockImplementationOnce(() => {
      throw new Error('event failed');
    });

    await expect(captureReactFlowPng(surface)).resolves.toBeNull();

    expect(document.querySelector('[data-mf-export-stage]')).toBeNull();
  });

  it('returns null without calling html-to-image when no valid React Flow surface is mounted', async () => {
    await expect(captureReactFlowPng(null)).resolves.toBeNull();
    await expect(captureReactFlowPng(document.createElement('div'))).resolves.toBeNull();

    expect(toCanvasMock).not.toHaveBeenCalled();
  });
});