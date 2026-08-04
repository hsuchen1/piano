import { describe, expect, it, vi } from 'vitest';
import {
  getBassNotesForPattern,
  getChordNotes,
  getVoicingOptionsForChord,
  isChordType,
  normalizeNoteName,
} from './audioUtils';
import { BassPattern, ChordType, type ChordDefinition } from '../types';

/** Small helper so each test reads as musical intent rather than object literals. */
function chord(
  root: ChordDefinition['root'],
  type: ChordType,
  inversion = 0
): ChordDefinition {
  return { id: `${root}${type}${inversion}`, root, type, inversion };
}

describe('getChordNotes', () => {
  it('builds a root-position major triad', () => {
    expect(getChordNotes(chord('C', ChordType.Major), 4, 0)).toEqual(['C4', 'E4', 'G4']);
  });

  it('builds a root-position minor triad', () => {
    expect(getChordNotes(chord('A', ChordType.Minor), 3, 0)).toEqual(['A3', 'C4', 'E4']);
  });

  it('builds a dominant seventh', () => {
    expect(getChordNotes(chord('G', ChordType.Dominant7th), 3, 0)).toEqual([
      'G3',
      'B3',
      'D4',
      'F4',
    ]);
  });

  it('respects enharmonic sharp roots', () => {
    expect(getChordNotes(chord('F#', ChordType.Major), 4, 0)).toEqual(['F#4', 'A#4', 'C#5']);
  });

  describe('inversions', () => {
    it('moves the root up an octave for the first inversion', () => {
      expect(getChordNotes(chord('C', ChordType.Major, 1), 4, 0)).toEqual([
        'E4',
        'G4',
        'C5',
      ]);
    });

    it('moves the two lowest notes up for the second inversion', () => {
      expect(getChordNotes(chord('C', ChordType.Major, 2), 4, 0)).toEqual([
        'G4',
        'C5',
        'E5',
      ]);
    });

    it('cycles the inversion modulo the note count', () => {
      // A triad has 3 notes, so inversion 3 wraps to root position in the same
      // octave rather than stacking another octave on top. The UI never asks for
      // this (voicing options stop at noteCount - 1) but AI responses are clamped
      // rather than rejected, so the wrap-around needs to stay well defined.
      expect(getChordNotes(chord('C', ChordType.Major, 3), 4, 0)).toEqual(
        getChordNotes(chord('C', ChordType.Major, 0), 4, 0)
      );
    });

    it('inverts a four-note seventh chord', () => {
      expect(getChordNotes(chord('C', ChordType.Major7th, 1), 4, 0)).toEqual([
        'E4',
        'G4',
        'B4',
        'C5',
      ]);
    });
  });

  describe('transposition', () => {
    it('shifts every note up by the given semitones', () => {
      expect(getChordNotes(chord('C', ChordType.Major), 4, 2)).toEqual(['D4', 'F#4', 'A4']);
    });

    it('shifts down for negative semitones', () => {
      expect(getChordNotes(chord('C', ChordType.Major), 4, -1)).toEqual(['B3', 'D#4', 'F#4']);
    });

    it('a full octave of transposition lands on the same note names', () => {
      expect(getChordNotes(chord('C', ChordType.Major), 4, 12)).toEqual(['C5', 'E5', 'G5']);
    });
  });

  it('honours the requested octave', () => {
    expect(getChordNotes(chord('C', ChordType.Major), 2, 0)).toEqual(['C2', 'E2', 'G2']);
  });

  it('handles a two-note power chord', () => {
    expect(getChordNotes(chord('E', ChordType.PowerChord), 3, 0)).toEqual(['E3', 'B3']);
  });

  it('handles a five-note ninth chord', () => {
    expect(getChordNotes(chord('C', ChordType.Major9), 3, 0)).toHaveLength(5);
  });
});

describe('getVoicingOptionsForChord', () => {
  it('returns one option per chord tone for a triad', () => {
    const options = getVoicingOptionsForChord(chord('C', ChordType.Major), 3);

    expect(options).toHaveLength(3);
    expect(options.map(o => o.inversion)).toEqual([0, 1, 2]);
  });

  it('returns four options for a seventh chord', () => {
    const options = getVoicingOptionsForChord(chord('C', ChordType.Dominant7th), 3);

    expect(options).toHaveLength(4);
  });

  it('each option carries the notes for that inversion', () => {
    const options = getVoicingOptionsForChord(chord('C', ChordType.Major), 4);

    expect(options[0].notes).toEqual(['C4', 'E4', 'G4']);
    expect(options[1].notes).toEqual(['E4', 'G4', 'C5']);
  });

  it('ignores any inversion already set on the input chord', () => {
    const fromRoot = getVoicingOptionsForChord(chord('C', ChordType.Major, 0), 4);
    const fromSecond = getVoicingOptionsForChord(chord('C', ChordType.Major, 2), 4);

    expect(fromSecond).toEqual(fromRoot);
  });
});

describe('normalizeNoteName', () => {
  it('passes natural notes through', () => {
    expect(normalizeNoteName('C')).toBe('C');
    expect(normalizeNoteName('G')).toBe('G');
  });

  it('passes sharps through', () => {
    expect(normalizeNoteName('C#')).toBe('C#');
  });

  it('converts flats to the sharp equivalent', () => {
    expect(normalizeNoteName('Db')).toBe('C#');
    expect(normalizeNoteName('Eb')).toBe('D#');
    expect(normalizeNoteName('Bb')).toBe('A#');
  });

  it('tolerates surrounding whitespace and lower case', () => {
    expect(normalizeNoteName('  c  ')).toBe('C');
    expect(normalizeNoteName('bb')).toBe('A#');
  });

  it('returns null for anything unrecognised', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(normalizeNoteName('H')).toBeNull();
    expect(normalizeNoteName('')).toBeNull();
    expect(normalizeNoteName('C##')).toBeNull();
  });
});

describe('isChordType', () => {
  it('accepts every value in the ChordType enum', () => {
    for (const value of Object.values(ChordType)) {
      expect(isChordType(value)).toBe(true);
    }
  });

  it('rejects strings that are not chord types', () => {
    expect(isChordType('Major')).toBe(false); // the enum value is 'Maj'
    expect(isChordType('')).toBe(false);
    expect(isChordType('nonsense')).toBe(false);
  });
});

describe('getBassNotesForPattern', () => {
  it('produces nothing when the pattern is Off', () => {
    expect(getBassNotesForPattern(chord('C', ChordType.Major), BassPattern.Off, 2, 0)).toEqual(
      []
    );
  });

  it('plays a single sustained root for RootNotes', () => {
    const events = getBassNotesForPattern(
      chord('C', ChordType.Major),
      BassPattern.RootNotes,
      2,
      0
    );

    expect(events).toEqual([{ note: 'C2', timeOffset: '0:0:0', duration: '1m' }]);
  });

  it('follows the inversion, so the bass tracks the lowest chord tone', () => {
    const events = getBassNotesForPattern(
      chord('C', ChordType.Major, 1),
      BassPattern.RootNotes,
      2,
      0
    );

    // First inversion puts E at the bottom.
    expect(events[0].note).toBe('E2');
  });

  it('applies transposition', () => {
    const events = getBassNotesForPattern(
      chord('C', ChordType.Major),
      BassPattern.RootNotes,
      2,
      2
    );

    expect(events[0].note).toBe('D2');
  });

  it('emits more than one event for RootAndFifth', () => {
    const events = getBassNotesForPattern(
      chord('C', ChordType.Major),
      BassPattern.RootAndFifth,
      2,
      0
    );

    expect(events.length).toBeGreaterThan(1);
    expect(events[0].note).toBe('C2');
  });

  it('every event carries a note, an offset and a duration', () => {
    for (const pattern of Object.values(BassPattern)) {
      const events = getBassNotesForPattern(chord('C', ChordType.Major), pattern, 2, 0);

      for (const event of events) {
        expect(event.note).toBeTruthy();
        expect(event.timeOffset).toMatch(/^\d+:\d+(:\d+)?$/);
        expect(event.duration).toBeTruthy();
      }
    }
  });
});
