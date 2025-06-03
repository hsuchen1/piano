
import { NoteName, ChordType, PianoKeyData, AccompanimentInstrument, UserPianoInstrument, AccompanimentRhythmPattern, BeatDuration } from './types';
import * as Tone from 'tone'; // For synth options type
import type { RecursivePartial } from 'tone/build/esm/core/util/Interface'; // Import RecursivePartial

// Use the imported Tone directly
const ToneRef = Tone;

export const NOTE_NAMES_SHARP: NoteName[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const NOTE_NAMES_FLAT: string[] = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
// Default to sharps for display and internal logic unless specified
export const ACTIVE_NOTE_NAMES: NoteName[] = NOTE_NAMES_SHARP;


export const START_OCTAVE = 2;
export const NUM_OCTAVES = 4; // C2 to B5 (inclusive)

export const generatePianoKeys = (startOctave: number, numOctaves: number): PianoKeyData[] => {
  const keys: PianoKeyData[] = [];
  for (let o = 0; o < numOctaves; o++) {
    const currentOctave = startOctave + o;
    ACTIVE_NOTE_NAMES.forEach(noteName => {
      const isBlack = noteName.includes("#") || noteName.includes("b");
      keys.push({
        note: noteName,
        octave: currentOctave,
        isBlack: isBlack,
        displayName: noteName,
        fullName: `${noteName}${currentOctave}`,
      });
    });
  }
  return keys;
};

export const ALL_PIANO_KEYS = generatePianoKeys(START_OCTAVE, NUM_OCTAVES);

export const CHORD_INTERVALS: Record<ChordType, number[]> = {
  [ChordType.Major]: [0, 4, 7],
  [ChordType.Minor]: [0, 3, 7],
  [ChordType.Dominant7th]: [0, 4, 7, 10],
  [ChordType.Minor7th]: [0, 3, 7, 10],
  [ChordType.Major7th]: [0, 4, 7, 11],
};

export const DEFAULT_TRANSPOSE_SEMITONES = 0; // C
export const DEFAULT_BPM = 120;
export const MIN_BPM = 40;
export const MAX_BPM = 240;
export const DEFAULT_ACCOMPANIMENT_VOLUME = -10; // dB
export const MIN_VOLUME = -40; // dB
export const MAX_VOLUME = 10; // dB - Updated to 10
export const DEFAULT_ACCOMPANIMENT_INSTRUMENT = AccompanimentInstrument.SynthPiano; // Changed to SynthPiano
export const DEFAULT_USER_PIANO_INSTRUMENT: UserPianoInstrument = UserPianoInstrument.ClassicGrand;
export const DEFAULT_ACCOMPANIMENT_RHYTHM_PATTERN = AccompanimentRhythmPattern.PerMeasure;

export const ACCOMPANIMENT_RHYTHM_PATTERN_OPTIONS: {
  value: AccompanimentRhythmPattern;
  label: string;
  hits?: { offset: string | number; duration: string }[]; // hits is now optional
}[] = [
  {
    value: AccompanimentRhythmPattern.PerMeasure,
    label: "每小節一次 (1 hit/bar)",
    hits: [{ offset: "0:0:0", duration: "1n" }] // Duration of one whole note
  },
  {
    value: AccompanimentRhythmPattern.PerTwoBeats,
    label: "每兩拍一次 (2 hits/bar)",
    hits: [
      { offset: "0:0:0", duration: "2n" },    // At beat 1
      { offset: "0:2:0", duration: "2n" }, // At beat 3
    ]
  },
  {
    value: AccompanimentRhythmPattern.PerBeat,
    label: "每拍一次 (4 hits/bar)",
    hits: [
      { offset: "0:0:0", duration: "4n" }, // At beat 1
      { offset: "0:1:0", duration: "4n" }, // At beat 2
      { offset: "0:2:0", duration: "4n" }, // At beat 3
      { offset: "0:3:0", duration: "4n" }, // At beat 4
    ]
  },
  {
    value: AccompanimentRhythmPattern.PerEighthNote,
    label: "每八分音符一次 (8 hits/bar)",
    hits: [
      { offset: "0:0:0", duration: "8n" },
      { offset: "0:0:2", duration: "8n" },
      { offset: "0:1:0", duration: "8n" },
      { offset: "0:1:2", duration: "8n" },
      { offset: "0:2:0", duration: "8n" },
      { offset: "0:2:2", duration: "8n" },
      { offset: "0:3:0", duration: "8n" },
      { offset: "0:3:2", duration: "8n" },
    ]
  },
  {
    value: AccompanimentRhythmPattern.PerSixteenthNote,
    label: "每十六分音符一次 (16 hits/bar)",
    hits: [
      { offset: "0:0:0", duration: "16n" }, { offset: "0:0:1", duration: "16n" },
      { offset: "0:0:2", duration: "16n" }, { offset: "0:0:3", duration: "16n" },
      { offset: "0:1:0", duration: "16n" }, { offset: "0:1:1", duration: "16n" },
      { offset: "0:1:2", duration: "16n" }, { offset: "0:1:3", duration: "16n" },
      { offset: "0:2:0", duration: "16n" }, { offset: "0:2:1", duration: "16n" },
      { offset: "0:2:2", duration: "16n" }, { offset: "0:2:3", duration: "16n" },
      { offset: "0:3:0", duration: "16n" }, { offset: "0:3:1", duration: "16n" },
      { offset: "0:3:2", duration: "16n" }, { offset: "0:3:3", duration: "16n" },
    ]
  },
  {
    value: AccompanimentRhythmPattern.Custom,
    label: "自訂 (Custom)",
    // No predefined hits for custom pattern
  }
];


export const ACCOMPANIMENT_INSTRUMENT_OPTIONS: { value: AccompanimentInstrument; label: string }[] = [
  { value: AccompanimentInstrument.AcousticPiano, label: "鋼琴 (Piano)" },
  { value: AccompanimentInstrument.SynthPiano, label: "合成鋼琴 (Synth Piano)" }, // This is now the default
  { value: AccompanimentInstrument.MellowSynth, label: "圓潤合成音 (Mellow Synth)" },
  { value: AccompanimentInstrument.Synth, label: "合成器 (Synth)" },
  { value: AccompanimentInstrument.FMSynth, label: "FM 合成器 (FM Synth)" },
  { value: AccompanimentInstrument.AMSynth, label: "AM 合成器 (AM Synth)" },
  { value: AccompanimentInstrument.PluckSynth, label: "撥弦合成器 (Pluck Synth)" },
];

export const USER_PIANO_INSTRUMENT_OPTIONS: { value: UserPianoInstrument; label: string }[] = [
  { value: UserPianoInstrument.ClassicGrand, label: "古典平台鋼琴 (Classic Grand)" },
  { value: UserPianoInstrument.SampledGrand, label: "真實平台鋼琴 (Sampled Grand)"},
  { value: UserPianoInstrument.BrightUpright, label: "明亮直立鋼琴 (Bright Upright)" },
  { value: UserPianoInstrument.ElectricPiano, label: "電鋼琴 (Electric Piano)" },
  { value: UserPianoInstrument.SimpleSynth, label: "基本合成器 (Simple Synth)" },
];

// Type for Synth options, using RecursivePartial<Tone.SynthOptions> directly for clarity.
type SynthOptions = RecursivePartial<Tone.SynthOptions>;

export const USER_PIANO_SOUND_CONFIGS: Record<Exclude<UserPianoInstrument, UserPianoInstrument.SampledGrand>, SynthOptions> = {
  [UserPianoInstrument.ClassicGrand]: {
    oscillator: { type: 'fatsine', phase: 0, spread: 30, count: 3 }, // Removed partials
    envelope: { attack: 0.005, decay: 0.7, sustain: 0.1, release: 0.8 },
    volume: -6,
  } as any,
  [UserPianoInstrument.BrightUpright]: {
    oscillator: { type: 'fatsquare', spread:15, count: 2 },
    envelope: { attack: 0.008, decay: 0.5, sustain: 0.05, release: 0.6 },
    volume: -7,
  },
  [UserPianoInstrument.ElectricPiano]: {
    oscillator: { type: 'fmsine', harmonicity: 2, modulationIndex:1.5 },
    envelope: { attack: 0.01, decay: 0.8, sustain: 0.3, release: 1.2 },
    volume: -5,
  },
  [UserPianoInstrument.SimpleSynth]: {
    oscillator: { type: 'triangle8' },
    envelope: { attack: 0.01, decay: 0.15, sustain: 0.25, release: 0.4 },
    volume: -8,
  },
};

export const SAMPLED_GRAND_PIANO_URLS: Record<string, string> = {
    'A0': 'A0.mp3', 'C1': 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3', 'A1': 'A1.mp3',
    'C2': 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', 'A2': 'A2.mp3',
    'C3': 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', 'A3': 'A3.mp3',
    'C4': 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3', 'A4': 'A4.mp3',
    'C5': 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3', 'A5': 'A5.mp3',
    'C6': 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3', 'A6': 'A6.mp3',
    'C7': 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3', 'A7': 'A7.mp3',
    'C8': 'C8.mp3'
};
export const SAMPLED_GRAND_PIANO_BASE_URL = 'https://tonejs.github.io/audio/salamander/';

export const ACCOMPANIMENT_SYNTH_PIANO_CONFIG: SynthOptions = {
  oscillator: { type: 'fatsawtooth', count: 3, spread: 20 },
  envelope: { attack: 0.01, decay: 1.2, sustain: 0.3, release: 0.8 },
  volume: -8,
};

export const ACCOMPANIMENT_MELLOW_SYNTH_CONFIG: SynthOptions = {
  oscillator: { type: 'fatsine', phase: 0, spread: 20, count: 3 }, // Removed partials
  envelope: { attack: 0.005, decay: 0.8, sustain: 0.1, release: 1.0 },
  volume: -7,
};

// ACCOMPANIMENT_ACOUSTIC_PIANO_CONFIG is removed as AcousticPiano will use Tone.Sampler

export const ACCOMPANIMENT_PLUCKY_SYNTH_CONFIG: SynthOptions = {
  oscillator: { type: 'triangle' },
  envelope: {
    attack: 0.005,
    decay: 0.2,
    sustain: 0.01,
    release: 0.4,
  },
  volume: -8,
};

export const getNoteFullName = (noteName: NoteName, octave: number, transpose: number = 0): string => {
  const noteIndex = ACTIVE_NOTE_NAMES.indexOf(noteName);
  if (noteIndex === -1) return `${noteName}${octave}`;

  const transposedNoteIndex = noteIndex + transpose;
  const newOctave = octave + Math.floor(transposedNoteIndex / 12);
  const newNoteName = ACTIVE_NOTE_NAMES[(transposedNoteIndex % 12 + 12) % 12];
  return `${newNoteName}${newOctave}`;
};

export const BASE_KEYBOARD_OCTAVE = START_OCTAVE + 1; // This is 3

export const KEY_MAPPING: { [key: string]: { note: NoteName; octave: number } } = {
  // Lower row (Z, X, C...)
  'z': { note: 'C', octave: BASE_KEYBOARD_OCTAVE },
  's': { note: 'C#', octave: BASE_KEYBOARD_OCTAVE },
  'x': { note: 'D', octave: BASE_KEYBOARD_OCTAVE },
  'd': { note: 'D#', octave: BASE_KEYBOARD_OCTAVE },
  'c': { note: 'E', octave: BASE_KEYBOARD_OCTAVE },
  'v': { note: 'F', octave: BASE_KEYBOARD_OCTAVE },
  'g': { note: 'F#', octave: BASE_KEYBOARD_OCTAVE },
  'b': { note: 'G', octave: BASE_KEYBOARD_OCTAVE },
  'h': { note: 'G#', octave: BASE_KEYBOARD_OCTAVE },
  'n': { note: 'A', octave: BASE_KEYBOARD_OCTAVE },
  'j': { note: 'A#', octave: BASE_KEYBOARD_OCTAVE },
  'm': { note: 'B', octave: BASE_KEYBOARD_OCTAVE },
  ',': { note: 'C', octave: BASE_KEYBOARD_OCTAVE + 1 },
  'l': { note: 'C#', octave: BASE_KEYBOARD_OCTAVE + 1 },
  '.': { note: 'D', octave: BASE_KEYBOARD_OCTAVE + 1 },
  ';': { note: 'D#', octave: BASE_KEYBOARD_OCTAVE + 1 },
  '/': { note: 'E', octave: BASE_KEYBOARD_OCTAVE + 1 },

  // Upper row (Q, W, E...)
  'q': { note: 'C', octave: BASE_KEYBOARD_OCTAVE + 1 },
  '2': { note: 'C#', octave: BASE_KEYBOARD_OCTAVE + 1 },
  'w': { note: 'D', octave: BASE_KEYBOARD_OCTAVE + 1 },
  '3': { note: 'D#', octave: BASE_KEYBOARD_OCTAVE + 1 },
  'e': { note: 'E', octave: BASE_KEYBOARD_OCTAVE + 1 },
  'r': { note: 'F', octave: BASE_KEYBOARD_OCTAVE + 1 },
  '5': { note: 'F#', octave: BASE_KEYBOARD_OCTAVE + 1 },
  't': { note: 'G', octave: BASE_KEYBOARD_OCTAVE + 1 },
  '6': { note: 'G#', octave: BASE_KEYBOARD_OCTAVE + 1 },
  'y': { note: 'A', octave: BASE_KEYBOARD_OCTAVE + 1 },
  '7': { note: 'A#', octave: BASE_KEYBOARD_OCTAVE + 1 },
  'u': { note: 'B', octave: BASE_KEYBOARD_OCTAVE + 1 },
  'i': { note: 'C', octave: BASE_KEYBOARD_OCTAVE + 2 },
  '9': { note: 'C#', octave: BASE_KEYBOARD_OCTAVE + 2 },
  'o': { note: 'D', octave: BASE_KEYBOARD_OCTAVE + 2 },
  '0': { note: 'D#', octave: BASE_KEYBOARD_OCTAVE + 2 },
  'p': { note: 'E', octave: BASE_KEYBOARD_OCTAVE + 2 },

  // Previous new mappings
  '[': { note: 'F', octave: 5 },
  ']': { note: 'G', octave: 5 },
  '\\': { note: 'A', octave: 5 },
  '=': { note: 'F#', octave: 5 },
  'backspace': { note: 'G#', octave: 5 }, // Key event for Backspace is 'Backspace' (capital B)
  'tab': { note: 'B', octave: 3 },       // Key event for Tab is 'Tab' (capital T)

  // Mappings for grave accent (`) and Shift
  '`': { note: 'A#', octave: 3 }, // Grave accent / Backtick
  'shift': { note: 'B', octave: 2 },  // Shift key (event.key is "Shift", toLowerCase() makes it "shift")
};

export const DEFAULT_CUSTOM_BEAT_DURATION: BeatDuration = "off";

export const BEAT_DURATION_OPTIONS: { value: BeatDuration; label: string }[] = [
  { value: "off", label: "關閉 (Off)" },
  { value: "1n", label: "全音符 (Whole)" },
  { value: "2n", label: "二分音符 (Half)" },
  { value: "4n", label: "四分音符 (Quarter)" },
  { value: "8n", label: "八分音符 (Eighth)" },
  { value: "16n", label: "十六分音符 (Sixteenth)" },
];

export const SAVED_PROGRESSIONS_LOCAL_STORAGE_KEY = 'interactivePianoStudio_savedProgressions';
