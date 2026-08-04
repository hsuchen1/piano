export type NoteName = "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B";

export interface PianoKeyData {
  note: NoteName;
  octave: number;
  isBlack: boolean;
  displayName: string; // e.g., C, C#
  fullName: string; // e.g., C4, C#4
}

export type AiNoteEvent = {
  note: string;
  time: string; // Tone.js time format "M:B:S"
  duration: string; // Tone.js time format "4n", "8n", etc.
};

export enum ChordType {
  Major = "Maj",
  Minor = "min",
  Dominant7th = "7",
  Minor7th = "m7",
  Major7th = "Maj7",
  Diminished7th = "dim7",
  Minor7thFlat5 = "m7b5",
  // New extended chords
  Suspended2 = "sus2",
  Suspended4 = "sus4",
  Major9 = "Maj9",
  Minor9 = "m9",
  Dominant9 = "9",
  Major6 = "6",
  Minor6 = "m6",
  Augmented = "aug",
  PowerChord = "5",
  Dominant7sharp9 = "7#9",
  Dominant7flat9 = "7b9",
}

export interface ChordDefinition {
  id: string; // Unique ID for list rendering
  root: NoteName;
  type: ChordType;
  inversion: number; // 0: root, 1: 1st, 2: 2nd, etc.
}

/** Which AI feature is currently running. */
export type GenerationKind = 'chords' | 'style' | 'drums' | 'voicing' | 'bass';

/**
 * Shared shape for AI request progress. Four components previously re-declared
 * this inline, each typing `type` as a bare `string | null`.
 */
export interface GenerationState {
  type: GenerationKind | null;
  isLoading: boolean;
  error: string | null;
  /** Which chord's drum pattern is generating, so only that cell shows a spinner. */
  drumChordIndex?: number;
}

export enum AccompanimentInstrument {
  AcousticPiano = "AcousticPiano",
  SynthPiano = "SynthPiano",
  MellowSynth = "MellowSynth",
  Synth = "Synth",
  FMSynth = "FM Synth",
  AMSynth = "AM Synth",
  SampledGuitar = "SampledGuitar",
  StringEnsemble = "StringEnsemble",
}

export interface AccompanimentLayer {
  id: string;
  instrument: AccompanimentInstrument;
  volume: number;
  rhythmPattern: AccompanimentRhythmPattern;
}

export enum UserPianoInstrument {
  ClassicGrand = "ClassicGrand",
  BrightUpright = "BrightUpright",
  ElectricPiano = "ElectricPiano",
  SimpleSynth = "SimpleSynth",
  SampledGrand = "SampledGrand",
  SampledGuitar = "SampledGuitar",
  StringEnsemble = "StringEnsemble",
}

export enum AccompanimentRhythmPattern {
  PerMeasure = "PerMeasure",
  PerTwoBeats = "PerTwoBeats",
  PerBeat = "PerBeat",
  PerEighthNote = "PerEighthNote",
  PerSixteenthNote = "PerSixteenthNote",
  Custom = "Custom",
}

export type BeatDuration = "off" | "1n" | "2n" | "4n" | "8n" | "16n";

// --- Drum Types ---
export enum DrumInstrument {
  Kick = "Kick",
  Snare = "Snare",
  HiHatClosed = "HiHatClosed", // Specific HiHat types
  // HiHatOpen = "HiHatOpen", // Could add later
  Tom1 = "Tom1", // High Tom
  // Tom2 = "Tom2", // Mid Tom
  // Tom3 = "Tom3", // Low Tom
  CrashCymbal = "CrashCymbal",
}

export enum DrumPattern {
  Rock = "Rock",
  PopFunk = "PopFunk",
  JazzSwing = "JazzSwing",
  Latin = "Latin",
  EDM = "EDM",
  Ballad = "Ballad", // New
  SlowPop = "SlowPop", // New
  HipHop = "HipHop", // New
  BossaNova = "BossaNova", // New
  Reggae = "Reggae", // New
  Custom = "Custom",
  Off = "Off", // To explicitly turn off drums
}

// For custom drum patterns: boolean[beatIndex (0-3)][subdivisionIndex (0-3)]
export type DrumInstrumentPatternData = boolean[][];
// For a single chord: { Kick: boolean[][], Snare: boolean[][], ... }
export type CustomDrumChordPattern = {
  [key in DrumInstrument]?: DrumInstrumentPatternData;
};
// For the entire progression: array of patterns, one per chord
export type CustomDrumProgressionData = CustomDrumChordPattern[];


// --- Bass Types ---
export enum BassInstrument {
  ElectricBass = "ElectricBass",
  SynthBass = "SynthBass",
  AcousticBass = "AcousticBass", // e.g. upright bass sound
  PopPulseBass = "PopPulseBass",
}

export enum BassPattern {
  Off = "Off", // To explicitly turn off bass
  RootNotes = "RootNotes", // Plays root on beat 1
  RootAndFifth = "RootAndFifth", // Root on 1, Fifth on 3
  SimpleArpeggio = "SimpleArpeggio", // 1-3-5-8 over the measure
  WalkingBassSimple = "WalkingBassSimple", // Simplified walking bass
  WalkingBassMelodic = "WalkingBassMelodic",
  FunkSlap = "FunkSlap",
  AiGenerated = "AiGenerated",
}

/**
 * Bumped whenever the persisted shape changes. Entries written before versioning
 * existed have no `version` field and are treated as version 1.
 *
 * v1 -> v2: added the global mix and groove settings (bpm, transposition,
 * userPianoVolume, userPianoInstrument, reverbLevel, delayLevel, swing). Saving
 * previously discarded all of these, so a saved progression silently came back
 * with whatever the user happened to have dialled in at load time.
 */
export const SAVED_PROGRESSION_SCHEMA_VERSION = 2;

export interface SavedProgressionEntry {
  /** Absent on pre-versioning entries; migrate() normalises those to the current version. */
  version?: number;

  progression: ChordDefinition[];
  // Accompaniment Layers
  accompanimentLayers: AccompanimentLayer[];
  // Drum settings
  drumsEnabled?: boolean;
  drumVolume?: number;
  drumPattern?: DrumPattern;
  customDrumData?: CustomDrumProgressionData; // Storing the full custom drum data
  // Bass settings
  bassEnabled?: boolean;
  bassVolume?: number;
  bassPattern?: BassPattern;
  bassInstrument?: BassInstrument;
  // `null` is a meaningful value here: it means "AI bassline explicitly cleared",
  // which is what App state holds, so saved entries must be able to round-trip it.
  aiBassEvents?: AiNoteEvent[] | null;

  // New custom rhythms structure
  customRhythms?: Record<string, BeatDuration[][]>;

  // --- Global mix and groove (added in v2) ---
  bpm?: number;
  transposition?: number;
  userPianoVolume?: number;
  userPianoInstrument?: UserPianoInstrument;
  reverbLevel?: number;
  delayLevel?: number;
  swing?: number;

  // --- Legacy properties, read during migration and never written back ---
  instrument?: AccompanimentInstrument;
  volume?: number;
  rhythmPattern?: AccompanimentRhythmPattern;
  customRhythm?: BeatDuration[][];
}