import { describe, it, expect } from 'vitest';
import { BORDER_COLOUR_PALETTE } from '../../src/lib/node-border-palette';

describe('BORDER_COLOUR_PALETTE constant', () => {
  it('matches spec-defined sequence', () => {
    expect(BORDER_COLOUR_PALETTE).toEqual([
      '#0e4ee6ff',
      '#225a0cff',
      '#c2961fff',
      '#556070',
      '#6b7687',
      '#8892a0',
      '#b48ead',
      '#a3be8c',
      '#d08770',
      '#bf616a',
      '#99c7ffff'
    ]);
  });
});
