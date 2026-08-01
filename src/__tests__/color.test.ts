import { describe, it, expect } from 'vitest';
import { alphaSuffix, shadeHex } from '../utils/color';

describe('shadeHex', () => {
  it('dunkelt gleichmaessig ab', () => {
    expect(shadeHex('#808080', 0.5)).toBe('#404040');
  });

  it('laesst factor 1 unveraendert', () => {
    expect(shadeHex('#3b82f6', 1)).toBe('#3b82f6');
  });

  it('kappt bei Weiss statt ueberzulaufen', () => {
    expect(shadeHex('#c0c0c0', 4)).toBe('#ffffff');
  });

  it('versteht die Kurzform', () => {
    expect(shadeHex('#fff', 0.5)).toBe('#808080');
  });

  it('laesst unbekannte Farbformate in Ruhe', () => {
    expect(shadeHex('rgba(1,2,3,0.5)', 0.5)).toBe('rgba(1,2,3,0.5)');
    expect(shadeHex('cornflowerblue', 0.5)).toBe('cornflowerblue');
  });

  it('faengt kaputte Faktoren ab', () => {
    expect(shadeHex('#3b82f6', NaN)).toBe('#3b82f6');
    expect(shadeHex('#3b82f6', -2)).toBe('#000000');
  });
});

describe('alphaSuffix', () => {
  it('bildet 0..1 auf zwei Hex-Stellen ab', () => {
    expect(alphaSuffix(0)).toBe('00');
    expect(alphaSuffix(1)).toBe('ff');
    expect(alphaSuffix(0.4)).toBe('66');
  });

  it('bleibt zweistellig', () => {
    expect(alphaSuffix(0.01)).toHaveLength(2);
  });

  it('klemmt Werte ausserhalb 0..1', () => {
    expect(alphaSuffix(-1)).toBe('00');
    expect(alphaSuffix(5)).toBe('ff');
    expect(alphaSuffix(NaN)).toBe('ff');
  });
});
