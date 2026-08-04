import { describe, expect, it } from 'vitest';
import { blackKeyOffsetPercent, buildKeyboardLayout } from './keyboardLayout';
import { ALL_PIANO_KEYS, NUM_OCTAVES, START_OCTAVE } from '../constants';

describe('buildKeyboardLayout', () => {
  it('splits a single octave into 7 white and 5 black keys', () => {
    const { whiteKeys, blackKeys } = buildKeyboardLayout(ALL_PIANO_KEYS, START_OCTAVE, 1);

    expect(whiteKeys).toHaveLength(7);
    expect(blackKeys).toHaveLength(5);
  });

  it('returns the full 4-octave keyboard when asked for every octave', () => {
    const { whiteKeys, blackKeys } = buildKeyboardLayout(
      ALL_PIANO_KEYS,
      START_OCTAVE,
      NUM_OCTAVES
    );

    expect(whiteKeys).toHaveLength(7 * NUM_OCTAVES);
    expect(blackKeys).toHaveLength(5 * NUM_OCTAVES);
  });

  it('only includes octaves inside the window', () => {
    const { whiteKeys } = buildKeyboardLayout(ALL_PIANO_KEYS, START_OCTAVE + 1, 2);

    const octaves = [...new Set(whiteKeys.map(k => k.octave))];
    expect(octaves).toEqual([START_OCTAVE + 1, START_OCTAVE + 2]);
  });

  it('starts each octave on C and ends on B', () => {
    const { whiteKeys } = buildKeyboardLayout(ALL_PIANO_KEYS, START_OCTAVE, 1);

    expect(whiteKeys[0].note).toBe('C');
    expect(whiteKeys.at(-1)?.note).toBe('B');
  });

  it('places the sharps on the correct seams within an octave', () => {
    const { blackKeys } = buildKeyboardLayout(ALL_PIANO_KEYS, START_OCTAVE, 1);

    // White keys are C D E F G A B. C# sits after 1 white key, D# after 2,
    // then the gap at E/F, so F# after 4, G# after 5, A# after 6.
    expect(blackKeys.map(b => `${b.key.note}:${b.whiteBefore}`)).toEqual([
      'C#:1',
      'D#:2',
      'F#:4',
      'G#:5',
      'A#:6',
    ]);
  });

  it('leaves no black key between E and F, or between B and the next C', () => {
    const { blackKeys } = buildKeyboardLayout(ALL_PIANO_KEYS, START_OCTAVE, 2);

    // 3 and 7 are the E|F and B|C seams; a sharp there would be wrong.
    const seams = blackKeys.map(b => b.whiteBefore);
    expect(seams).not.toContain(3);
    expect(seams).not.toContain(7);
  });

  it('keeps offsets increasing across an octave boundary', () => {
    const { blackKeys } = buildKeyboardLayout(ALL_PIANO_KEYS, START_OCTAVE, 2);

    const seams = blackKeys.map(b => b.whiteBefore);
    const sorted = [...seams].sort((a, b) => a - b);
    expect(seams).toEqual(sorted);
    expect(blackKeys).toHaveLength(10);
  });

  it('returns nothing for a window outside the available range', () => {
    const { whiteKeys, blackKeys } = buildKeyboardLayout(ALL_PIANO_KEYS, START_OCTAVE + 99, 2);

    expect(whiteKeys).toHaveLength(0);
    expect(blackKeys).toHaveLength(0);
  });
});

describe('blackKeyOffsetPercent', () => {
  it('converts a seam index into a percentage of the row', () => {
    // C# in a 7-white-key octave sits one seventh along.
    expect(blackKeyOffsetPercent(1, 7)).toBeCloseTo(14.2857, 3);
    expect(blackKeyOffsetPercent(6, 7)).toBeCloseTo(85.7143, 3);
  });

  it('never reaches the far edge, so a key cannot overflow the row', () => {
    const { whiteKeys, blackKeys } = buildKeyboardLayout(ALL_PIANO_KEYS, START_OCTAVE, 2);

    for (const { whiteBefore } of blackKeys) {
      const offset = blackKeyOffsetPercent(whiteBefore, whiteKeys.length);
      expect(offset).toBeGreaterThan(0);
      expect(offset).toBeLessThan(100);
    }
  });

  it('guards against an empty row rather than dividing by zero', () => {
    expect(blackKeyOffsetPercent(0, 0)).toBe(0);
  });
});
