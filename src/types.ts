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

export interface SavedProgressionEntry {
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
  aiBassEvents?: AiNoteEvent[];
  
  // New custom rhythms structure
  customRhythms?: Record<string, BeatDuration[][]>;

  // --- Legacy properties for migration ---
  instrument?: AccompanimentInstrument;
  volume?: number;
  rhythmPattern?: AccompanimentRhythmPattern;
  customRhythm?: BeatDuration[][];
}