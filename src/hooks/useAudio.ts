

import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import {
    ChordDefinition, AccompanimentInstrument, NoteName, UserPianoInstrument, AccompanimentRhythmPattern, BeatDuration,
    DrumInstrument, DrumPattern, BassInstrument, BassPattern, CustomDrumProgressionData, CustomDrumChordPattern
} from '../types';
import {
  getNoteFullName, DEFAULT_BPM, DEFAULT_ACCOMPANIMENT_VOLUME, DEFAULT_USER_PIANO_VOLUME, DEFAULT_ACCOMPANIMENT_INSTRUMENT,
  ACCOMPANIMENT_SYNTH_PIANO_CONFIG, ACCOMPANIMENT_MELLOW_SYNTH_CONFIG,
  USER_PIANO_SOUND_CONFIGS, DEFAULT_USER_PIANO_INSTRUMENT,
  SAMPLED_GRAND_PIANO_URLS, SAMPLED_GRAND_PIANO_BASE_URL,
  DEFAULT_ACCOMPANIMENT_RHYTHM_PATTERN, ACCOMPANIMENT_RHYTHM_PATTERN_OPTIONS,
  DRUM_SYNTH_CONFIGS, BASS_SYNTH_CONFIGS, PREDEFINED_DRUM_PATTERNS, BASS_DEFAULT_OCTAVE,
  NUM_BEATS_PER_DRUM_MEASURE, NUM_SUBDIVISIONS_PER_DRUM_BEAT,
  ACCOMPANIMENT_GENERAL_SYNTH_CONFIG, ACCOMPANIMENT_TRIANGLE_SYNTH_CONFIG
} from '../constants';
import { getChordNotes, getBassNotesForPattern } from '../utils';
import type { ChordWithIndex } from '../App';
import type { Synth, FMSynthOptions, AMSynthOptions, SynthOptions } from 'tone';

const ToneRef = Tone;
const SAMPLES_BASE_URL = `${(import.meta as any).env.BASE_URL}samples/`;

export interface UseAudioReturn {
  attackPianoNote: (noteName: NoteName, octave: number, isComputerKey?: boolean) => void;
  releasePianoNote: (noteName: NoteName, octave: number, isComputerKey?: boolean) => void;
  startAccompaniment: () => void;
  stopAccompaniment: () => void;
  setAccompanimentBPM: (bpm: number) => void;
  setAccompanimentVolume: (volume: number) => void; // Chord instrument volume
  setAccompanimentInstrument: (instrument: AccompanimentInstrument) => void;
  setAccompanimentRhythmPattern: (pattern: AccompanimentRhythmPattern) => void;
  setUserPianoInstrument: (instrument: UserPianoInstrument) => void;
  setUserPianoVolume: (volume: number) => void; // Main piano volume
  setTransposition: (semitones: number) => void;
  currentTransposition: number;
  isAccompanimentPlaying: boolean;
  currentBPM: number;
  currentVolume: number; // Chord instrument volume
  currentUserPianoVolume: number; // Main piano volume
  currentAccompanimentInstrument: AccompanimentInstrument;
  currentAccompanimentRhythmPattern: AccompanimentRhythmPattern;
  currentUserPianoInstrument: UserPianoInstrument;
  isAudioReady: boolean;
  isPianoLoading: boolean;

  // Drum properties and setters
  setDrumsEnabled: (enabled: boolean) => void;
  setDrumVolume: (volume: number) => void;
  setDrumPattern: (pattern: DrumPattern) => void;
  // Bass properties and setters
  setBassEnabled: (enabled: boolean) => void;
  setBassVolume: (volume: number) => void;
  setBassPattern: (pattern: BassPattern) => void;
  setBassInstrument: (instrument: BassInstrument) => void;
}

const ACCOMPANIMENT_BASE_OCTAVE = 3;
const PIANO_NOTE_RELEASE_TIME = 0.2;
const DRUM_NOTE_DURATION = "16n"; // Short duration for drum hits

export const useAudio = (
    progressionWithIndicesFromProps: ChordWithIndex[],
    customRhythmDataFromProps: BeatDuration[][],
    // Drum props
    drumsEnabledProp: boolean,
    drumVolumeProp: number,
    drumPatternProp: DrumPattern,
    customDrumDataProp: CustomDrumProgressionData,
    // Bass props
    bassEnabledProp: boolean,
    bassVolumeProp: number,
    bassPatternProp: BassPattern,
    bassInstrumentProp: BassInstrument,
    initialUserPianoVolume: number // Added for main piano volume
): UseAudioReturn => {
  const [isAudioReady, setIsAudioReady] = useState(false);
  const pianoSynth = useRef<(Tone.PolySynth<Tone.Synth> | Tone.Sampler) | null>(null);
  const userPianoVolumeNode = useRef<Tone.Volume | null>(null); // For main piano
  const accompanimentSynth = useRef<Tone.PolySynth<Tone.Synth | Tone.FMSynth | Tone.AMSynth> | Tone.Sampler | null>(null);
  const accompanimentVolumeNode = useRef<Tone.Volume | null>(null); // For chord instrument
  const accompanimentSequence = useRef<Tone.Sequence<ChordWithIndex> | null>(null);

  const drumSynths = useRef<Partial<Record<DrumInstrument, Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth>>>({});
  const drumVolumeNode = useRef<Tone.Volume | null>(null);
  const bassSynth = useRef<Tone.MonoSynth | Tone.Sampler | null>(null);
  const bassVolumeNode = useRef<Tone.Volume | null>(null);

  const activePianoNotesByKey = useRef<Map<string, string>>(new Map());

  const [currentTransposition, setCurrentTransposition] = useState(0);
  const [isAccompanimentPlaying, setIsAccompanimentPlaying] = useState(false);

  const [internalChordProgression, setInternalChordProgression] = useState<ChordWithIndex[]>(progressionWithIndicesFromProps);
  const customRhythmDataRef = useRef<BeatDuration[][]>(customRhythmDataFromProps);
  const customDrumDataRef = useRef<CustomDrumProgressionData>(customDrumDataProp);


  const [currentBPM, setCurrentBPM] = useState(DEFAULT_BPM);
  const [currentVolume, setCurrentVolume] = useState(DEFAULT_ACCOMPANIMENT_VOLUME); // Chord instrument
  const [currentUserPianoVolume, setCurrentUserPianoVolume] = useState(initialUserPianoVolume); // Main piano
  const [currentAccompanimentInstrument, setCurrentAccompanimentInstrument] = useState(DEFAULT_ACCOMPANIMENT_INSTRUMENT);
  const [currentAccompanimentRhythmPattern, setCurrentAccompanimentRhythmPattern] = useState(DEFAULT_ACCOMPANIMENT_RHYTHM_PATTERN);
  const [currentUserPianoInstrument, setCurrentUserPianoInstrument] = useState(DEFAULT_USER_PIANO_INSTRUMENT);
  const [isPianoLoading, setIsPianoLoading] = useState(false);

  // Refs for props to use in Tone.js callbacks
  const currentTranspositionRef = useRef(currentTransposition);
  const currentAccompanimentRhythmPatternRef = useRef(currentAccompanimentRhythmPattern);
  const currentUserPianoInstrumentRef = useRef(currentUserPianoInstrument);
  const currentAccompanimentInstrumentRef = useRef(currentAccompanimentInstrument);

  const drumsEnabledRef = useRef(drumsEnabledProp);
  const drumPatternRef = useRef(drumPatternProp);
  const bassEnabledRef = useRef(bassEnabledProp);
  const bassPatternRef = useRef(bassPatternProp);
  const bassInstrumentRef = useRef(bassInstrumentProp);


  useEffect(() => { currentTranspositionRef.current = currentTransposition; }, [currentTransposition]);
  useEffect(() => { currentAccompanimentRhythmPatternRef.current = currentAccompanimentRhythmPattern; }, [currentAccompanimentRhythmPattern]);
  useEffect(() => { currentUserPianoInstrumentRef.current = currentUserPianoInstrument; }, [currentUserPianoInstrument]);
  useEffect(() => { currentAccompanimentInstrumentRef.current = currentAccompanimentInstrument; }, [currentAccompanimentInstrument]);

  useEffect(() => { drumsEnabledRef.current = drumsEnabledProp; }, [drumsEnabledProp]);
  useEffect(() => { drumPatternRef.current = drumPatternProp; }, [drumPatternProp]);
  useEffect(() => { bassEnabledRef.current = bassEnabledProp; }, [bassEnabledProp]);
  useEffect(() => { bassPatternRef.current = bassPatternProp; }, [bassPatternProp]);
  useEffect(() => { bassInstrumentRef.current = bassInstrumentProp; }, [bassInstrumentProp]);

  useEffect(() => { setInternalChordProgression(progressionWithIndicesFromProps); }, [progressionWithIndicesFromProps]);
  useEffect(() => { customRhythmDataRef.current = customRhythmDataFromProps; }, [customRhythmDataFromProps]);
  useEffect(() => { customDrumDataRef.current = customDrumDataProp; }, [customDrumDataProp]);


  const createAccompanimentSynthInstance = useCallback((instrument: AccompanimentInstrument, volNode: Tone.Volume) => {
    let newSynth: Tone.PolySynth<Tone.Synth | Tone.FMSynth | Tone.AMSynth> | Tone.Sampler;
    switch (instrument) {
      case AccompanimentInstrument.AcousticPiano:
        newSynth = new ToneRef.Sampler({
          urls: SAMPLED_GRAND_PIANO_URLS,
          baseUrl: SAMPLED_GRAND_PIANO_BASE_URL,
          release: 1,
          volume: -3,
          onload: () => console.log('[useAudio] Accompaniment Sampler (AcousticPiano) loaded successfully.'),
          onerror: (error) => console.error('[useAudio] CRITICAL: Failed to load samples for AccompanimentInstrument.AcousticPiano:', error),
        });
        break;
      case AccompanimentInstrument.SynthPiano: newSynth = new ToneRef.PolySynth({ voice: ToneRef.Synth, options: ACCOMPANIMENT_SYNTH_PIANO_CONFIG }); break;
      case AccompanimentInstrument.MellowSynth: newSynth = new ToneRef.PolySynth({ voice: ToneRef.Synth, options: ACCOMPANIMENT_MELLOW_SYNTH_CONFIG }); break;
      case AccompanimentInstrument.SampledGuitar:
        newSynth = new ToneRef.Sampler({
          urls: { 'A3': 'guitar.wav' },
          baseUrl: SAMPLES_BASE_URL,
          release: 1,
          onload: () => console.log('[useAudio] Accompaniment Sampler (SampledGuitar) loaded successfully.'),
          onerror: (error) => console.error('[useAudio] CRITICAL: Failed to load samples for AccompanimentInstrument.SampledGuitar:', error),
        });
        break;
      case AccompanimentInstrument.StringEnsemble:
        newSynth = new ToneRef.Sampler({
            urls: { 'A4': 'strings.wav' },
            baseUrl: SAMPLES_BASE_URL,
            release: 1.5,
            onload: () => console.log('[useAudio] Accompaniment Sampler (StringEnsemble) loaded successfully.'),
            onerror: (error) => console.error('[useAudio] CRITICAL: Failed to load samples for AccompanimentInstrument.StringEnsemble:', error),
        });
        break;
      case AccompanimentInstrument.FMSynth:
        newSynth = new ToneRef.PolySynth({
            voice: ToneRef.FMSynth,
            options: { volume: -10, harmonicity: 3, modulationIndex: 10, oscillator: {type: "sine"}, envelope: {attack:0.01, decay:0.2, sustain:0.5, release:0.8}} as Partial<FMSynthOptions>
        });
        break;
      case AccompanimentInstrument.AMSynth:
        newSynth = new ToneRef.PolySynth({
            voice: ToneRef.AMSynth,
            options: { volume: -10, harmonicity: 2.5, oscillator: {type:"sawtooth"}, envelope: {attack:0.02, decay:0.3, sustain:0.4, release:0.7}} as Partial<AMSynthOptions>
        });
        break;
      case AccompanimentInstrument.Synth: newSynth = new ToneRef.PolySynth({ voice: ToneRef.Synth, options: ACCOMPANIMENT_TRIANGLE_SYNTH_CONFIG }); break;
      default: newSynth = new ToneRef.PolySynth({ voice: ToneRef.Synth, options: ACCOMPANIMENT_GENERAL_SYNTH_CONFIG });
    }
    return newSynth.connect(volNode);
  }, []);

  const createUserPianoSynthInstance = useCallback((instrument: UserPianoInstrument, volNode: Tone.Volume) => {
    if (pianoSynth.current && !(pianoSynth.current as any).disposed) {
        if (pianoSynth.current instanceof ToneRef.PolySynth) {
            pianoSynth.current.releaseAll(ToneRef.now());
        }
        pianoSynth.current.dispose();
        pianoSynth.current = null;
    }
    activePianoNotesByKey.current.clear();
    let tempSamplerRef: Tone.Sampler | null = null;
    const isSamplerInstrument = instrument === UserPianoInstrument.SampledGrand || instrument === UserPianoInstrument.SampledGuitar || instrument === UserPianoInstrument.StringEnsemble;

    const createFallbackSynth = () => {
        const isDefaultASampler = DEFAULT_USER_PIANO_INSTRUMENT === UserPianoInstrument.SampledGrand || DEFAULT_USER_PIANO_INSTRUMENT === UserPianoInstrument.SampledGuitar || DEFAULT_USER_PIANO_INSTRUMENT === UserPianoInstrument.StringEnsemble;
        const fallbackKey = isDefaultASampler ? UserPianoInstrument.ClassicGrand : DEFAULT_USER_PIANO_INSTRUMENT as Exclude<UserPianoInstrument, UserPianoInstrument.SampledGrand | UserPianoInstrument.SampledGuitar | UserPianoInstrument.StringEnsemble>;
        pianoSynth.current = new ToneRef.PolySynth<Tone.Synth>({ voice: ToneRef.Synth, options: USER_PIANO_SOUND_CONFIGS[fallbackKey] }).connect(volNode);
        setCurrentUserPianoInstrument(fallbackKey);
    }
    
    if (instrument === UserPianoInstrument.SampledGrand) {
      setIsPianoLoading(true);
      const sampler = new ToneRef.Sampler({ urls: SAMPLED_GRAND_PIANO_URLS, baseUrl: SAMPLED_GRAND_PIANO_BASE_URL, release: 1, volume: -6,
        onload: () => { if (pianoSynth.current === tempSamplerRef) setIsPianoLoading(false); },
        onerror: (error) => {
          console.error('Error loading sampled grand piano:', error);
          if (pianoSynth.current === tempSamplerRef || !pianoSynth.current) {
            setIsPianoLoading(false); if (tempSamplerRef && !(tempSamplerRef as any).disposed) tempSamplerRef.dispose();
            createFallbackSynth();
          }
        }
      }).connect(volNode);
      tempSamplerRef = sampler; pianoSynth.current = sampler; return sampler;
    } else if (instrument === UserPianoInstrument.SampledGuitar) {
      setIsPianoLoading(true);
      const sampler = new ToneRef.Sampler({ urls: { 'A3': 'guitar.wav' }, baseUrl: SAMPLES_BASE_URL, release: 1,
        onload: () => { if (pianoSynth.current === tempSamplerRef) setIsPianoLoading(false); console.log('[useAudio] User Piano Sampler (SampledGuitar) loaded successfully.'); },
        onerror: (error) => {
          console.error('Error loading sampled guitar:', error);
          if (pianoSynth.current === tempSamplerRef || !pianoSynth.current) {
            setIsPianoLoading(false); if (tempSamplerRef && !(tempSamplerRef as any).disposed) tempSamplerRef.dispose();
            createFallbackSynth();
          }
        }
      }).connect(volNode);
      tempSamplerRef = sampler; pianoSynth.current = sampler; return sampler;
    } else if (instrument === UserPianoInstrument.StringEnsemble) {
        setIsPianoLoading(true);
        const sampler = new ToneRef.Sampler({ urls: { 'A4': 'strings.wav' }, baseUrl: SAMPLES_BASE_URL, release: 1.5,
          onload: () => { if (pianoSynth.current === tempSamplerRef) setIsPianoLoading(false); console.log('[useAudio] User Piano Sampler (StringEnsemble) loaded successfully.'); },
          onerror: (error) => {
            console.error('Error loading string ensemble:', error);
            if (pianoSynth.current === tempSamplerRef || !pianoSynth.current) {
              setIsPianoLoading(false); if (tempSamplerRef && !(tempSamplerRef as any).disposed) tempSamplerRef.dispose();
              createFallbackSynth();
            }
          }
        }).connect(volNode);
        tempSamplerRef = sampler; pianoSynth.current = sampler; return sampler;
    } else {
      setIsPianoLoading(false);
      const configKey = instrument as Exclude<UserPianoInstrument, UserPianoInstrument.SampledGrand | UserPianoInstrument.SampledGuitar | UserPianoInstrument.StringEnsemble>;
      const isDefaultASampler = DEFAULT_USER_PIANO_INSTRUMENT === UserPianoInstrument.SampledGrand || DEFAULT_USER_PIANO_INSTRUMENT === UserPianoInstrument.SampledGuitar || DEFAULT_USER_PIANO_INSTRUMENT === UserPianoInstrument.StringEnsemble;
      const fallbackSynthKey = isDefaultASampler ? UserPianoInstrument.ClassicGrand : DEFAULT_USER_PIANO_INSTRUMENT as Exclude<UserPianoInstrument, UserPianoInstrument.SampledGrand | UserPianoInstrument.SampledGuitar | UserPianoInstrument.StringEnsemble>;
      const config = USER_PIANO_SOUND_CONFIGS[configKey] || USER_PIANO_SOUND_CONFIGS[fallbackSynthKey];
      const newSynth = new ToneRef.PolySynth<Tone.Synth>({ voice: ToneRef.Synth, options: config }).connect(volNode);
      pianoSynth.current = newSynth; return newSynth;
    }
  }, []);

  const createDrumSynths = useCallback((volNode: Tone.Volume) => {
    (Object.keys(DrumInstrument) as Array<keyof typeof DrumInstrument>).forEach(key => {
        const enumValue = DrumInstrument[key];
        if (drumSynths.current[enumValue] && !(drumSynths.current[enumValue] as any).disposed) {
            drumSynths.current[enumValue]!.dispose();
        }
        const config = DRUM_SYNTH_CONFIGS[enumValue];
        if (enumValue === DrumInstrument.Kick || enumValue === DrumInstrument.Tom1) {
            drumSynths.current[enumValue] = new ToneRef.MembraneSynth(config as any).connect(volNode);
        } else if (enumValue === DrumInstrument.Snare || enumValue === DrumInstrument.HiHatClosed) {
            drumSynths.current[enumValue] = new ToneRef.NoiseSynth(config as any).connect(volNode);
        } else if (enumValue === DrumInstrument.CrashCymbal) {
            drumSynths.current[enumValue] = new ToneRef.MetalSynth(config as any).connect(volNode);
        }
    });
  }, []);

  const createBassSynthInstance = useCallback((instrument: BassInstrument, volNode: Tone.Volume) => {
    if (bassSynth.current && !(bassSynth.current as any).disposed) {
        bassSynth.current.dispose();
        bassSynth.current = null;
    }

    if (instrument === BassInstrument.PopPulseBass) {
        bassSynth.current = new ToneRef.Sampler({
            urls: { 'A4': 'pop-pulse-bass.wav' },
            baseUrl: SAMPLES_BASE_URL,
            release: 0.5,
            onload: () => console.log('[useAudio] Bass Sampler (PopPulseBass) loaded successfully.'),
            onerror: (err) => console.error('[useAudio] CRITICAL: Failed to load PopPulseBass sample:', err),
        }).connect(volNode);
    } else {
        const configKey = instrument as Exclude<BassInstrument, BassInstrument.PopPulseBass>;
        const config = BASS_SYNTH_CONFIGS[configKey] || BASS_SYNTH_CONFIGS[BassInstrument.ElectricBass];
        bassSynth.current = new ToneRef.MonoSynth(config as any).connect(volNode);
    }
    return bassSynth.current;
  }, []);


  const initializeAudio = useCallback(async () => {
    if (!ToneRef) return false; if (isAudioReady) return true;
    try {
      await ToneRef.start();
      // Main Piano Volume and Synth
      if (!userPianoVolumeNode.current || userPianoVolumeNode.current.disposed) userPianoVolumeNode.current = new ToneRef.Volume(currentUserPianoVolume).toDestination();
      if (!pianoSynth.current || (pianoSynth.current as any).disposed) createUserPianoSynthInstance(currentUserPianoInstrumentRef.current, userPianoVolumeNode.current);

      // Accompaniment Volume and Synth
      if (!accompanimentVolumeNode.current || accompanimentVolumeNode.current.disposed) accompanimentVolumeNode.current = new ToneRef.Volume(currentVolume).toDestination();
      if (!accompanimentSynth.current || (accompanimentSynth.current as any).disposed) accompanimentSynth.current = createAccompanimentSynthInstance(currentAccompanimentInstrumentRef.current, accompanimentVolumeNode.current);

      // Drums Volume and Synths
      if (!drumVolumeNode.current || drumVolumeNode.current.disposed) drumVolumeNode.current = new ToneRef.Volume(drumVolumeProp).toDestination();
      createDrumSynths(drumVolumeNode.current);

      // Bass Volume and Synth
      if (!bassVolumeNode.current || bassVolumeNode.current.disposed) bassVolumeNode.current = new ToneRef.Volume(bassVolumeProp).toDestination();
      if (!bassSynth.current || (bassSynth.current as any).disposed) createBassSynthInstance(bassInstrumentRef.current, bassVolumeNode.current);

      ToneRef.Transport.bpm.value = currentBPM; ToneRef.Transport.timeSignature = 4; setIsAudioReady(true); return true;
    } catch (e) { console.error("Error starting Tone.js or initializing synths:", e); setIsAudioReady(false); return false; }
  }, [isAudioReady, currentBPM, currentVolume, currentUserPianoVolume, createAccompanimentSynthInstance, createUserPianoSynthInstance, createDrumSynths, drumVolumeProp, createBassSynthInstance, bassVolumeProp]);

  const stopAccompaniment = useCallback(() => {
    if (!ToneRef) return;
    setIsAccompanimentPlaying(false);
    if (ToneRef.Transport.state === 'started') ToneRef.Transport.stop(ToneRef.now());

    if (accompanimentSynth.current && !(accompanimentSynth.current as any).disposed) {
        if (accompanimentSynth.current instanceof ToneRef.PolySynth || accompanimentSynth.current instanceof ToneRef.Sampler) {
            (accompanimentSynth.current as Tone.PolySynth<Tone.Synth | Tone.FMSynth | Tone.AMSynth> | Tone.Sampler).releaseAll(ToneRef.now());
        }
    }
    if(bassSynth.current && !(bassSynth.current as any).disposed) {
        if (bassSynth.current instanceof ToneRef.Sampler) {
            bassSynth.current.releaseAll(ToneRef.now());
        } else { // It's a MonoSynth
            (bassSynth.current as Tone.MonoSynth).triggerRelease(ToneRef.now());
        }
    }
  }, []);


  useEffect(() => { // Main Accompaniment Sequence Logic
    if (!isAudioReady || !ToneRef ) {
        if (accompanimentSequence.current) { accompanimentSequence.current.stop(0); accompanimentSequence.current.dispose(); accompanimentSequence.current = null; }
        return;
    }
    if (accompanimentSequence.current) { accompanimentSequence.current.stop(0); accompanimentSequence.current.dispose(); accompanimentSequence.current = null; }

    if (internalChordProgression.length > 0) {
      const newSequence = new ToneRef.Sequence<ChordWithIndex>(
        (scheduledTimeInSeconds, chordDef) => {
          // Chord Accompaniment
          if (accompanimentSynth.current && !(accompanimentSynth.current as any).disposed && currentAccompanimentRhythmPatternRef.current !== AccompanimentRhythmPattern.Custom) {
            const notes = getChordNotes(chordDef.root, chordDef.type, ACCOMPANIMENT_BASE_OCTAVE, currentTranspositionRef.current);
            const patternConfig = ACCOMPANIMENT_RHYTHM_PATTERN_OPTIONS.find(p => p.value === currentAccompanimentRhythmPatternRef.current);
            if (notes.length > 0 && patternConfig && patternConfig.hits) {
              patternConfig.hits.forEach(hit => {
                const offset = ToneRef.Time(hit.offset as Tone.Unit.Time).toSeconds();
                accompanimentSynth.current!.triggerAttackRelease(notes as any, hit.duration, scheduledTimeInSeconds + offset);
              });
            }
          } else if (accompanimentSynth.current && !(accompanimentSynth.current as any).disposed && currentAccompanimentRhythmPatternRef.current === AccompanimentRhythmPattern.Custom) {
             const notes = getChordNotes(chordDef.root, chordDef.type, ACCOMPANIMENT_BASE_OCTAVE, currentTranspositionRef.current);
             const customChordBeatsConfig = customRhythmDataRef.current[chordDef.originalIndex];
             if (notes.length > 0 && customChordBeatsConfig) {
                for (let mainBeatIdx = 0; mainBeatIdx < 4; mainBeatIdx++) {
                    const fillType = customChordBeatsConfig[mainBeatIdx];
                    if (fillType === "off") continue;
                    const actualDuration: Tone.Unit.Time = fillType;
                    const hitTimeOffsetSeconds = ToneRef.Time(`0:${mainBeatIdx}:0`).toSeconds();
                    const absTime = scheduledTimeInSeconds + hitTimeOffsetSeconds;
                    accompanimentSynth.current!.triggerAttackRelease(notes as any, actualDuration, absTime);
                }
             }
          }

          // Drum Accompaniment
          if (drumsEnabledRef.current && drumPatternRef.current !== DrumPattern.Off) {
            let currentDrumPatternForChord: CustomDrumChordPattern | undefined = undefined;
            if (drumPatternRef.current === DrumPattern.Custom) {
              currentDrumPatternForChord = customDrumDataRef.current[chordDef.originalIndex];
            } else {
              currentDrumPatternForChord = PREDEFINED_DRUM_PATTERNS[drumPatternRef.current];
            }

            if (currentDrumPatternForChord) {
              for (let beat = 0; beat < NUM_BEATS_PER_DRUM_MEASURE; beat++) {
                for (let sub = 0; sub < NUM_SUBDIVISIONS_PER_DRUM_BEAT; sub++) {
                  const subdivisionOffset = ToneRef.Time(`0:${beat}:${sub}`).toSeconds();
                  const drumHitTime = scheduledTimeInSeconds + subdivisionOffset;
                  (Object.keys(DrumInstrument) as Array<keyof typeof DrumInstrument>).forEach(key => {
                    const drumInst = DrumInstrument[key];
                    if (currentDrumPatternForChord && currentDrumPatternForChord[drumInst]?.[beat]?.[sub]) {
                      const synth = drumSynths.current[drumInst];
                      if (synth && !(synth as any).disposed) {
                        if (drumInst === DrumInstrument.Kick) {
                            synth.triggerAttackRelease("C2", DRUM_NOTE_DURATION, drumHitTime);
                        } else if (drumInst === DrumInstrument.Tom1) {
                            synth.triggerAttackRelease("G2", DRUM_NOTE_DURATION, drumHitTime);
                        } else if (drumInst === DrumInstrument.CrashCymbal) {
                            ToneRef.Draw.schedule(() => {
                                if (synth && !(synth as any).disposed) {
                                    (synth as Tone.MetalSynth).triggerAttack(drumHitTime);
                                }
                            }, drumHitTime);
                        } else {
                            synth.triggerAttackRelease(DRUM_NOTE_DURATION, drumHitTime);
                        }
                      }
                    }
                  });
                }
              }
            }
          }

          // Bass Accompaniment
          if (bassEnabledRef.current && bassSynth.current && !(bassSynth.current as any).disposed && bassPatternRef.current !== BassPattern.Off) {
            const bassNotes = getBassNotesForPattern(chordDef, bassPatternRef.current, BASS_DEFAULT_OCTAVE, currentTranspositionRef.current);
            bassNotes.forEach(bassNoteEvent => {
              const offset = ToneRef.Time(bassNoteEvent.timeOffset).toSeconds();
              bassSynth.current!.triggerAttackRelease(bassNoteEvent.note, bassNoteEvent.duration, scheduledTimeInSeconds + offset);
            });
          }
        },
        internalChordProgression, "1m"
      );
      newSequence.loop = true; accompanimentSequence.current = newSequence;
      if (isAccompanimentPlaying && ToneRef.Transport.state !== 'started') { ToneRef.Transport.start(ToneRef.now() + 0.1); newSequence.start(ToneRef.Transport.seconds + 0.15); }
      else if (isAccompanimentPlaying && newSequence.state !== 'started') { newSequence.start(ToneRef.Transport.seconds + 0.05); }

    } else if (isAccompanimentPlaying) { stopAccompaniment(); }
  }, [
    internalChordProgression, isAudioReady, isAccompanimentPlaying,
    stopAccompaniment
  ]);

  const attackPianoNote = useCallback((noteName: NoteName, octave: number, isComputerKey: boolean = false) => {
     const play = () => { if (pianoSynth.current && !(pianoSynth.current as any).disposed && ToneRef && !isPianoLoading) { const fullName = getNoteFullName(noteName, octave, currentTranspositionRef.current); pianoSynth.current.triggerAttack(fullName as any, ToneRef.now()); if (isComputerKey) activePianoNotesByKey.current.set(`${noteName}${octave}`, fullName); } else if (!isPianoLoading) { initializeAudio().then(success => { if(success && pianoSynth.current && !(pianoSynth.current as any).disposed && !isPianoLoading){ const fullName = getNoteFullName(noteName, octave, currentTranspositionRef.current); pianoSynth.current.triggerAttack(fullName as any, ToneRef.now()); if (isComputerKey) activePianoNotesByKey.current.set(`${noteName}${octave}`, fullName);}});}};
     if (!isAudioReady) initializeAudio().then(success => { if (success && !isPianoLoading) play(); }); else if (!isPianoLoading) play();
  }, [isAudioReady, initializeAudio, isPianoLoading]);

  const releasePianoNote = useCallback((noteName: NoteName, octave: number, isComputerKey: boolean = false) => {
    let noteToRelease: string | null = null; const keyStr = `${noteName}${octave}`;
    if (isComputerKey) { noteToRelease = getNoteFullName(noteName, octave, currentTranspositionRef.current); if (activePianoNotesByKey.current.has(keyStr)) activePianoNotesByKey.current.delete(keyStr); }
    else { noteToRelease = getNoteFullName(noteName, octave, currentTranspositionRef.current); }
    if (noteToRelease && pianoSynth.current && !(pianoSynth.current as any).disposed && ToneRef && !isPianoLoading) pianoSynth.current.triggerRelease([noteToRelease] as any, ToneRef.now() + PIANO_NOTE_RELEASE_TIME);
  }, [isPianoLoading]);

  const startAccompaniment = useCallback(async () => {
    if (!ToneRef) return; const ready = isAudioReady ? true : await initializeAudio(); if (!ready) return;
    if (internalChordProgression.length === 0) return;
    if (!isAccompanimentPlaying) setIsAccompanimentPlaying(true);
    else if (ToneRef.Transport.state !== 'started') { ToneRef.Transport.start(ToneRef.now() + 0.05); if (accompanimentSequence.current && accompanimentSequence.current.state !== 'started') accompanimentSequence.current.start(ToneRef.Transport.seconds + 0.1); }
  }, [isAudioReady, initializeAudio, internalChordProgression.length, isAccompanimentPlaying]);

  const setAccompanimentBPM = useCallback((bpm: number) => { setCurrentBPM(bpm); if (isAudioReady && ToneRef) ToneRef.Transport.bpm.value = bpm; }, [isAudioReady]);
  const setAccompanimentVolume = useCallback((volume: number) => { setCurrentVolume(volume); if (isAudioReady && accompanimentVolumeNode.current && !accompanimentVolumeNode.current.disposed) accompanimentVolumeNode.current.volume.value = volume; }, [isAudioReady]);
  const setUserPianoVolume = useCallback((volume: number) => { setCurrentUserPianoVolume(volume); if (isAudioReady && userPianoVolumeNode.current && !userPianoVolumeNode.current.disposed) userPianoVolumeNode.current.volume.value = volume; }, [isAudioReady]);

  const setAccompanimentInstrument = useCallback((instrument: AccompanimentInstrument) => {
    if (currentAccompanimentInstrumentRef.current === instrument) return;
    setCurrentAccompanimentInstrument(instrument);
    if (isAudioReady && accompanimentVolumeNode.current && ToneRef && !accompanimentVolumeNode.current.disposed) {
      if (accompanimentSequence.current) accompanimentSequence.current.stop(0);
      if (accompanimentSynth.current && !(accompanimentSynth.current as any).disposed) {
        if (accompanimentSynth.current instanceof ToneRef.PolySynth || accompanimentSynth.current instanceof ToneRef.Sampler) {
          (accompanimentSynth.current as Tone.PolySynth<Tone.Synth | Tone.FMSynth | Tone.AMSynth> | Tone.Sampler).releaseAll?.(ToneRef.now());
        }
        accompanimentSynth.current.dispose();
      }
      accompanimentSynth.current = createAccompanimentSynthInstance(instrument, accompanimentVolumeNode.current);
    }
  }, [isAudioReady, createAccompanimentSynthInstance]);

  const setAccompanimentRhythmPattern = useCallback((pattern: AccompanimentRhythmPattern) => { setCurrentAccompanimentRhythmPattern(pattern); }, []);

  const setUserPianoInstrument = useCallback((instrument: UserPianoInstrument) => {
    if (currentUserPianoInstrumentRef.current === instrument && !isPianoLoading) return; setCurrentUserPianoInstrument(instrument);
    if (isAudioReady && ToneRef && userPianoVolumeNode.current && !userPianoVolumeNode.current.disposed) {
         createUserPianoSynthInstance(instrument, userPianoVolumeNode.current);
    } else if (!isAudioReady && (instrument === UserPianoInstrument.SampledGrand || instrument === UserPianoInstrument.SampledGuitar || instrument === UserPianoInstrument.StringEnsemble)) {
        setIsPianoLoading(true); // Will be handled by initializeAudio
    }
  }, [isAudioReady, createUserPianoSynthInstance, isPianoLoading]);

  const setTransposition = useCallback((semitones: number) => {
    if (pianoSynth.current && !(pianoSynth.current as any).disposed && ToneRef && !isPianoLoading && pianoSynth.current instanceof ToneRef.PolySynth) {
      pianoSynth.current.releaseAll(ToneRef.now());
    }
    activePianoNotesByKey.current.clear();
    setCurrentTransposition(semitones);
  }, [isPianoLoading]);

  // New setters for drums and bass
  const setDrumsEnabled = useCallback((enabled: boolean) => { drumsEnabledRef.current = enabled; }, []);
  const setDrumVolume = useCallback((volume: number) => { if (isAudioReady && drumVolumeNode.current && !drumVolumeNode.current.disposed) drumVolumeNode.current.volume.value = volume; }, [isAudioReady]);
  const setDrumPattern = useCallback((pattern: DrumPattern) => { drumPatternRef.current = pattern; }, []);

  const setBassEnabled = useCallback((enabled: boolean) => { bassEnabledRef.current = enabled; }, []);
  const setBassVolume = useCallback((volume: number) => { if (isAudioReady && bassVolumeNode.current && !bassVolumeNode.current.disposed) bassVolumeNode.current.volume.value = volume; }, [isAudioReady]);
  const setBassPattern = useCallback((pattern: BassPattern) => { bassPatternRef.current = pattern; }, []);
  const setBassInstrument = useCallback((instrument: BassInstrument) => {
    bassInstrumentRef.current = instrument;
    if (isAudioReady && bassVolumeNode.current && ToneRef && !bassVolumeNode.current.disposed) {
      createBassSynthInstance(instrument, bassVolumeNode.current);
    }
  }, [isAudioReady, createBassSynthInstance]);


  useEffect(() => { // Master cleanup
    return () => {
      if (ToneRef) { if (ToneRef.Transport.state !== 'stopped') ToneRef.Transport.stop(); ToneRef.Transport.cancel(); }
      if (pianoSynth.current && !(pianoSynth.current as any).disposed) {
        if (pianoSynth.current instanceof ToneRef.PolySynth) pianoSynth.current.releaseAll(ToneRef.now());
        pianoSynth.current.dispose();
      }
      if (userPianoVolumeNode.current && !userPianoVolumeNode.current.disposed) userPianoVolumeNode.current.dispose();
      if (accompanimentSynth.current && !(accompanimentSynth.current as any).disposed) {
        if (accompanimentSynth.current instanceof ToneRef.PolySynth || accompanimentSynth.current instanceof ToneRef.Sampler ) {
           (accompanimentSynth.current as Tone.PolySynth<Tone.Synth | Tone.FMSynth | Tone.AMSynth> | Tone.Sampler).releaseAll?.(ToneRef.now());
        }
        accompanimentSynth.current.dispose();
      }
      if (accompanimentVolumeNode.current && !accompanimentVolumeNode.current.disposed) accompanimentVolumeNode.current.dispose();
      if (drumVolumeNode.current && !drumVolumeNode.current.disposed) drumVolumeNode.current.dispose();
      (Object.values(drumSynths.current) as (Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth)[])
        .filter(synth => synth && !(synth as any).disposed)
        .forEach(synth => synth.dispose());
      if (bassSynth.current && !(bassSynth.current as any).disposed) bassSynth.current.dispose();
      if (bassVolumeNode.current && !bassVolumeNode.current.disposed) bassVolumeNode.current.dispose();
      if (accompanimentSequence.current) { accompanimentSequence.current.stop(0); accompanimentSequence.current.clear(); accompanimentSequence.current.dispose(); }
      activePianoNotesByKey.current.clear();
    };
  }, []);

  return {
    attackPianoNote, releasePianoNote, startAccompaniment, stopAccompaniment,
    setAccompanimentBPM, setAccompanimentVolume, setAccompanimentInstrument, setAccompanimentRhythmPattern,
    setUserPianoInstrument, setUserPianoVolume, setTransposition,
    currentTransposition, isAccompanimentPlaying, currentBPM, currentVolume, currentUserPianoVolume,
    currentAccompanimentInstrument, currentAccompanimentRhythmPattern, currentUserPianoInstrument,
    isAudioReady, isPianoLoading,
    // Drum setters
    setDrumsEnabled, setDrumVolume, setDrumPattern,
    // Bass setters
    setBassEnabled, setBassVolume, setBassPattern, setBassInstrument,
  };
};