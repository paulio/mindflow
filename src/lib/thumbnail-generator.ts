import type { PersistenceSnapshot } from './types';
import { exportGraphAsPng } from './export';
import { THUMBNAIL_HEIGHT, THUMBNAIL_WIDTH } from './thumbnails';

function getNow(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

async function blobToImageBitmap(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      return bitmap;
    } catch {
      // fall through to HTMLImageElement fallback
    }
  }

  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    img.src = url;
  });
}

function drawToThumbnailCanvas(source: ImageBitmap | HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = THUMBNAIL_WIDTH;
  canvas.height = THUMBNAIL_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to acquire 2D context for thumbnail canvas');
  }

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

  const sourceWidth = 'width' in source ? source.width : (source as any).width;
  const sourceHeight = 'height' in source ? source.height : (source as any).height;
  const scale = Math.min(THUMBNAIL_WIDTH / sourceWidth, THUMBNAIL_HEIGHT / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const dx = (THUMBNAIL_WIDTH - drawWidth) / 2;
  const dy = (THUMBNAIL_HEIGHT - drawHeight) / 2;

  ctx.drawImage(source as CanvasImageSource, 0, 0, sourceWidth, sourceHeight, dx, dy, drawWidth, drawHeight);

  return canvas;
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return await new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to convert thumbnail canvas to blob'));
    }, 'image/png');
  });
}

export interface ThumbnailGenerationResult {
  blob: Blob;
  durationMs: number;
  sourceExportAt: string;
}

export async function generateThumbnailFromSnapshot(snapshot: PersistenceSnapshot): Promise<ThumbnailGenerationResult> {
  const start = getNow();
  const rawBlob = await exportGraphAsPng(snapshot.graph, snapshot.nodes, snapshot.edges);
  if (!rawBlob) {
    throw new Error('Unable to export graph as PNG');
  }

  if (typeof document === 'undefined') {
    throw new Error('Thumbnail generation requires a DOM environment');
  }

  const image = await blobToImageBitmap(rawBlob);
  const canvas = drawToThumbnailCanvas(image);
  if ('close' in image && typeof (image as ImageBitmap).close === 'function') {
    (image as ImageBitmap).close();
  }

  const blob = await canvasToBlob(canvas);
  const durationMs = getNow() - start;

  return {
    blob,
    durationMs,
    sourceExportAt: new Date().toISOString(),
  };
}
