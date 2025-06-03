export type NoteName = "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B";

export interface PianoKeyData {
  note: NoteName;
  octave: number;
  isBlack: boolean;
  displayName: string; // e.g., C, C#
  fullName: string; // e.g., C4, C#4
}

export enum ChordType {
  Major = "Maj",
  Minor = "min",
  Dominant7th = "7",
  Minor7th = "m7",
  Major7th = "Maj7",
}

export interface ChordDefinition {
  id: string; // Unique ID for list rendering
  root: NoteName;
  type: ChordType;
}

export enum AccompanimentInstrument {
  AcousticPiano = "AcousticPiano", // New, more realistic piano
  SynthPiano = "SynthPiano", 
  MellowSynth = "MellowSynth",   // Renamed from TruePiano
  Synth = "Synth",
  FMSynth = "FM Synth",
  AMSynth = "AM Synth",
  PluckSynth = "Pluck Synth",
}

export enum UserPianoInstrument {
  ClassicGrand = "ClassicGrand",
  BrightUpright = "BrightUpright",
  ElectricPiano = "ElectricPiano",
  SimpleSynth = "SimpleSynth",
  SampledGrand = "SampledGrand",
}

export enum AccompanimentRhythmPattern {
  PerMeasure = "PerMeasure", // Once per measure (Whole note)
  PerTwoBeats = "PerTwoBeats", // Once every two beats (Half note)
  PerBeat = "PerBeat", // Once per beat (Quarter note)
  PerEighthNote = "PerEighthNote", // Once per eighth note
  PerSixteenthNote = "PerSixteenthNote", // Once per sixteenth note
  Custom = "Custom", // Custom rhythm pattern
}

// Defines the possible durations for a single beat in the custom rhythm editor
export type BeatDuration = "off" | "1n" | "2n" | "4n" | "8n" | "16n";
