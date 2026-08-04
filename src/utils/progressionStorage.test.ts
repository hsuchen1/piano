// @vitest-environment jsdom
// This suite needs a real localStorage, so it opts into jsdom.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadSavedProgressions,
  migrateEntry,
  persistSavedProgressions,
} from './progressionStorage';
import {
  AccompanimentInstrument,
  AccompanimentRhythmPattern,
  BassInstrument,
  BassPattern,
  ChordType,
  DrumPattern,
  SAVED_PROGRESSION_SCHEMA_VERSION,
  UserPianoInstrument,
  type SavedProgressionEntry,
} from '../types';
import {
  DEFAULT_BPM,
  DEFAULT_DELAY_LEVEL,
  DEFAULT_REVERB_LEVEL,
  DEFAULT_SWING,
  DEFAULT_TRANSPOSE_SEMITONES,
  DEFAULT_USER_PIANO_VOLUME,
  SAVED_PROGRESSIONS_LOCAL_STORAGE_KEY,
} from '../constants';

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('migrateEntry', () => {
  it('rejects entries with no progression array', () => {
    expect(migrateEntry(null)).toBeNull();
    expect(migrateEntry({})).toBeNull();
    expect(migrateEntry({ progression: 'not-an-array' })).toBeNull();
  });

  it('defaults a missing chord inversion to root position', () => {
    const result = migrateEntry({
      progression: [{ id: 'a', root: 'C', type: ChordType.Major }],
      accompanimentLayers: [],
    });

    expect(result?.progression[0].inversion).toBe(0);
  });

  it('preserves an explicit inversion', () => {
    const result = migrateEntry({
      progression: [{ id: 'a', root: 'C', type: ChordType.Major, inversion: 2 }],
      accompanimentLayers: [],
    });

    expect(result?.progression[0].inversion).toBe(2);
  });

  it('folds the legacy instrument/volume/rhythmPattern triple into one layer', () => {
    const result = migrateEntry({
      progression: [{ id: 'a', root: 'C', type: ChordType.Major }],
      instrument: AccompanimentInstrument.SynthPiano,
      volume: -7,
      rhythmPattern: AccompanimentRhythmPattern.PerBeat,
    });

    expect(result?.accompanimentLayers).toHaveLength(1);
    expect(result?.accompanimentLayers[0]).toMatchObject({
      instrument: AccompanimentInstrument.SynthPiano,
      volume: -7,
      rhythmPattern: AccompanimentRhythmPattern.PerBeat,
    });
    expect(result?.accompanimentLayers[0].id).toMatch(/^layer-/);
  });

  it('maps the legacy shared customRhythm onto layers using the Custom pattern', () => {
    const legacyGrid = [['4n', '4n', '4n', '4n']];

    const result = migrateEntry({
      progression: [{ id: 'a', root: 'C', type: ChordType.Major }],
      accompanimentLayers: [
        { id: 'custom-layer', instrument: AccompanimentInstrument.Synth, volume: -10, rhythmPattern: AccompanimentRhythmPattern.Custom },
        { id: 'plain-layer', instrument: AccompanimentInstrument.Synth, volume: -10, rhythmPattern: AccompanimentRhythmPattern.PerBeat },
      ],
      customRhythm: legacyGrid,
    });

    expect(result?.customRhythms).toEqual({ 'custom-layer': legacyGrid });
    expect(result?.customRhythms?.['plain-layer']).toBeUndefined();
  });

  it('prefers the modern customRhythms over the legacy field', () => {
    const modern = { 'layer-1': [['8n', '8n', '8n', '8n']] };

    const result = migrateEntry({
      progression: [{ id: 'a', root: 'C', type: ChordType.Major }],
      accompanimentLayers: [],
      customRhythms: modern,
      customRhythm: [['1n', '1n', '1n', '1n']],
    });

    expect(result?.customRhythms).toEqual(modern);
  });

  it('falls back to app defaults for v1 entries missing mix and groove settings', () => {
    const result = migrateEntry({
      progression: [{ id: 'a', root: 'C', type: ChordType.Major }],
      accompanimentLayers: [],
    });

    expect(result).toMatchObject({
      version: SAVED_PROGRESSION_SCHEMA_VERSION,
      bpm: DEFAULT_BPM,
      transposition: DEFAULT_TRANSPOSE_SEMITONES,
      userPianoVolume: DEFAULT_USER_PIANO_VOLUME,
      reverbLevel: DEFAULT_REVERB_LEVEL,
      delayLevel: DEFAULT_DELAY_LEVEL,
      swing: DEFAULT_SWING,
    });
  });

  it('round-trips v2 mix and groove settings', () => {
    const result = migrateEntry({
      progression: [{ id: 'a', root: 'C', type: ChordType.Major }],
      accompanimentLayers: [],
      version: 2,
      bpm: 92,
      transposition: -3,
      userPianoVolume: 6,
      userPianoInstrument: UserPianoInstrument.ElectricPiano,
      reverbLevel: 0.65,
      delayLevel: 0.4,
      swing: 0.5,
    });

    expect(result).toMatchObject({
      bpm: 92,
      transposition: -3,
      userPianoVolume: 6,
      userPianoInstrument: UserPianoInstrument.ElectricPiano,
      reverbLevel: 0.65,
      delayLevel: 0.4,
      swing: 0.5,
    });
  });

  it('rejects enum values that are not part of the enum', () => {
    const result = migrateEntry({
      progression: [{ id: 'a', root: 'C', type: ChordType.Major }],
      accompanimentLayers: [],
      drumPattern: 'TotallyMadeUp',
      bassPattern: 'AlsoFake',
      bassInstrument: 'NopeBass',
      userPianoInstrument: 'GhostPiano',
    });

    expect(result?.drumPattern).toBe(DrumPattern.Off);
    expect(result?.bassPattern).toBe(BassPattern.Off);
    expect(result?.bassInstrument).toBe(BassInstrument.ElectricBass);
    expect(result?.userPianoInstrument).toBe(UserPianoInstrument.ClassicGrand);
  });

  it('ignores non-finite numbers such as NaN', () => {
    const result = migrateEntry({
      progression: [{ id: 'a', root: 'C', type: ChordType.Major }],
      accompanimentLayers: [],
      bpm: Number.NaN,
    });

    expect(result?.bpm).toBe(DEFAULT_BPM);
  });

  it('synthesises one drum pattern per chord when customDrumData is absent', () => {
    const result = migrateEntry({
      progression: [
        { id: 'a', root: 'C', type: ChordType.Major },
        { id: 'b', root: 'G', type: ChordType.Major },
        { id: 'c', root: 'A', type: ChordType.Minor },
      ],
      accompanimentLayers: [],
    });

    expect(result?.customDrumData).toHaveLength(3);
  });
});

describe('loadSavedProgressions', () => {
  it('returns an empty object when nothing is stored', () => {
    expect(loadSavedProgressions()).toEqual({});
  });

  it('returns an empty object when the stored value is not valid JSON', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.localStorage.setItem(SAVED_PROGRESSIONS_LOCAL_STORAGE_KEY, '{not json');

    expect(loadSavedProgressions()).toEqual({});
  });

  it('skips a single unreadable entry without discarding the good ones', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.localStorage.setItem(
      SAVED_PROGRESSIONS_LOCAL_STORAGE_KEY,
      JSON.stringify({
        broken: { nothing: true },
        good: {
          progression: [{ id: 'a', root: 'C', type: ChordType.Major }],
          accompanimentLayers: [],
        },
      })
    );

    const loaded = loadSavedProgressions();

    expect(Object.keys(loaded)).toEqual(['good']);
  });
});

describe('persistSavedProgressions', () => {
  it('strips legacy fields so they are not written back', () => {
    const entry = {
      progression: [{ id: 'a', root: 'C', type: ChordType.Major, inversion: 0 }],
      accompanimentLayers: [],
      customRhythm: [['4n', '4n', '4n', '4n']],
      instrument: AccompanimentInstrument.SynthPiano,
      volume: -7,
      rhythmPattern: AccompanimentRhythmPattern.PerBeat,
    } as unknown as SavedProgressionEntry;

    persistSavedProgressions({ mine: entry });

    const written = JSON.parse(
      window.localStorage.getItem(SAVED_PROGRESSIONS_LOCAL_STORAGE_KEY) ?? '{}'
    );

    expect(written.mine).not.toHaveProperty('customRhythm');
    expect(written.mine).not.toHaveProperty('instrument');
    expect(written.mine).not.toHaveProperty('volume');
    expect(written.mine).not.toHaveProperty('rhythmPattern');
    expect(written.mine.version).toBe(SAVED_PROGRESSION_SCHEMA_VERSION);
  });

  it('survives a localStorage quota failure', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => persistSavedProgressions({})).not.toThrow();
  });
});

describe('save and load round trip', () => {
  it('preserves tempo, transposition and effect levels', () => {
    const entry: SavedProgressionEntry = {
      version: SAVED_PROGRESSION_SCHEMA_VERSION,
      progression: [{ id: 'a', root: 'C', type: ChordType.Major, inversion: 1 }],
      accompanimentLayers: [
        {
          id: 'layer-1',
          instrument: AccompanimentInstrument.StringEnsemble,
          volume: -8,
          rhythmPattern: AccompanimentRhythmPattern.PerTwoBeats,
        },
      ],
      bpm: 78,
      transposition: 4,
      userPianoVolume: -2,
      userPianoInstrument: UserPianoInstrument.SampledGrand,
      reverbLevel: 0.8,
      delayLevel: 0.3,
      swing: 0.25,
    };

    persistSavedProgressions({ ballad: entry });
    const loaded = loadSavedProgressions();

    expect(loaded.ballad).toMatchObject({
      bpm: 78,
      transposition: 4,
      userPianoVolume: -2,
      userPianoInstrument: UserPianoInstrument.SampledGrand,
      reverbLevel: 0.8,
      delayLevel: 0.3,
      swing: 0.25,
    });
    expect(loaded.ballad.progression[0].inversion).toBe(1);
    expect(loaded.ballad.accompanimentLayers[0].instrument).toBe(
      AccompanimentInstrument.StringEnsemble
    );
  });
});
