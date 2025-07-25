import { NoteName, ChordType, PianoKeyData, AccompanimentInstrument, UserPianoInstrument, AccompanimentRhythmPattern, BeatDuration, DrumInstrument, DrumPattern, BassInstrument, BassPattern, CustomDrumChordPattern, AccompanimentLayer } from './types';
import * as Tone from 'tone';
import type { MembraneSynthOptions, NoiseSynthOptions, MetalSynthOptions, MonoSynthOptions, SynthOptions as ToneSynthOptions, OmniOscillatorOptions, EnvelopeOptions, FilterOptions, FrequencyEnvelopeOptions, NoiseType, ToneOscillatorType, EnvelopeCurve, FatOscillatorOptions, FMOscillatorOptions, PulseOscillatorOptions, AMOscillatorOptions, NoiseOptions as ToneNoiseOptions } from 'tone';


const ToneRef = Tone;

export const NOTE_NAMES_SHARP: NoteName[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const NOTE_NAMES_FLAT: string[] = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
export const ACTIVE_NOTE_NAMES: NoteName[] = NOTE_NAMES_SHARP;


export const START_OCTAVE = 2;
export const NUM_OCTAVES = 4;

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
  [ChordType.Diminished7th]: [0, 3, 6, 9],
  [ChordType.Minor7thFlat5]: [0, 3, 6, 10],
  // New intervals
  [ChordType.Suspended2]: [0, 2, 7],
  [ChordType.Suspended4]: [0, 5, 7],
  [ChordType.Major9]: [0, 4, 7, 11, 14],
  [ChordType.Minor9]: [0, 3, 7, 10, 14],
  [ChordType.Dominant9]: [0, 4, 7, 10, 14],
  [ChordType.Major6]: [0, 4, 7, 9],
  [ChordType.Minor6]: [0, 3, 7, 9],
  [ChordType.Augmented]: [0, 4, 8],
  [ChordType.PowerChord]: [0, 7],
  [ChordType.Dominant7sharp9]: [0, 4, 7, 10, 15],
  [ChordType.Dominant7flat9]: [0, 4, 7, 10, 13],
};

export const DEFAULT_TRANSPOSE_SEMITONES = 0;
export const DEFAULT_BPM = 120;
export const MIN_BPM = 40;
export const MAX_BPM = 240;
export const DEFAULT_ACCOMPANIMENT_VOLUME = -10; // For chord accompaniment instrument
export const DEFAULT_USER_PIANO_VOLUME = 0;     // For main playable piano
export const MIN_VOLUME = -40; // General minimum volume for accompaniment parts
export const MAX_VOLUME = 10;  // General maximum volume for accompaniment parts
export const MAX_BASS_VOLUME = 25; // Specific maximum for bass

// New volume ranges for user piano
export const MIN_USER_PIANO_VOLUME = -20; // -40 + 20
export const MAX_USER_PIANO_VOLUME = 30;  // 10 + 20

// New Default for a single Accompaniment Layer
export const DEFAULT_ACCOMPANIMENT_LAYER: Omit<AccompanimentLayer, 'id'> = {
  instrument: AccompanimentInstrument.SynthPiano,
  volume: DEFAULT_ACCOMPANIMENT_VOLUME,
  rhythmPattern: AccompanimentRhythmPattern.PerMeasure,
};


export const DEFAULT_USER_PIANO_INSTRUMENT: UserPianoInstrument = UserPianoInstrument.ClassicGrand;

// --- Drum Defaults ---
export const DEFAULT_DRUMS_ENABLED = false;
export const DEFAULT_DRUM_VOLUME = -12; // Drums can be loud
export const DEFAULT_DRUM_PATTERN = DrumPattern.Off;
export const NUM_BEATS_PER_DRUM_MEASURE = 4;
export const NUM_SUBDIVISIONS_PER_DRUM_BEAT = 4;

export const createDefaultDrumInstrumentPattern = (): boolean[][] =>
  Array(NUM_BEATS_PER_DRUM_MEASURE).fill(null).map(() =>
    Array(NUM_SUBDIVISIONS_PER_DRUM_BEAT).fill(false)
  );

export const createDefaultCustomDrumChordPattern = (): CustomDrumChordPattern => ({
  [DrumInstrument.Kick]: createDefaultDrumInstrumentPattern(),
  [DrumInstrument.Snare]: createDefaultDrumInstrumentPattern(),
  [DrumInstrument.HiHatClosed]: createDefaultDrumInstrumentPattern(),
  [DrumInstrument.Tom1]: createDefaultDrumInstrumentPattern(),
  [DrumInstrument.CrashCymbal]: createDefaultDrumInstrumentPattern(),
});

// --- Bass Defaults ---
export const DEFAULT_BASS_ENABLED = false;
export const DEFAULT_BASS_VOLUME = -5;
export const DEFAULT_BASS_PATTERN = BassPattern.Off;
export const DEFAULT_BASS_INSTRUMENT = BassInstrument.ElectricBass;
export const BASS_DEFAULT_OCTAVE = 2;
export const ACCOMPANIMENT_BASE_OCTAVE = 3;


export const ACCOMPANIMENT_RHYTHM_PATTERN_OPTIONS: {
  value: AccompanimentRhythmPattern;
  label: string;
  hits?: { offset: string | number; duration: string }[];
}[] = [
  { value: AccompanimentRhythmPattern.PerMeasure, label: "每小節一次 (1 hit/bar)", hits: [{ offset: "0:0:0", duration: "1n" }] },
  { value: AccompanimentRhythmPattern.PerTwoBeats, label: "每兩拍一次 (2 hits/bar)", hits: [{ offset: "0:0:0", duration: "2n" }, { offset: "0:2:0", duration: "2n" }] },
  { value: AccompanimentRhythmPattern.PerBeat, label: "每拍一次 (4 hits/bar)", hits: [{ offset: "0:0:0", duration: "4n" }, { offset: "0:1:0", duration: "4n" }, { offset: "0:2:0", duration: "4n" }, { offset: "0:3:0", duration: "4n" }] },
  { value: AccompanimentRhythmPattern.PerEighthNote, label: "每八分音符一次 (8 hits/bar)", hits: Array.from({ length: 8 }, (_, i) => ({ offset: `0:${Math.floor(i/2)}:${(i%2)*2}`, duration: "8n" })) },
  { value: AccompanimentRhythmPattern.PerSixteenthNote, label: "每十六分音符一次 (16 hits/bar)", hits: Array.from({ length: 16 }, (_, i) => ({ offset: `0:${Math.floor(i/4)}:${i%4}`, duration: "16n" })) },
  { value: AccompanimentRhythmPattern.Custom, label: "自訂 (Custom)" }
];


export const ACCOMPANIMENT_INSTRUMENT_OPTIONS: { value: AccompanimentInstrument; label: string }[] = [
  { value: AccompanimentInstrument.AcousticPiano, label: "鋼琴 (Piano)" },
  { value: AccompanimentInstrument.SynthPiano, label: "合成鋼琴 (Synth Piano)" },
  { value: AccompanimentInstrument.MellowSynth, label: "圓潤合成音 (Mellow Synth)" },
  { value: AccompanimentInstrument.SampledGuitar, label: "吉他 (Guitar)" },
  { value: AccompanimentInstrument.StringEnsemble, label: "弦樂合奏 (String Ensemble)" },
  { value: AccompanimentInstrument.Synth, label: "合成器 (Synth)" },
  { value: AccompanimentInstrument.FMSynth, label: "FM 合成器 (FM Synth)" },
  { value: AccompanimentInstrument.AMSynth, label: "AM 合成器 (AM Synth)" },
];

export const USER_PIANO_INSTRUMENT_OPTIONS: { value: UserPianoInstrument; label: string }[] = [
  { value: UserPianoInstrument.ClassicGrand, label: "古典平台鋼琴 (Classic Grand)" },
  { value: UserPianoInstrument.SampledGrand, label: "真實平台鋼琴 (Sampled Grand)"},
  { value: UserPianoInstrument.SampledGuitar, label: "吉他 (Guitar)" },
  { value: UserPianoInstrument.StringEnsemble, label: "弦樂合奏 (String Ensemble)" },
  { value: UserPianoInstrument.BrightUpright, label: "明亮直立鋼琴 (Bright Upright)" },
  { value: UserPianoInstrument.ElectricPiano, label: "電鋼琴 (Electric Piano)" },
  { value: UserPianoInstrument.SimpleSynth, label: "基本合成器 (Simple Synth)" },
];

// --- Drum Instrument Options & Sound Configs ---
export const DRUM_INSTRUMENT_OPTIONS: { value: DrumInstrument; label: string }[] = [
    { value: DrumInstrument.Kick, label: "大鼓 (Kick)" },
    { value: DrumInstrument.Snare, label: "小鼓 (Snare)" },
    { value: DrumInstrument.HiHatClosed, label: "閉合銅鈸 (Hi-Hat Closed)" },
    { value: DrumInstrument.Tom1, label: "筒鼓 (Tom 1)" },
    { value: DrumInstrument.CrashCymbal, label: "碎音鈸 (Crash)" },
];

export const DRUM_PATTERN_OPTIONS: { value: DrumPattern; label: string }[] = [
    { value: DrumPattern.Off, label: "關閉 (Off)" },
    { value: DrumPattern.Ballad, label: "抒情歌 (Ballad)" },
    { value: DrumPattern.SlowPop, label: "慢速流行 (Slow Pop)" },
    { value: DrumPattern.PopFunk, label: "流行/放克 (Pop/Funk)" },
    { value: DrumPattern.Rock, label: "搖滾 (Rock)" },
    { value: DrumPattern.HipHop, label: "嘻哈 (Hip-Hop)" },
    { value: DrumPattern.EDM, label: "電子舞曲 (EDM)" },
    { value: DrumPattern.JazzSwing, label: "爵士搖擺 (Jazz Swing)" },
    { value: DrumPattern.Latin, label: "拉丁 (Latin)" },
    { value: DrumPattern.BossaNova, label: "巴薩諾瓦 (Bossa Nova)" },
    { value: DrumPattern.Reggae, label: "雷鬼 (Reggae)" },
    { value: DrumPattern.Custom, label: "自訂 (Custom)" },
];

export const DRUM_SYNTH_CONFIGS: {
  [DrumInstrument.Kick]: Partial<MembraneSynthOptions>;
  [DrumInstrument.Snare]: Partial<NoiseSynthOptions>;
  [DrumInstrument.HiHatClosed]: Partial<NoiseSynthOptions>;
  [DrumInstrument.Tom1]: Partial<MembraneSynthOptions>;
  [DrumInstrument.CrashCymbal]: Partial<MetalSynthOptions>;
} = {
  [DrumInstrument.Kick]: {
    pitchDecay: 0.05, octaves: 10,
    oscillator: { type: "sine", phase: 0 } as any,
    envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4, attackCurve: "exponential", releaseCurve: "exponential", decayCurve: "exponential" },
    volume: 0
  },
  [DrumInstrument.Snare]: {
    noise: { type: "white", playbackRate: 3, fadeIn: 0, fadeOut: 0 } as any,
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.2, attackCurve: "linear", releaseCurve: "exponential", decayCurve: "linear" },
    volume: -5
  },
  [DrumInstrument.HiHatClosed]: {
    noise: { type: "pink", playbackRate: 5, fadeIn: 0, fadeOut: 0 } as any,
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.08, attackCurve: "linear", releaseCurve: "exponential", decayCurve: "linear" },
    volume: -15
  },
  [DrumInstrument.Tom1]: {
    pitchDecay: 0.08, octaves: 4,
    oscillator: { type: "sine", phase: 0 } as any,
    envelope: { attack: 0.001, decay: 0.2, sustain: 0.01, release: 0.1, attackCurve: "linear", releaseCurve: "exponential", decayCurve: "exponential" },
    volume: -3
  },
  [DrumInstrument.CrashCymbal]: {
    harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
    envelope: { attack: 0.001, decay: 1.0, sustain: 0, release: 1.0, attackCurve: "linear", releaseCurve: "exponential", decayCurve: "exponential" },
    volume: -10
  },
};


// --- Bass Instrument Options & Sound Configs ---
export const BASS_INSTRUMENT_OPTIONS: { value: BassInstrument; label: string }[] = [
    { value: BassInstrument.ElectricBass, label: "電貝斯 (Electric Bass)" },
    { value: BassInstrument.SynthBass, label: "合成貝斯 (Synth Bass)" },
    { value: BassInstrument.AcousticBass, label: "木貝斯 (Acoustic Bass)" },
    { value: BassInstrument.PopPulseBass, label: "流行脈動貝斯 (Pop Pulse Bass)" },
];

export const BASS_PATTERN_OPTIONS: { value: BassPattern; label: string }[] = [
    { value: BassPattern.Off, label: "關閉 (Off)" },
    { value: BassPattern.RootNotes, label: "根音 (Root Notes)" },
    { value: BassPattern.RootAndFifth, label: "根音與五音 (Root & Fifth)" },
    { value: BassPattern.SimpleArpeggio, label: "簡單琶音 (Simple Arpeggio)" },
    { value: BassPattern.WalkingBassSimple, label: "簡易行走貝斯 (Simple Walking Bass)" },
    { value: BassPattern.WalkingBassMelodic, label: "旋律行走貝斯 (Melodic Walking Bass)" },
    { value: BassPattern.FunkSlap, label: "放克貝斯線 (Funk Slap)" },
    { value: BassPattern.AiGenerated, label: "🤖 AI 生成貝斯線 (AI Generated)" },
];

export const BASS_SYNTH_CONFIGS: Record<Exclude<BassInstrument, BassInstrument.PopPulseBass>, any> = {
  [BassInstrument.ElectricBass]: {
    oscillator: { type: 'fatsawtooth', count: 2, spread: 10, phase: 0 },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.5, attackCurve: 'linear', releaseCurve: 'exponential', decayCurve: 'exponential' },
    filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.1, baseFrequency: 200, octaves: 2.6, release: 0.8, attackCurve: 'linear', releaseCurve: 'exponential', decayCurve: 'exponential', exponent: 2 },
    filter: { type: 'lowpass', Q: 2, frequency: 1200, rolloff: -12, detune:0, gain:0 },
    volume: -6,
  },
  [BassInstrument.SynthBass]: {
    oscillator: { type: 'square', phase: 0 },
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.4, attackCurve: 'linear', releaseCurve: 'exponential', decayCurve: 'exponential' },
    filterEnvelope: { attack: 0.02, decay: 0.05, sustain: 0.2, baseFrequency: 100, octaves: 3, release: 1, attackCurve: 'linear', releaseCurve: 'exponential', decayCurve: 'exponential', exponent: 2 },
    filter: { type: 'lowpass', Q: 3, frequency: 800, rolloff: -12, detune: 0, gain: 0 },
    volume: -8,
  },
  [BassInstrument.AcousticBass]: {
    oscillator: { type: 'sine', phase: 0 },
    envelope: { attack: 0.01, decay: 0.6, sustain: 0.1, release: 0.4, attackCurve: 'linear', releaseCurve: 'exponential', decayCurve: 'exponential' },
    filterEnvelope: { attack: 0.005, decay: 0.2, sustain: 0.05, baseFrequency: 300, octaves: 2, release: 0.5, attackCurve: 'linear', releaseCurve: 'exponential', decayCurve: 'exponential', exponent: 2 },
    filter: { type: 'lowpass', Q: 1.5, frequency: 1000, rolloff: -12, detune: 0, gain: 0 },
    volume: -4,
  }
};

const createPattern = (kickBeats: number[] = [], snareBeats: number[] = [], hiHatBeats: number[] = [], tomBeats: number[] = [], crashBeats: number[] = []): CustomDrumChordPattern => {
  const pattern: CustomDrumChordPattern = {
    [DrumInstrument.Kick]: createDefaultDrumInstrumentPattern(),
    [DrumInstrument.Snare]: createDefaultDrumInstrumentPattern(),
    [DrumInstrument.HiHatClosed]: createDefaultDrumInstrumentPattern(),
    [DrumInstrument.Tom1]: createDefaultDrumInstrumentPattern(),
    [DrumInstrument.CrashCymbal]: createDefaultDrumInstrumentPattern(),
  };

  const setBeats = (instrument: DrumInstrument, beats: number[]) => {
    if (!pattern[instrument]) return;
    beats.forEach(beatSubdiv => {
      const beatIndex = Math.floor(beatSubdiv / NUM_SUBDIVISIONS_PER_DRUM_BEAT);
      const subIndex = beatSubdiv % NUM_SUBDIVISIONS_PER_DRUM_BEAT;
      if (pattern[instrument]![beatIndex]) {
         pattern[instrument]![beatIndex][subIndex] = true;
      }
    });
  };

  setBeats(DrumInstrument.Kick, kickBeats);
  setBeats(DrumInstrument.Snare, snareBeats);
  setBeats(DrumInstrument.HiHatClosed, hiHatBeats);
  setBeats(DrumInstrument.Tom1, tomBeats);
  setBeats(DrumInstrument.CrashCymbal, crashBeats);
  return pattern;
};

export const PREDEFINED_DRUM_PATTERNS: Partial<Record<DrumPattern, CustomDrumChordPattern>> = {
  [DrumPattern.Rock]: createPattern([0, 8], [4, 12], [0, 2, 4, 6, 8, 10, 12, 14]),
  [DrumPattern.PopFunk]: createPattern([0, 3, 6, 8, 11, 14], [4, 12], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], [], [0]),
  [DrumPattern.JazzSwing]: createPattern([0, 9], [4, 13], [2, 5, 8, 11, 14]),
  [DrumPattern.Latin]: createPattern([0, 7, 8, 15], [4, 12], [0,2,4,5,6,8,10,12,13,14]),
  [DrumPattern.EDM]: createPattern([0, 4, 8, 12], [4, 12], [2, 6, 10, 14]),
  // New Patterns
  [DrumPattern.Ballad]: createPattern([0], [8], [0, 2, 4, 6, 8, 10, 12, 14]),
  [DrumPattern.SlowPop]: createPattern([0, 6], [8], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  [DrumPattern.HipHop]: createPattern([0, 7], [4, 12], [0, 2, 4, 6, 8, 10, 12, 14]),
  [DrumPattern.BossaNova]: createPattern([0, 3, 8, 11], [4, 12], [0, 2, 4, 6, 8, 10, 12, 14]),
  [DrumPattern.Reggae]: createPattern([8], [8], [2, 6, 10, 14]),
};


export const USER_PIANO_SOUND_CONFIGS: Record<Exclude<UserPianoInstrument, UserPianoInstrument.SampledGrand | UserPianoInstrument.SampledGuitar | UserPianoInstrument.StringEnsemble>, Partial<ToneSynthOptions>> = {
  [UserPianoInstrument.ClassicGrand]: {
    oscillator: { type: 'fatsine', phase: 0, spread: 30, count: 3 } as any,
    envelope: { attack: 0.005, decay: 0.7, sustain: 0.1, release: 0.8, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    volume: -6
  },
  [UserPianoInstrument.BrightUpright]: {
    oscillator: { type: 'fatsquare', spread:15, count: 2, phase: 0 } as any,
    envelope: { attack: 0.008, decay: 0.5, sustain: 0.05, release: 0.6, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    volume: -7
  },
  [UserPianoInstrument.ElectricPiano]: {
    oscillator: { type: 'fmsine', harmonicity: 2, modulationIndex:1.5, phase: 0, modulationType: 'square' } as any,
    envelope: { attack: 0.01, decay: 0.8, sustain: 0.3, release: 1.2, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    volume: -5
  },
  [UserPianoInstrument.SimpleSynth]: {
    oscillator: { type: 'triangle', phase: 0 } as any, 
    envelope: { attack: 0.01, decay: 0.15, sustain: 0.25, release: 0.4, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    volume: -8
  },
};

export const SAMPLED_GRAND_PIANO_URLS: Record<string, string> = { 'A0': 'A0.mp3', 'C1': 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3', 'A1': 'A1.mp3', 'C2': 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', 'A2': 'A2.mp3', 'C3': 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', 'A3': 'A3.mp3', 'C4': 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3', 'A4': 'A4.mp3', 'C5': 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3', 'A5': 'A5.mp3', 'C6': 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3', 'A6': 'A6.mp3', 'C7': 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3', 'A7': 'A7.mp3', 'C8': 'C8.mp3' };
export const SAMPLED_GRAND_PIANO_BASE_URL = 'https://tonejs.github.io/audio/salamander/';

// Accompaniment Synth Configs
export const ACCOMPANIMENT_SYNTH_PIANO_CONFIG: Partial<ToneSynthOptions> = {
  oscillator: { type: 'fatsawtooth', count: 3, spread: 20, phase: 0 } as any,
  envelope: { attack: 0.01, decay: 1.2, sustain: 0.3, release: 0.8, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
  volume: -8
};
export const ACCOMPANIMENT_MELLOW_SYNTH_CONFIG: Partial<ToneSynthOptions> = {
  oscillator: { type: 'fatsine', phase: 0, spread: 20, count: 3 } as any,
  envelope: { attack: 0.005, decay: 0.8, sustain: 0.1, release: 1.0, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
  volume: -7
};

export const ACCOMPANIMENT_GENERAL_SYNTH_CONFIG: Partial<ToneSynthOptions> = {
  oscillator: { type: "sawtooth", phase: 0 } as any,
  envelope: { attack: 0.02, decay: 0.5, sustain: 0.2, release: 0.5, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
  volume: -9
};
export const ACCOMPANIMENT_TRIANGLE_SYNTH_CONFIG: Partial<ToneSynthOptions> = {
  oscillator: { type: 'triangle', phase: 0 } as any,
  envelope: { attack: 0.005, decay: 0.2, sustain: 0.01, release: 0.4, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
  volume: -8
};


export const getNoteFullName = (noteName: NoteName, octave: number, transpose: number = 0): string => {
  const noteIndex = ACTIVE_NOTE_NAMES.indexOf(noteName);
  if (noteIndex === -1) return `${noteName}${octave}`;
  const transposedNoteIndex = noteIndex + transpose;
  const newOctave = octave + Math.floor(transposedNoteIndex / 12);
  const newNoteName = ACTIVE_NOTE_NAMES[(transposedNoteIndex % 12 + 12) % 12];
  return `${newNoteName}${newOctave}`;
};

export const BASE_KEYBOARD_OCTAVE = START_OCTAVE + 1;
export const KEY_MAPPING: { [key: string]: { note: NoteName; octave: number } } = {
  'z': { note: 'C', octave: BASE_KEYBOARD_OCTAVE }, 's': { note: 'C#', octave: BASE_KEYBOARD_OCTAVE }, 'x': { note: 'D', octave: BASE_KEYBOARD_OCTAVE }, 'd': { note: 'D#', octave: BASE_KEYBOARD_OCTAVE }, 'c': { note: 'E', octave: BASE_KEYBOARD_OCTAVE }, 'v': { note: 'F', octave: BASE_KEYBOARD_OCTAVE }, 'g': { note: 'F#', octave: BASE_KEYBOARD_OCTAVE }, 'b': { note: 'G', octave: BASE_KEYBOARD_OCTAVE }, 'h': { note: 'G#', octave: BASE_KEYBOARD_OCTAVE }, 'n': { note: 'A', octave: BASE_KEYBOARD_OCTAVE }, 'j': { note: 'A#', octave: BASE_KEYBOARD_OCTAVE }, 'm': { note: 'B', octave: BASE_KEYBOARD_OCTAVE },
  ',': { note: 'C', octave: BASE_KEYBOARD_OCTAVE + 1 }, 'l': { note: 'C#', octave: BASE_KEYBOARD_OCTAVE + 1 }, '.': { note: 'D', octave: BASE_KEYBOARD_OCTAVE + 1 }, ';': { note: 'D#', octave: BASE_KEYBOARD_OCTAVE + 1 }, '/': { note: 'E', octave: BASE_KEYBOARD_OCTAVE + 1 },
  'q': { note: 'C', octave: BASE_KEYBOARD_OCTAVE + 1 }, '2': { note: 'C#', octave: BASE_KEYBOARD_OCTAVE + 1 }, 'w': { note: 'D', octave: BASE_KEYBOARD_OCTAVE + 1 }, '3': { note: 'D#', octave: BASE_KEYBOARD_OCTAVE + 1 }, 'e': { note: 'E', octave: BASE_KEYBOARD_OCTAVE + 1 }, 'r': { note: 'F', octave: BASE_KEYBOARD_OCTAVE + 1 }, '5': { note: 'F#', octave: BASE_KEYBOARD_OCTAVE + 1 }, 't': { note: 'G', octave: BASE_KEYBOARD_OCTAVE + 1 }, '6': { note: 'G#', octave: BASE_KEYBOARD_OCTAVE + 1 }, 'y': { note: 'A', octave: BASE_KEYBOARD_OCTAVE + 1 }, '7': { note: 'A#', octave: BASE_KEYBOARD_OCTAVE + 1 }, 'u': { note: 'B', octave: BASE_KEYBOARD_OCTAVE + 1 },
  'i': { note: 'C', octave: BASE_KEYBOARD_OCTAVE + 2 }, '9': { note: 'C#', octave: BASE_KEYBOARD_OCTAVE + 2 }, 'o': { note: 'D', octave: BASE_KEYBOARD_OCTAVE + 2 }, '0': { note: 'D#', octave: BASE_KEYBOARD_OCTAVE + 2 }, 'p': { note: 'E', octave: BASE_KEYBOARD_OCTAVE + 2 },
  '[': { note: 'F', octave: BASE_KEYBOARD_OCTAVE + 2 }, '=': { note: 'F#', octave: BASE_KEYBOARD_OCTAVE + 2 }, ']': { note: 'G', octave: BASE_KEYBOARD_OCTAVE + 2 }, 'backspace': { note: 'G#', octave: BASE_KEYBOARD_OCTAVE + 2 }, '\\':{ note: 'A', octave: BASE_KEYBOARD_OCTAVE + 2 },
  'shift': { note: 'B', octave: BASE_KEYBOARD_OCTAVE - 1 },
  'tab': { note: 'B', octave: BASE_KEYBOARD_OCTAVE },
};

export const DEFAULT_CUSTOM_BEAT_DURATION: BeatDuration = "off";
export const BEAT_DURATION_OPTIONS: { value: BeatDuration; label: string; shortLabel: string; }[] = [
  { value: "off", label: "關閉 (Off)", shortLabel: "X" }, 
  { value: "1n", label: "全音符 (Whole)", shortLabel: "1" }, 
  { value: "2n", label: "二分音符 (Half)", shortLabel: "2" }, 
  { value: "4n", label: "四分音符 (Quarter)", shortLabel: "4" }, 
  { value: "8n", label: "八分音符 (Eighth)", shortLabel: "8" }, 
  { value: "16n", label: "十六分音符 (Sixteenth)", shortLabel: "16"},
];

export const SAVED_PROGRESSIONS_LOCAL_STORAGE_KEY = 'interactivePianoStudio_savedProgressions_v4';