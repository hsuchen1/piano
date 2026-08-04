import type { PianoKeyData } from '../types';

export interface PositionedBlackKey {
  key: PianoKeyData;
  /**
   * How many white keys precede this black key in the visible range. The keyboard
   * turns this into a percentage offset, so the key stays on the seam between its
   * neighbours at any container width.
   */
  whiteBefore: number;
}

export interface KeyboardLayout {
  whiteKeys: PianoKeyData[];
  blackKeys: PositionedBlackKey[];
}

/**
 * Splits a chromatic key list into the white keys that lay out the row and the
 * black keys that sit on top of it.
 *
 * Extracted from the component because this is the layout maths most likely to be
 * subtly wrong: an off-by-one in `whiteBefore` shifts every sharp onto the wrong
 * seam, which is glaringly visible but easy to introduce.
 */
export function buildKeyboardLayout(
  allKeys: PianoKeyData[],
  startOctave: number,
  octaveCount: number
): KeyboardLayout {
  const whiteKeys: PianoKeyData[] = [];
  const blackKeys: PositionedBlackKey[] = [];

  for (const key of allKeys) {
    if (key.octave < startOctave || key.octave >= startOctave + octaveCount) continue;

    if (key.isBlack) blackKeys.push({ key, whiteBefore: whiteKeys.length });
    else whiteKeys.push(key);
  }

  return { whiteKeys, blackKeys };
}

/** Percentage offset for a black key's centre, relative to the row width. */
export function blackKeyOffsetPercent(whiteBefore: number, totalWhiteKeys: number): number {
  if (totalWhiteKeys === 0) return 0;
  return (whiteBefore / totalWhiteKeys) * 100;
}
