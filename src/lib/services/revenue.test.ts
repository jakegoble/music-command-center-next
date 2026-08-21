import { describe, it, expect } from 'vitest';
import { estimateRevenue, parseJakeOwnership, parseWriterSplits, BLENDED_RATE, PLATFORM_RATES, PLATFORM_DISTRIBUTION } from './revenue';

describe('estimateRevenue', () => {
  it('returns 0 for 0 streams', () => {
    expect(estimateRevenue(0)).toBe(0);
  });

  it('calculates revenue using blended rate at 100% ownership', () => {
    const result = estimateRevenue(1_000_000);
    expect(result).toBeCloseTo(1_000_000 * BLENDED_RATE, 1);
  });

  it('scales by ownership percentage', () => {
    const full = estimateRevenue(100_000);
    const half = estimateRevenue(100_000, 0.5);
    expect(half).toBeCloseTo(full / 2, 1);
  });

  it('defaults to 100% ownership when not specified', () => {
    const explicit = estimateRevenue(50_000, 1.0);
    const implicit = estimateRevenue(50_000);
    expect(implicit).toBe(explicit);
  });
});

describe('parseJakeOwnership', () => {
  it('returns 100 when input is null', () => {
    expect(parseJakeOwnership(null)).toBe(100);
  });

  it('parses simple pipe-delimited: Jake 50% | Allen 50%', () => {
    expect(parseJakeOwnership('Jake 50% | Allen 50%')).toBe(50);
  });

  it('parses Jake 96% | Nick 4%', () => {
    expect(parseJakeOwnership('Jake 96% | Nick 4%')).toBe(96);
  });

  it('parses Jake 75% | Trevor 25%', () => {
    expect(parseJakeOwnership('Jake 75% | Trevor 25%')).toBe(75);
  });

  it('parses Jake 66% | Trevor 34%', () => {
    expect(parseJakeOwnership('Jake 66% | Trevor 34%')).toBe(66);
  });

  it('parses decimal: Jake 33.33% | Steven 33.33% | Rebecca 33.33%', () => {
    expect(parseJakeOwnership('Jake 33.33% | Steven 33.33% | Rebecca 33.33%')).toBe(33.33);
  });

  it('parses Jake 47.5% | niko+ 25% | Amy West 25% | Andrew 0.5%', () => {
    expect(parseJakeOwnership('Jake 47.5% | niko+ (Nicholas V Monjarez) 25% | Amy West 25% | Andrew Heringer 0.5%')).toBe(47.5);
  });

  it('parses Jake 25% with multiple co-writers', () => {
    expect(parseJakeOwnership('Jake 25% | Steven Colyer 25% | William P Delia 25% | Daniel Schnair 25%')).toBe(25);
  });

  it('parses Jake 100% (solo write) with trailing text', () => {
    expect(parseJakeOwnership('Jake 100% (solo write) — ASCAP Work ID 917318972')).toBe(100);
  });

  it('parses "50/50 - Jake Goble 25% writer + 25% pub / Carlo..."', () => {
    expect(parseJakeOwnership('50/50 - Jake Goble 25% writer + 25% pub / Carlo Servodio (Jako Diaz) 25% writer + no pub')).toBe(50);
  });

  it('parses "Publishing: 50/50 — Jake Goble ... / Dmitry ..."', () => {
    expect(parseJakeOwnership('Publishing: 50/50 — Jake Goble (Norcal Electric) / Dmitry Kuzmin (Nuage). Master')).toBe(50);
  });

  it('parses "33.33% each — Jake Goble / ..."', () => {
    expect(parseJakeOwnership('33.33% each — Jake Goble / Norcal Electric (IPI 372953043/393034563) | Mohamed A')).toBe(33.33);
  });

  it('parses "50% royalty from GLITTER COWBOY..."', () => {
    expect(parseJakeOwnership('50% royalty from GLITTER COWBOY / Proton LLC. Exclusive — master + composition r')).toBe(50);
  });

  it('parses "Publishing retained by artists. Master royalty: 40%..."', () => {
    expect(parseJakeOwnership('Publishing retained by artists. Master royalty: 40% net income online to artists')).toBe(40);
  });

  it('parses "Jake 100% writer / matty co. 50% writer"', () => {
    // Jake has 100% of his writer share
    expect(parseJakeOwnership('Jake 100% writer / matty co. 50% writer (BMI registration shares)')).toBe(100);
  });

  it('defaults to 100 for unrecognized format', () => {
    expect(parseJakeOwnership('Jake + matty co. (BMI registration — same structure as Hurricane)')).toBe(100);
  });
});

describe('parseWriterSplits (legacy)', () => {
  it('returns Jake Goble 100% when input is null', () => {
    const splits = parseWriterSplits(null);
    expect(splits).toEqual([{ name: 'Jake Goble', percentage: 100 }]);
  });

  it('parses pipe-delimited splits', () => {
    const splits = parseWriterSplits('Jake 50% | Allen 50%');
    expect(splits).toEqual([
      { name: 'Jake', percentage: 50 },
      { name: 'Allen', percentage: 50 },
    ]);
  });
});

describe('constants', () => {
  it('platform distribution sums to 1.0', () => {
    const sum = Object.values(PLATFORM_DISTRIBUTION).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('all platforms have rates defined', () => {
    for (const platform of Object.keys(PLATFORM_DISTRIBUTION)) {
      expect(PLATFORM_RATES[platform]).toBeDefined();
      expect(PLATFORM_RATES[platform]).toBeGreaterThan(0);
    }
  });

  it('blended rate is reasonable (between $0.002 and $0.01)', () => {
    expect(BLENDED_RATE).toBeGreaterThan(0.002);
    expect(BLENDED_RATE).toBeLessThan(0.01);
  });
});
