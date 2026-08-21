import { describe, it, expect } from 'vitest';
import { toSlug } from './slug';

describe('toSlug', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(toSlug('Your Loves Not Wasted')).toBe('your-loves-not-wasted');
  });

  it('handles apostrophes', () => {
    expect(toSlug("Your Love's Not Wasted")).toBe('your-love-s-not-wasted');
  });

  it('strips special characters', () => {
    expect(toSlug('Hello! World? (feat. Someone)')).toBe('hello-world-feat-someone');
  });

  it('collapses multiple hyphens', () => {
    expect(toSlug('Song  --  Title')).toBe('song-title');
  });

  it('trims leading and trailing hyphens', () => {
    expect(toSlug(' - Song Title - ')).toBe('song-title');
  });

  it('handles empty string', () => {
    expect(toSlug('')).toBe('');
  });
});
