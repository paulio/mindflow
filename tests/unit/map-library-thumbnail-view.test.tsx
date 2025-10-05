import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, within, cleanup, fireEvent } from '@testing-library/react';
import { MapLibrary } from '../../src/components/pages/MapLibrary';

const useGraphMock = vi.fn();

vi.mock('../../src/state/graph-store', () => ({
  useGraph: () => useGraphMock(),
}));

type ThumbnailStatusInfo = {
  status: 'queued' | 'pending' | 'refreshing' | 'ready' | 'failed';
  retryCount: number;
  pending?: boolean;
  failureReason: string | null;
  updatedAt: string | null;
};

type GraphContextPartial = {
  graphs?: Array<{ id: string; name: string; lastOpened: string }>;
  thumbnailStatuses?: Record<string, ThumbnailStatusInfo>;
  thumbnailRetryLimit?: number;
  selectedLibraryIds?: string[];
  requestThumbnailRefresh?: (id: string, trigger?: string) => Promise<void>;
  addLibrarySelection?: (ids: string[]) => void;
  toggleLibrarySelection?: (id: string) => void;
  selectGraph?: (id: string) => Promise<void>;
};

const DEFAULT_GRAPH = { id: 'map-1', name: 'Sample Map', lastOpened: '2025-01-01T00:00:00.000Z' };

function setMockGraphContext(overrides: GraphContextPartial = {}) {
  const defaultFn = async () => Promise.resolve();
  useGraphMock.mockReturnValue({
    graphs: overrides.graphs ?? [DEFAULT_GRAPH],
    newGraph: vi.fn(defaultFn),
  selectGraph: overrides.selectGraph ?? vi.fn(defaultFn),
    selectedLibraryIds: overrides.selectedLibraryIds ?? [],
    addLibrarySelection: overrides.addLibrarySelection ?? vi.fn(),
    toggleLibrarySelection: overrides.toggleLibrarySelection ?? vi.fn(),
    replaceLibrarySelection: vi.fn(),
    clearLibrarySelection: vi.fn(),
    exportMaps: vi.fn(defaultFn),
    stageImport: vi.fn(defaultFn),
    importContext: null,
    resolveImportConflict: vi.fn(),
    finalizeImportSession: vi.fn(defaultFn),
    clearImportSession: vi.fn(),
    thumbnailStatuses: overrides.thumbnailStatuses ?? {},
    requestThumbnailRefresh: overrides.requestThumbnailRefresh ?? vi.fn(defaultFn),
    thumbnailRetryLimit: overrides.thumbnailRetryLimit ?? 1,
  });
}

describe('MapLibrary thumbnail view', () => {
  beforeEach(() => {
    useGraphMock.mockReset();
    setMockGraphContext();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders placeholder alt text when thumbnail is missing', () => {
    setMockGraphContext({ thumbnailStatuses: {} });

    render(<MapLibrary />);

    const checkbox = screen.getByRole('checkbox', { name: 'Select Sample Map' });
    const card = checkbox.closest('li');
    expect(card).toBeTruthy();
    const placeholder = within(card as HTMLElement).getByRole('img', { name: 'Thumbnail unavailable' });
    expect(placeholder).toBeDefined();
  });

  it('renders status badge when queued', () => {
    setMockGraphContext({
      thumbnailStatuses: {
        'map-1': {
          status: 'queued',
          retryCount: 0,
          failureReason: null,
          pending: false,
          updatedAt: null,
        },
      },
    });

    render(<MapLibrary />);

    const checkbox = screen.getByRole('checkbox', { name: 'Select Sample Map' });
    const card = checkbox.closest('li') as HTMLElement;
    expect(within(card).getByText('Queued')).toBeDefined();
  });

  it('renders retry button with tooltip when failed', () => {
    const refreshMock = vi.fn(async () => {});
    setMockGraphContext({
      thumbnailRetryLimit: 2,
      requestThumbnailRefresh: refreshMock,
      thumbnailStatuses: {
        'map-1': {
          status: 'failed',
          retryCount: 1,
          failureReason: 'Timed out',
          pending: false,
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      },
    });

    render(<MapLibrary />);

    const retryButton = screen.getByRole('button', { name: 'Retry' });
    expect(retryButton).toBeDefined();
    expect(retryButton.getAttribute('title')).toBe('Retry thumbnail refresh');
    expect((retryButton as HTMLButtonElement).disabled).toBe(false);
  });

  it('opens the map when the thumbnail is clicked', () => {
    const selectGraph = vi.fn(async () => {});
    setMockGraphContext({ selectGraph, selectedLibraryIds: [] });

    render(<MapLibrary />);

    const thumbnailTrigger = screen.getByRole('button', { name: 'Open Sample Map' });
    fireEvent.click(thumbnailTrigger);

    expect(selectGraph).toHaveBeenCalledWith('map-1');
  });

  it('opens the map when Enter is pressed on the thumbnail', () => {
    const selectGraph = vi.fn(async () => {});
    setMockGraphContext({ selectGraph, selectedLibraryIds: [] });

    render(<MapLibrary />);

    const thumbnailTrigger = screen.getByRole('button', { name: 'Open Sample Map' });
    thumbnailTrigger.focus();
    fireEvent.keyDown(thumbnailTrigger, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(selectGraph).toHaveBeenCalledWith('map-1');
  });
});
