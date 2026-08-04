import {
  AccompanimentRhythmPattern,
  BassInstrument,
  BassPattern,
  DrumPattern,
  SAVED_PROGRESSION_SCHEMA_VERSION,
  UserPianoInstrument,
  type AccompanimentLayer,
  type BeatDuration,
  type ChordDefinition,
  type SavedProgressionEntry,
} from '../types';
import {
  createDefaultCustomDrumChordPattern,
  DEFAULT_ACCOMPANIMENT_LAYER,
  DEFAULT_BASS_ENABLED,
  DEFAULT_BASS_INSTRUMENT,
  DEFAULT_BASS_PATTERN,
  DEFAULT_BASS_VOLUME,
  DEFAULT_BPM,
  DEFAULT_DELAY_LEVEL,
  DEFAULT_DRUM_PATTERN,
  DEFAULT_DRUM_VOLUME,
  DEFAULT_DRUMS_ENABLED,
  DEFAULT_REVERB_LEVEL,
  DEFAULT_SWING,
  DEFAULT_TRANSPOSE_SEMITONES,
  DEFAULT_USER_PIANO_INSTRUMENT,
  DEFAULT_USER_PIANO_VOLUME,
  SAVED_PROGRESSIONS_LOCAL_STORAGE_KEY,
} from '../constants';
import { createLayerId } from './ids';

/**
 * Single source of truth for reading and writing saved progressions.
 *
 * Migration used to be duplicated across App.tsx's useState initialiser and
 * handleLoadProgression, and the two copies had drifted: the initialiser
 * defaulted missing drum/bass fields while the load path did not, so the same
 * stored entry could behave differently depending on which path touched it.
 */

/** Anything read out of localStorage is untrusted, so it starts life as unknown. */
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Enum-valued fields are validated against the runtime enum rather than cast,
 * so a hand-edited or downgraded localStorage entry cannot inject a value the
 * rest of the app does not understand.
 */
function asEnum<T extends Record<string, string>>(
  enumObject: T,
  value: unknown,
  fallback: T[keyof T]
): T[keyof T] {
  return typeof value === 'string' && Object.values(enumObject).includes(value)
    ? (value as T[keyof T])
    : fallback;
}

/** Chords gained an `inversion` field after the first release. */
function migrateProgression(raw: unknown): ChordDefinition[] {
  if (!Array.isArray(raw)) return [];

  return raw.filter(isRecord).map(chord => ({
    ...chord,
    inversion: asNumber(chord.inversion, 0),
  })) as ChordDefinition[];
}

/**
 * Accompaniment used to be a single instrument/volume/rhythmPattern triple on the
 * entry itself. It is now a list of layers, so fold the legacy triple into one.
 */
function migrateLayers(raw: UnknownRecord): AccompanimentLayer[] {
  const layers = raw.accompanimentLayers;

  if (Array.isArray(layers) && layers.length > 0) {
    return layers as AccompanimentLayer[];
  }

  return [
    {
      id: createLayerId(),
      instrument:
        (raw.instrument as AccompanimentLayer['instrument']) ??
        DEFAULT_ACCOMPANIMENT_LAYER.instrument,
      volume: asNumber(raw.volume, DEFAULT_ACCOMPANIMENT_LAYER.volume),
      rhythmPattern:
        (raw.rhythmPattern as AccompanimentLayer['rhythmPattern']) ??
        DEFAULT_ACCOMPANIMENT_LAYER.rhythmPattern,
    },
  ];
}

/**
 * customRhythm (one shared grid) became customRhythms (a grid per layer). The
 * legacy grid only ever applied to layers actually set to the Custom pattern.
 */
function migrateCustomRhythms(
  raw: UnknownRecord,
  layers: AccompanimentLayer[]
): Record<string, BeatDuration[][]> | undefined {
  if (isRecord(raw.customRhythms)) {
    return raw.customRhythms as Record<string, BeatDuration[][]>;
  }

  const legacy = raw.customRhythm;
  if (!Array.isArray(legacy)) return undefined;

  const migrated: Record<string, BeatDuration[][]> = {};
  for (const layer of layers) {
    if (layer.rhythmPattern === AccompanimentRhythmPattern.Custom) {
      migrated[layer.id] = legacy as BeatDuration[][];
    }
  }
  return Object.keys(migrated).length > 0 ? migrated : undefined;
}

/**
 * Normalises one stored entry to the current schema.
 * Returns null for entries that are too malformed to be useful, so a single bad
 * record cannot take out the whole saved list.
 */
export function migrateEntry(raw: unknown): SavedProgressionEntry | null {
  if (!isRecord(raw) || !Array.isArray(raw.progression)) return null;

  const progression = migrateProgression(raw.progression);
  const accompanimentLayers = migrateLayers(raw);
  const customRhythms = migrateCustomRhythms(raw, accompanimentLayers);

  const customDrumData = Array.isArray(raw.customDrumData)
    ? (raw.customDrumData as SavedProgressionEntry['customDrumData'])
    : progression.map(() => createDefaultCustomDrumChordPattern());

  return {
    version: SAVED_PROGRESSION_SCHEMA_VERSION,
    progression,
    accompanimentLayers,
    customRhythms,

    drumsEnabled: asBoolean(raw.drumsEnabled, DEFAULT_DRUMS_ENABLED),
    drumVolume: asNumber(raw.drumVolume, DEFAULT_DRUM_VOLUME),
    drumPattern: asEnum(DrumPattern, raw.drumPattern, DEFAULT_DRUM_PATTERN),
    customDrumData,

    bassEnabled: asBoolean(raw.bassEnabled, DEFAULT_BASS_ENABLED),
    bassVolume: asNumber(raw.bassVolume, DEFAULT_BASS_VOLUME),
    bassPattern: asEnum(BassPattern, raw.bassPattern, DEFAULT_BASS_PATTERN),
    bassInstrument: asEnum(BassInstrument, raw.bassInstrument, DEFAULT_BASS_INSTRUMENT),
    aiBassEvents: Array.isArray(raw.aiBassEvents)
      ? (raw.aiBassEvents as SavedProgressionEntry['aiBassEvents'])
      : null,

    // v2 fields. Older entries fall back to the app defaults rather than to
    // whatever the user currently has set, so loading is deterministic.
    bpm: asNumber(raw.bpm, DEFAULT_BPM),
    transposition: asNumber(raw.transposition, DEFAULT_TRANSPOSE_SEMITONES),
    userPianoVolume: asNumber(raw.userPianoVolume, DEFAULT_USER_PIANO_VOLUME),
    userPianoInstrument: asEnum(
      UserPianoInstrument,
      raw.userPianoInstrument,
      DEFAULT_USER_PIANO_INSTRUMENT
    ),
    reverbLevel: asNumber(raw.reverbLevel, DEFAULT_REVERB_LEVEL),
    delayLevel: asNumber(raw.delayLevel, DEFAULT_DELAY_LEVEL),
    swing: asNumber(raw.swing, DEFAULT_SWING),
  };
}

/** Reads and migrates every stored entry. Never throws. */
export function loadSavedProgressions(): Record<string, SavedProgressionEntry> {
  const result: Record<string, SavedProgressionEntry> = {};

  try {
    const stored = window.localStorage.getItem(SAVED_PROGRESSIONS_LOCAL_STORAGE_KEY);
    if (!stored) return result;

    const parsed: unknown = JSON.parse(stored);
    if (!isRecord(parsed)) return result;

    for (const [name, raw] of Object.entries(parsed)) {
      const migrated = migrateEntry(raw);
      if (migrated) result[name] = migrated;
      else console.warn(`[progressionStorage] Skipping unreadable entry "${name}".`);
    }
  } catch (error) {
    console.error('[progressionStorage] Failed to read saved progressions:', error);
  }

  return result;
}

/** Writes entries back, dropping the legacy fields so they are not re-persisted. */
export function persistSavedProgressions(
  entries: Record<string, SavedProgressionEntry>
): void {
  try {
    const cleaned: Record<string, SavedProgressionEntry> = {};

    for (const [name, entry] of Object.entries(entries)) {
      const {
        customRhythm: _customRhythm,
        instrument: _instrument,
        volume: _volume,
        rhythmPattern: _rhythmPattern,
        ...rest
      } = entry;
      cleaned[name] = { ...rest, version: SAVED_PROGRESSION_SCHEMA_VERSION };
    }

    window.localStorage.setItem(
      SAVED_PROGRESSIONS_LOCAL_STORAGE_KEY,
      JSON.stringify(cleaned)
    );
  } catch (error) {
    // Most likely a quota error. Surfacing it in the console keeps the app usable.
    console.error('[progressionStorage] Failed to persist saved progressions:', error);
  }
}
