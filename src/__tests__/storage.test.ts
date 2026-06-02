import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadJSON, saveJSON } from '../utils/storage';

const store: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
  });
});

describe('loadJSON', () => {
  it('returns fallback when key is missing', () => {
    expect(loadJSON('missing', [])).toEqual([]);
  });

  it('parses stored JSON', () => {
    store['test'] = JSON.stringify({ a: 1 });
    expect(loadJSON('test', {})).toEqual({ a: 1 });
  });

  it('returns fallback on corrupt JSON', () => {
    store['bad'] = 'not json{{{';
    expect(loadJSON('bad', 'default')).toBe('default');
  });
});

describe('saveJSON', () => {
  it('stores JSON string', () => {
    saveJSON('key', [1, 2, 3]);
    expect(store['key']).toBe('[1,2,3]');
  });
});
