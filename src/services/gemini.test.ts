import { describe, expect, it, vi } from 'vitest';
import {
  parseAiJson,
  validateBassEvents,
  validateChordSuggestions,
  validateDrumPattern,
  validateInversions,
} from './gemini';
import { ChordType, DrumInstrument, type ChordDefinition } from '../types';

function chord(root: ChordDefinition['root'], type: ChordType): ChordDefinition {
  return { id: `${root}${type}`, root, type, inversion: 0 };
}

describe('parseAiJson', () => {
  it('parses a valid JSON payload', () => {
    expect(parseAiJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it('reports "no response" distinctly from malformed JSON', () => {
    // undefined is what the SDK returns on a safety block or empty completion.
    expect(() => parseAiJson(undefined)).toThrow(/未回傳任何內容/);
    expect(() => parseAiJson('')).toThrow(/未回傳任何內容/);
    expect(() => parseAiJson('   ')).toThrow(/未回傳任何內容/);
  });

  it('reports malformed JSON separately', () => {
    expect(() => parseAiJson('{not json')).toThrow(/JSON/);
  });
});

describe('validateChordSuggestions', () => {
  it('accepts a well-formed chord list', () => {
    const result = validateChordSuggestions([
      { root: 'C', type: ChordType.Major },
      { root: 'A', type: ChordType.Minor },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ root: 'C', type: ChordType.Major, inversion: 0 });
  });

  it('normalises flat roots to their sharp equivalent', () => {
    const result = validateChordSuggestions([{ root: 'Bb', type: ChordType.Major }]);

    expect(result[0].root).toBe('A#');
  });

  it('assigns a unique id to every chord', () => {
    const result = validateChordSuggestions(
      Array.from({ length: 8 }, () => ({ root: 'C', type: ChordType.Major }))
    );

    // Regression guard: ids were built from Date.now(), so a whole progression
    // generated in one tick collided and broke React list keys.
    expect(new Set(result.map(c => c.id)).size).toBe(8);
  });

  it('rejects a non-array payload', () => {
    expect(() => validateChordSuggestions({ root: 'C' })).toThrow(/陣列/);
    expect(() => validateChordSuggestions(null)).toThrow(/陣列/);
  });

  it('rejects an unknown root note', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => validateChordSuggestions([{ root: 'H', type: ChordType.Major }])).toThrow(
      /根音/
    );
  });

  it('rejects an unknown chord type', () => {
    expect(() => validateChordSuggestions([{ root: 'C', type: 'SuperMajor' }])).toThrow(
      /類型/
    );
  });

  it('rejects non-string roots and types', () => {
    expect(() => validateChordSuggestions([{ root: 5, type: ChordType.Major }])).toThrow();
    expect(() => validateChordSuggestions([{ root: 'C', type: 7 }])).toThrow();
  });

  it('rejects null entries inside the array', () => {
    expect(() => validateChordSuggestions([null])).toThrow(/格式/);
  });
});

describe('validateInversions', () => {
  const progression = [chord('C', ChordType.Major), chord('G', ChordType.Dominant7th)];

  it('passes through in-range inversions', () => {
    expect(validateInversions([1, 2], progression)).toEqual([1, 2]);
  });

  it('rejects a length mismatch', () => {
    expect(() => validateInversions([0], progression)).toThrow(/2/);
  });

  it('rejects a non-array', () => {
    expect(() => validateInversions('nope', progression)).toThrow();
  });

  it('clamps an inversion above the chord tone count', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // A triad allows 0..2; a dominant 7th allows 0..3.
    expect(validateInversions([9, 9], progression)).toEqual([2, 3]);
  });

  it('clamps a negative inversion to zero', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(validateInversions([-4, -1], progression)).toEqual([0, 0]);
  });

  it('rejects non-numeric and non-finite values', () => {
    expect(() => validateInversions(['1', 0], progression)).toThrow(/非數字/);
    expect(() => validateInversions([Number.NaN, 0], progression)).toThrow(/非數字/);
  });
});

describe('validateBassEvents', () => {
  it('accepts well-formed note events', () => {
    const events = validateBassEvents([
      { note: 'C2', time: '0:0:0', duration: '4n' },
      { note: 'G2', time: '0:2:0', duration: '8n' },
    ]);

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ note: 'C2', time: '0:0:0', duration: '4n' });
  });

  it('drops unexpected extra fields', () => {
    const events = validateBassEvents([
      { note: 'C2', time: '0:0:0', duration: '4n', velocity: 0.9 },
    ]);

    expect(events[0]).toEqual({ note: 'C2', time: '0:0:0', duration: '4n' });
  });

  it('rejects a non-array', () => {
    expect(() => validateBassEvents({ note: 'C2' })).toThrow(/陣列/);
  });

  it('rejects events missing any required field', () => {
    expect(() => validateBassEvents([{ note: 'C2', time: '0:0:0' }])).toThrow(/duration/);
    expect(() => validateBassEvents([{ time: '0:0:0', duration: '4n' }])).toThrow(/note/);
  });

  it('rejects null entries', () => {
    expect(() => validateBassEvents([null])).toThrow(/格式/);
  });
});

describe('validateDrumPattern', () => {
  const allowed = [DrumInstrument.Kick, DrumInstrument.Snare];
  const fullBeat = [true, false, false, false];

  it('accepts a 4x4 boolean grid', () => {
    const pattern = validateDrumPattern(
      { [DrumInstrument.Kick]: [fullBeat, fullBeat, fullBeat, fullBeat] },
      allowed
    );

    expect(pattern[DrumInstrument.Kick]).toHaveLength(4);
    expect(pattern[DrumInstrument.Kick]?.[0]).toEqual(fullBeat);
  });

  it('ignores instruments outside the allowed list', () => {
    const pattern = validateDrumPattern(
      {
        [DrumInstrument.Kick]: [fullBeat, fullBeat, fullBeat, fullBeat],
        Cowbell: [fullBeat, fullBeat, fullBeat, fullBeat],
      },
      allowed
    );

    expect(Object.keys(pattern)).toEqual([DrumInstrument.Kick]);
  });

  it('pads a short grid out to four beats', () => {
    // The sequencer indexes [beat][subdivision] unguarded, so a ragged grid from
    // the model would throw mid-playback rather than at parse time.
    const pattern = validateDrumPattern({ [DrumInstrument.Kick]: [fullBeat] }, allowed);

    expect(pattern[DrumInstrument.Kick]).toHaveLength(4);
    expect(pattern[DrumInstrument.Kick]?.[3]).toEqual([false, false, false, false]);
  });

  it('pads a short beat out to four subdivisions', () => {
    const pattern = validateDrumPattern({ [DrumInstrument.Kick]: [[true]] }, allowed);

    expect(pattern[DrumInstrument.Kick]?.[0]).toEqual([true, false, false, false]);
  });

  it('coerces non-boolean cells to false', () => {
    const pattern = validateDrumPattern(
      { [DrumInstrument.Kick]: [[1, 'yes', null, true]] },
      allowed
    );

    expect(pattern[DrumInstrument.Kick]?.[0]).toEqual([false, false, false, true]);
  });

  it('rejects a payload with no usable instrument', () => {
    expect(() => validateDrumPattern({ Cowbell: [fullBeat] }, allowed)).toThrow(/樂器/);
    expect(() => validateDrumPattern({}, allowed)).toThrow(/樂器/);
  });

  it('rejects a non-object payload', () => {
    expect(() => validateDrumPattern(null, allowed)).toThrow(/格式/);
    expect(() => validateDrumPattern('nope', allowed)).toThrow(/格式/);
  });
});
