
import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import {
    ChordDefinition, AccompanimentInstrument, NoteName, UserPianoInstrument, AccompanimentRhythmPattern, BeatDuration,
    DrumInstrument, DrumPattern, BassInstrument, BassPattern, CustomDrumProgressionData, CustomDrumChordPattern,
    AccompanimentLayer, AiNoteEvent
} from '../types';
import {
  getNoteFullName, DEFAULT_BPM, DEFAULT_USER_PIANO_VOLUME,
  ACCOMPANIMENT_SYNTH_PIANO_CONFIG, ACCOMPANIMENT_MELLOW_SYNTH_CONFIG,
  USER_PIANO_SOUND_CONFIGS, DEFAULT_USER_PIANO_INSTRUMENT,
  SAMPLED_GRAND_PIANO_URLS, SAMPLED_GRAND_PIANO_BASE_URL,
  ACCOMPANIMENT_RHYTHM_PATTERN_OPTIONS,
  DRUM_SYNTH_CONFIGS, BASS_SYNTH_CONFIGS, PREDEFINED_DRUM_PATTERNS, BASS_DEFAULT_OCTAVE,
  NUM_BEATS_PER_DRUM_MEASURE, NUM_SUBDIVISIONS_PER_DRUM_BEAT,
  ACCOMPANIMENT_GENERAL_SYNTH_CONFIG, ACCOMPANIMENT_TRIANGLE_SYNTH_CONFIG, ACCOMPANIMENT_BASE_OCTAVE
} from '../constants';
import { getChordNotes, getBassNotesForPattern } from '../utils';
import type { ChordWithIndex } from '../App';
import type { Synth, FMSynthOptions, AMSynthOptions, SynthOptions } from 'tone';

const ToneRef = Tone;
// Use Vite's env variable for robust pathing in different deployment scenarios (root vs. subdirectory)
const SAMPLES_BASE_URL = `${(import.meta as any).env.BASE_URL || ''}samples/`;

type AccompanimentSynthMapEntry = {
  synth: Tone.PolySynth<Tone.Synth | Tone.FMSynth | Tone.AMSynth> | Tone.Sampler;
  volumeNode: Tone.Volume;
  instrument: AccompanimentInstrument;
};

export interface UseAudioReturn {
  attackPianoNote: (noteName: NoteName, octave: number, isComputerKey?: boolean) => void;
  releasePianoNote: (noteName: NoteName, octave: number, isComputerKey?: boolean) => void;
  startAccompaniment: () => void;
  stopAccompaniment: () => void;
  setAccompanimentBPM: (bpm: number) => void;
  setUserPianoInstrument: (instrument: UserPianoInstrument) => void;
  setUserPianoVolume: (volume: number) => void; // Main piano volume
  setTransposition: (semitones: number) => void;
  currentTransposition: number;
  isAccompanimentPlaying: boolean;
  currentBPM: number;
  currentUserPianoVolume: number; // Main piano volume
  currentUserPianoInstrument: UserPianoInstrument;
  isAudioReady: boolean;
  isPianoLoading: boolean;

  // Effects & Groove Setters
  setReverbLevel: (level: number) => void;
  setDelayLevel: (level: number) => void;
  setSwing: (amount: number) => void;

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

const PIANO_NOTE_RELEASE_TIME = 0.2;
const DRUM_NOTE_DURATION = "16n"; // Short duration for drum hits

export const useAudio = (
    progressionWithIndicesFromProps: ChordWithIndex[],
    customRhythmsFromProps: Record<string, BeatDuration[][]>,
    accompanimentLayersProp: AccompanimentLayer[],
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
    aiBassEventsProp: AiNoteEvent[] | null,
    initialUserPianoVolume: number,
    // New callbacks
    setCurrentlyPlayingChordIndex: (index: number | null) => void,
    setBeatVisual: (active: boolean) => void,
    setAccompanimentNotes: React.Dispatch<React.SetStateAction<Set<string>>>,
    showAccompanimentNotes: boolean
): UseAudioReturn => {
  const [isAudioReady, setIsAudioReady] = useState(false);
  const pianoSynth = useRef<(Tone.PolySynth<Tone.Synth> | Tone.Sampler) | null>(null);
  const userPianoVolumeNode = useRef<Tone.Volume | null>(null);
  
  const accompanimentSynths = useRef<Map<string, AccompanimentSynthMapEntry>>(new Map());
  const accompanimentSequence = useRef<Tone.Sequence<ChordWithIndex> | null>(null);

  const drumSynths = useRef<Partial<Record<DrumInstrument, Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth>>>({});
  const drumVolumeNode = useRef<Tone.Volume | null>(null);
  const bassSynth = useRef<Tone.MonoSynth | Tone.Sampler | null>(null);
  const bassVolumeNode = useRef<Tone.Volume | null>(null);
  const aiBassPart = useRef<Tone.Part | null>(null);

  // Global Effects
  const globalReverb = useRef<Tone.Reverb | null>(null);
  const globalDelay = useRef<Tone.FeedbackDelay | null>(null);

  const beatVisualizerLoop = useRef<Tone.Loop | null>(null);

  const activePianoNotesByKey = useRef<Map<string, string>>(new Map());

  const [currentTransposition, setCurrentTransposition] = useState(0);
  const [isAccompanimentPlaying, setIsAccompanimentPlaying] = useState(false);

  const [internalChordProgression, setInternalChordProgression] = useState<ChordWithIndex[]>(progressionWithIndicesFromProps);
  const customRhythmsRef = useRef<Record<string, BeatDuration[][]>>(customRhythmsFromProps);
  const customDrumDataRef = useRef<CustomDrumProgressionData>(customDrumDataProp);


  const [currentBPM, setCurrentBPM] = useState(DEFAULT_BPM);
  const [currentUserPianoVolume, setCurrentUserPianoVolume] = useState(initialUserPianoVolume); // Main piano
  const [currentUserPianoInstrument, setCurrentUserPianoInstrument] = useState(DEFAULT_USER_PIANO_INSTRUMENT);
  const [isPianoLoading, setIsPianoLoading] = useState(false);

  // Refs for props to use in Tone.js callbacks
  const currentTranspositionRef = useRef(currentTransposition);
  const currentUserPianoInstrumentRef = useRef(currentUserPianoInstrument);
  const accompanimentLayersRef = useRef(accompanimentLayersProp);

  const drumsEnabledRef = useRef(drumsEnabledProp);
  const drumPatternRef = useRef(drumPatternProp);
  const bassEnabledRef = useRef(bassEnabledProp);
  const bassPatternRef = useRef(bassPatternProp);
  const bassInstrumentRef = useRef(bassInstrumentProp);
  const showAccompanimentNotesRef = useRef(showAccompanimentNotes);
  const aiBassEventsRef = useRef(aiBassEventsProp);


  useEffect(() => { currentTranspositionRef.current = currentTransposition; }, [currentTransposition]);
  useEffect(() => { currentUserPianoInstrumentRef.current = currentUserPianoInstrument; }, [currentUserPianoInstrument]);
  useEffect(() => { accompanimentLayersRef.current = accompanimentLayersProp; }, [accompanimentLayersProp]);

  useEffect(() => { drumsEnabledRef.current = drumsEnabledProp; }, [drumsEnabledProp]);
  useEffect(() => { drumPatternRef.current = drumPatternProp; }, [drumPatternProp]);
  useEffect(() => { bassEnabledRef.current = bassEnabledProp; }, [bassEnabledProp]);
  useEffect(() => { bassPatternRef.current = bassPatternProp; }, [bassPatternProp]);
  useEffect(() => { bassInstrumentRef.current = bassInstrumentProp; }, [bassInstrumentProp]);
  useEffect(() => { showAccompanimentNotesRef.current = showAccompanimentNotes; }, [showAccompanimentNotes]);
  useEffect(() => { aiBassEventsRef.current = aiBassEventsProp; }, [aiBassEventsProp]);

  useEffect(() => { setInternalChordProgression(progressionWithIndicesFromProps); }, [progressionWithIndicesFromProps]);
  useEffect(() => { customRhythmsRef.current = customRhythmsFromProps; }, [customRhythmsFromProps]);
  useEffect(() => { customDrumDataRef.current = customDrumDataProp; }, [customDrumDataProp]);


  const createAccompanimentSynthInstance = useCallback((instrument: AccompanimentInstrument) => {
    let newSynth: Tone.PolySynth<Tone.Synth | Tone.FMSynth | Tone.AMSynth> | Tone.Sampler;
    switch (instrument) {
      case AccompanimentInstrument.AcousticPiano:
        newSynth = new ToneRef.Sampler({
          urls: SAMPLED_GRAND_PIANO_URLS, baseUrl: SAMPLED_GRAND_PIANO_BASE_URL, release: 1, volume: -3,
          onerror: (error) => console.error('[useAudio] CRITICAL: Failed to load samples for AccompanimentInstrument.AcousticPiano:', error),
        });
        break;
      case AccompanimentInstrument.SynthPiano: newSynth = new ToneRef.PolySynth({ voice: ToneRef.Synth, options: ACCOMPANIMENT_SYNTH_PIANO_CONFIG }); break;
      case AccompanimentInstrument.MellowSynth: newSynth = new ToneRef.PolySynth({ voice: ToneRef.Synth, options: ACCOMPANIMENT_MELLOW_SYNTH_CONFIG }); break;
      case AccompanimentInstrument.SampledGuitar:
        newSynth = new ToneRef.Sampler({
          urls: { 'A3': 'guitar.wav' }, baseUrl: SAMPLES_BASE_URL, release: 1,
          onerror: (error) => console.error('[useAudio] CRITICAL: Failed to load samples for AccompanimentInstrument.SampledGuitar:', error),
        });
        break;
      case AccompanimentInstrument.StringEnsemble:
        newSynth = new ToneRef.Sampler({
            urls: { 'A4': 'strings.wav' }, baseUrl: SAMPLES_BASE_URL, release: 1.5,
            onerror: (error) => console.error('[useAudio] CRITICAL: Failed to load samples for AccompanimentInstrument.StringEnsemble:', error),
        });
        break;
      case AccompanimentInstrument.FMSynth:
        newSynth = new ToneRef.PolySynth({ voice: ToneRef.FMSynth, options: { volume: -10, harmonicity: 3, modulationIndex: 10, oscillator: {type: "sine"}, envelope: {attack:0.01, decay:0.2, sustain:0.5, release:0.8}} as Partial<FMSynthOptions> });
        break;
      case AccompanimentInstrument.AMSynth:
        newSynth = new ToneRef.PolySynth({ voice: ToneRef.AMSynth, options: { volume: -10, harmonicity: 2.5, oscillator: {type:"sawtooth"}, envelope: {attack:0.02, decay:0.3, sustain:0.4, release:0.7}} as Partial<AMSynthOptions> });
        break;
      case AccompanimentInstrument.Synth: newSynth = new ToneRef.PolySynth({ voice: ToneRef.Synth, options: ACCOMPANIMENT_TRIANGLE_SYNTH_CONFIG }); break;
      default: newSynth = new ToneRef.PolySynth({ voice: ToneRef.Synth, options: ACCOMPANIMENT_GENERAL_SYNTH_CONFIG });
    }
    return newSynth;
  }, []);

  const connectToEffects = useCallback((node: Tone.Volume) => {
    if (globalReverb.current) node.connect(globalReverb.current);
    if (globalDelay.current) node.connect(globalDelay.current);
  }, []);
  
  useEffect(() => {
    if (!isAudioReady) return;

    const synthMap = accompanimentSynths.current;
    const newLayerIds = new Set(accompanimentLayersProp.map(l => l.id));

    // Remove synths for deleted layers
    for (const id of synthMap.keys()) {
        if (!newLayerIds.has(id)) {
            const entry = synthMap.get(id);
            if (entry) {
                entry.synth.dispose();
                entry.volumeNode.dispose();
            }
            synthMap.delete(id);
        }
    }

    // Add or update synths for current layers
    accompanimentLayersProp.forEach(layer => {
        const existingEntry = synthMap.get(layer.id);

        if (existingEntry) {
            // Update existing synth
            existingEntry.volumeNode.volume.linearRampTo(layer.volume, 0.1);
            if (existingEntry.instrument !== layer.instrument) {
                existingEntry.synth.dispose();
                const newSynth = createAccompanimentSynthInstance(layer.instrument).connect(existingEntry.volumeNode);
                synthMap.set(layer.id, { ...existingEntry, synth: newSynth, instrument: layer.instrument });
            }
        } else {
            // Add new synth
            const volumeNode = new ToneRef.Volume(layer.volume);
            connectToEffects(volumeNode);
            volumeNode.toDestination(); // Also connect directly to destination
            const synth = createAccompanimentSynthInstance(layer.instrument).connect(volumeNode);
            synthMap.set(layer.id, { synth, volumeNode, instrument: layer.instrument });
        }
    });

  }, [accompanimentLayersProp, isAudioReady, createAccompanimentSynthInstance, connectToEffects]);

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
    
    const createFallbackSynth = () => {
        const isDefaultASampler = [UserPianoInstrument.SampledGrand, UserPianoInstrument.SampledGuitar, UserPianoInstrument.StringEnsemble].includes(DEFAULT_USER_PIANO_INSTRUMENT);
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
      const isDefaultASampler = [UserPianoInstrument.SampledGrand, UserPianoInstrument.SampledGuitar, UserPianoInstrument.StringEnsemble].includes(DEFAULT_USER_PIANO_INSTRUMENT);
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

  useEffect(() => {
    if (isAudioReady && bassVolumeNode.current && !bassVolumeNode.current.disposed) {
        createBassSynthInstance(bassInstrumentProp, bassVolumeNode.current);
    }
  }, [bassInstrumentProp, isAudioReady, createBassSynthInstance]);


  const initializeAudio = useCallback(async () => {
    if (!ToneRef) return false; if (isAudioReady) return true;
    try {
      await ToneRef.start();
      
      // Global Effects
      if (!globalReverb.current || globalReverb.current.disposed) {
        globalReverb.current = new ToneRef.Reverb({ decay: 7, wet: 0 }).toDestination();
      }
      if (!globalDelay.current || globalDelay.current.disposed) {
        globalDelay.current = new ToneRef.FeedbackDelay({delayTime: "8n.", feedback: 0.7}).toDestination();
        globalDelay.current.wet.value = 0;
      }
      
      // Main Piano Volume and Synth
      if (!userPianoVolumeNode.current || userPianoVolumeNode.current.disposed) {
        userPianoVolumeNode.current = new ToneRef.Volume(currentUserPianoVolume);
        connectToEffects(userPianoVolumeNode.current);
        userPianoVolumeNode.current.toDestination();
      }
      if (!pianoSynth.current || (pianoSynth.current as any).disposed) createUserPianoSynthInstance(currentUserPianoInstrumentRef.current, userPianoVolumeNode.current);

      // Accompaniment Layers (initial setup)
      accompanimentLayersRef.current.forEach(layer => {
        if (!accompanimentSynths.current.has(layer.id)) {
            const volumeNode = new ToneRef.Volume(layer.volume);
            connectToEffects(volumeNode);
            volumeNode.toDestination();
            const synth = createAccompanimentSynthInstance(layer.instrument).connect(volumeNode);
            accompanimentSynths.current.set(layer.id, { synth, volumeNode, instrument: layer.instrument });
        }
      });

      // Drums Volume and Synths
      if (!drumVolumeNode.current || drumVolumeNode.current.disposed) {
        drumVolumeNode.current = new ToneRef.Volume(drumVolumeProp);
        connectToEffects(drumVolumeNode.current);
        drumVolumeNode.current.toDestination();
      }
      createDrumSynths(drumVolumeNode.current);

      // Bass Volume and Synth
      if (!bassVolumeNode.current || bassVolumeNode.current.disposed) {
        bassVolumeNode.current = new ToneRef.Volume(bassVolumeProp);
        connectToEffects(bassVolumeNode.current);
        bassVolumeNode.current.toDestination();
      }
      if (!bassSynth.current || (bassSynth.current as any).disposed) createBassSynthInstance(bassInstrumentRef.current, bassVolumeNode.current);

      // BPM Visualizer Loop
      if (!beatVisualizerLoop.current) {
        beatVisualizerLoop.current = new ToneRef.Loop(time => {
            ToneRef.Draw.schedule(() => {
                setBeatVisual(true);
                setTimeout(() => setBeatVisual(false), 50);
            }, time);
        }, "4n").start(0);
      }

      ToneRef.Transport.bpm.value = currentBPM; ToneRef.Transport.timeSignature = 4; setIsAudioReady(true); return true;
    } catch (e) { console.error("Error starting Tone.js or initializing synths:", e); setIsAudioReady(false); return false; }
  }, [isAudioReady, currentBPM, currentUserPianoVolume, createAccompanimentSynthInstance, createUserPianoSynthInstance, createDrumSynths, drumVolumeProp, createBassSynthInstance, bassVolumeProp, connectToEffects, setBeatVisual]);

  const stopAccompaniment = useCallback(() => {
    if (!ToneRef) return;
    setIsAccompanimentPlaying(false);
    setCurrentlyPlayingChordIndex(null);
    if (ToneRef.Transport.state === 'started') ToneRef.Transport.stop(ToneRef.now());
    setAccompanimentNotes(new Set()); // Clear highlighted notes on stop

    accompanimentSynths.current.forEach(entry => {
        entry.synth.releaseAll(ToneRef.now());
    });
    
    if(bassSynth.current && !(bassSynth.current as any).disposed) {
        if (bassSynth.current instanceof ToneRef.Sampler) {
            bassSynth.current.releaseAll(ToneRef.now());
        } else { // It's a MonoSynth
            (bassSynth.current as Tone.MonoSynth).triggerRelease(ToneRef.now());
        }
    }
    if (aiBassPart.current) {
        aiBassPart.current.stop(0);
    }

  }, [setCurrentlyPlayingChordIndex, setAccompanimentNotes]);

  const scheduleNoteHighlight = useCallback((notes: string[], startTime: number, duration: Tone.Unit.Time) => {
    if (!showAccompanimentNotesRef.current) return;
    const durationInSeconds = ToneRef.Time(duration).toSeconds();
    
    ToneRef.Draw.schedule(() => {
        setAccompanimentNotes(prev => new Set([...prev, ...notes]));
    }, startTime);
    ToneRef.Draw.schedule(() => {
        setAccompanimentNotes(prev => {
            const next = new Set(prev);
            notes.forEach(n => next.delete(n));
            return next;
        });
    }, startTime + durationInSeconds);
  }, [setAccompanimentNotes]);


  // --- Main Synchronized Playback Logic ---
  useEffect(() => {
    if (!isAudioReady || !ToneRef) {
        if (accompanimentSequence.current) { accompanimentSequence.current.stop(0).dispose(); accompanimentSequence.current = null; }
        if (aiBassPart.current) { aiBassPart.current.stop(0).dispose(); aiBassPart.current = null; }
        return;
    }

    // Always stop and dispose of old parts before creating new ones.
    // This is the core of the synchronization fix.
    if (accompanimentSequence.current) { accompanimentSequence.current.stop(0).dispose(); accompanimentSequence.current = null; }
    if (aiBassPart.current) { aiBassPart.current.stop(0).dispose(); aiBassPart.current = null; }

    const hasProgression = internalChordProgression.length > 0;

    // Create the main accompaniment sequence part
    if (hasProgression) {
      const newSequence = new ToneRef.Sequence<ChordWithIndex>(
        (scheduledTimeInSeconds, chordDef) => {
          ToneRef.Draw.schedule(() => { setCurrentlyPlayingChordIndex(chordDef.originalIndex); }, scheduledTimeInSeconds);
          accompanimentLayersRef.current.forEach(layer => {
            const synthEntry = accompanimentSynths.current.get(layer.id);
            if (!synthEntry || (synthEntry.synth as any).disposed) return;
            const { synth } = synthEntry;
            const rhythmPattern = layer.rhythmPattern;
            if (rhythmPattern !== AccompanimentRhythmPattern.Custom) {
              const notes = getChordNotes(chordDef, ACCOMPANIMENT_BASE_OCTAVE, currentTranspositionRef.current);
              const patternConfig = ACCOMPANIMENT_RHYTHM_PATTERN_OPTIONS.find(p => p.value === rhythmPattern);
              if (notes.length > 0 && patternConfig && patternConfig.hits) {
                patternConfig.hits.forEach(hit => {
                  const offset = ToneRef.Time(hit.offset as Tone.Unit.Time).toSeconds();
                  const hitTime = scheduledTimeInSeconds + offset;
                  synth.triggerAttackRelease(notes as any, hit.duration, hitTime);
                  scheduleNoteHighlight(notes, hitTime, hit.duration);
                });
              }
            } else {
               const notes = getChordNotes(chordDef, ACCOMPANIMENT_BASE_OCTAVE, currentTranspositionRef.current);
               const customRhythmForLayer = customRhythmsRef.current[layer.id];
               const customChordBeatsConfig = customRhythmForLayer ? customRhythmForLayer[chordDef.originalIndex] : null;
               if (notes.length > 0 && customChordBeatsConfig) {
                  for (let mainBeatIdx = 0; mainBeatIdx < 4; mainBeatIdx++) {
                      const fillType = customChordBeatsConfig[mainBeatIdx];
                      if (fillType === "off") continue;
                      const actualDuration: Tone.Unit.Time = fillType;
                      const hitTimeOffsetSeconds = ToneRef.Time(`0:${mainBeatIdx}:0`).toSeconds();
                      const absTime = scheduledTimeInSeconds + hitTimeOffsetSeconds;
                      synth.triggerAttackRelease(notes as any, actualDuration, absTime);
                      scheduleNoteHighlight(notes, absTime, actualDuration);
                  }
               }
            }
          });
          if (drumsEnabledRef.current && drumPatternRef.current !== DrumPattern.Off) {
            let currentDrumPatternForChord: CustomDrumChordPattern | undefined = undefined;
            if (drumPatternRef.current === DrumPattern.Custom) { currentDrumPatternForChord = customDrumDataRef.current[chordDef.originalIndex]; } else { currentDrumPatternForChord = PREDEFINED_DRUM_PATTERNS[drumPatternRef.current]; }
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
                        if (drumInst === DrumInstrument.Kick) { synth.triggerAttackRelease("C2", DRUM_NOTE_DURATION, drumHitTime); } 
                        else if (drumInst === DrumInstrument.Tom1) { synth.triggerAttackRelease("G2", DRUM_NOTE_DURATION, drumHitTime); } 
                        else if (drumInst === DrumInstrument.CrashCymbal) { ToneRef.Draw.schedule(() => { if (synth && !(synth as any).disposed) { (synth as Tone.MetalSynth).triggerAttack(drumHitTime); } }, drumHitTime); } 
                        else { synth.triggerAttackRelease(DRUM_NOTE_DURATION, drumHitTime); }
                      }
                    }
                  });
                }
              }
            }
          }
          if (bassEnabledRef.current && bassSynth.current && !(bassSynth.current as any).disposed && bassPatternRef.current !== BassPattern.Off && bassPatternRef.current !== BassPattern.AiGenerated) {
            const bassNotes = getBassNotesForPattern(chordDef, bassPatternRef.current, BASS_DEFAULT_OCTAVE, currentTranspositionRef.current);
            bassNotes.forEach(bassNoteEvent => {
              const offset = ToneRef.Time(bassNoteEvent.timeOffset).toSeconds();
              const hitTime = scheduledTimeInSeconds + offset;
              bassSynth.current!.triggerAttackRelease(bassNoteEvent.note, bassNoteEvent.duration, hitTime);
              scheduleNoteHighlight([bassNoteEvent.note], hitTime, bassNoteEvent.duration);
            });
          }
        },
        internalChordProgression, "1m"
      );
      newSequence.loop = true; accompanimentSequence.current = newSequence;
    }

    // Create the AI bass part
    const bassPattern = bassPatternRef.current;
    const aiEvents = aiBassEventsRef.current;
    if (hasProgression && bassPattern === BassPattern.AiGenerated && aiEvents && aiEvents.length > 0) {
        const partEvents = aiEvents.map(event => ({ time: event.time, note: event.note, duration: event.duration }));
        const newPart = new ToneRef.Part((time, value) => {
            if (bassSynth.current && !(bassSynth.current as any).disposed && bassEnabledRef.current) {
                bassSynth.current.triggerAttackRelease(value.note, value.duration, time);
                scheduleNoteHighlight([value.note], time, value.duration);
            }
        }, partEvents);
        newPart.loop = true;
        newPart.loopEnd = `${internalChordProgression.length}m`;
        aiBassPart.current = newPart;
    }

    // Start playback if needed
    if (isAccompanimentPlaying) {
        if (hasProgression) {
            const transportWasRunning = ToneRef.Transport.state === 'started';
            const currentPosition = ToneRef.Transport.position;
            if (transportWasRunning) { ToneRef.Transport.stop(); }
            if (accompanimentSequence.current) accompanimentSequence.current.start(0);
            if (aiBassPart.current) aiBassPart.current.start(0);
            if (transportWasRunning) { ToneRef.Transport.start(ToneRef.now(), currentPosition); } 
            else { ToneRef.Transport.start(ToneRef.now() + 0.1); }
        } else {
            stopAccompaniment();
        }
    }
  }, [
    internalChordProgression,
    isAudioReady,
    isAccompanimentPlaying,
    aiBassEventsProp,
    bassPatternProp,
    stopAccompaniment,
    setCurrentlyPlayingChordIndex,
    scheduleNoteHighlight
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
    if (!isAccompanimentPlaying) { setIsAccompanimentPlaying(true); }
  }, [isAudioReady, initializeAudio, internalChordProgression.length, isAccompanimentPlaying]);

  const setAccompanimentBPM = useCallback((bpm: number) => { setCurrentBPM(bpm); if (isAudioReady && ToneRef) ToneRef.Transport.bpm.value = bpm; }, [isAudioReady]);
  const setUserPianoVolume = useCallback((volume: number) => { setCurrentUserPianoVolume(volume); if (isAudioReady && userPianoVolumeNode.current && !userPianoVolumeNode.current.disposed) userPianoVolumeNode.current.volume.value = volume; }, [isAudioReady]);

  const setUserPianoInstrument = useCallback((instrument: UserPianoInstrument) => {
    if (currentUserPianoInstrumentRef.current === instrument && !isPianoLoading) return; setCurrentUserPianoInstrument(instrument);
    if (isAudioReady && ToneRef && userPianoVolumeNode.current && !userPianoVolumeNode.current.disposed) {
         createUserPianoSynthInstance(instrument, userPianoVolumeNode.current);
    } else if (!isAudioReady && [UserPianoInstrument.SampledGrand, UserPianoInstrument.SampledGuitar, UserPianoInstrument.StringEnsemble].includes(instrument)) {
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

  const setReverbLevel = useCallback((level: number) => {
    if (isAudioReady && globalReverb.current) {
      // Use a curve to make the effect more noticeable earlier
      globalReverb.current.wet.linearRampTo(Math.pow(level, 0.6), 0.1);
    }
  }, [isAudioReady]);

  const setDelayLevel = useCallback((level: number) => {
    if (isAudioReady && globalDelay.current) {
      // Use a curve to make the effect more noticeable earlier
      globalDelay.current.wet.linearRampTo(Math.pow(level, 0.8), 0.1);
    }
  }, [isAudioReady]);

  const setSwing = useCallback((amount: number) => {
    if (isAudioReady && ToneRef) {
      // Apply swing directly for a more noticeable, linear effect
      ToneRef.Transport.swing = amount * 0.9;
    }
  }, [isAudioReady]);

  // New setters for drums and bass
  const setDrumsEnabled = useCallback((enabled: boolean) => { drumsEnabledRef.current = enabled; }, []);
  const setDrumVolume = useCallback((volume: number) => { if (isAudioReady && drumVolumeNode.current && !drumVolumeNode.current.disposed) drumVolumeNode.current.volume.value = volume; }, [isAudioReady]);
  const setDrumPattern = useCallback((pattern: DrumPattern) => { drumPatternRef.current = pattern; }, []);

  const setBassEnabled = useCallback((enabled: boolean) => { bassEnabledRef.current = enabled; }, []);
  const setBassVolume = useCallback((volume: number) => { if (isAudioReady && bassVolumeNode.current && !bassVolumeNode.current.disposed) bassVolumeNode.current.volume.value = volume; }, [isAudioReady]);
  const setBassPattern = useCallback((pattern: BassPattern) => { 
      bassPatternRef.current = pattern; 
      if (pattern !== BassPattern.AiGenerated && aiBassPart.current) {
          aiBassPart.current.stop(0);
      }
  }, []);
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
      
      accompanimentSynths.current.forEach(entry => {
        if(entry.synth && !(entry.synth as any).disposed) entry.synth.dispose();
        if(entry.volumeNode && !entry.volumeNode.disposed) entry.volumeNode.dispose();
      });
      accompanimentSynths.current.clear();

      if(globalReverb.current && !globalReverb.current.disposed) globalReverb.current.dispose();
      if(globalDelay.current && !globalDelay.current.disposed) globalDelay.current.dispose();
      if(beatVisualizerLoop.current && !(beatVisualizerLoop.current as any).disposed) beatVisualizerLoop.current.dispose();

      if (drumVolumeNode.current && !drumVolumeNode.current.disposed) drumVolumeNode.current.dispose();
      (Object.values(drumSynths.current) as (Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth)[])
        .filter(synth => synth && !(synth as any).disposed)
        .forEach(synth => synth.dispose());
      if (bassSynth.current && !(bassSynth.current as any).disposed) bassSynth.current.dispose();
      if (bassVolumeNode.current && !bassVolumeNode.current.disposed) bassVolumeNode.current.dispose();
      if (accompanimentSequence.current) { accompanimentSequence.current.stop(0); accompanimentSequence.current.clear(); accompanimentSequence.current.dispose(); }
      if (aiBassPart.current) { aiBassPart.current.stop(0); aiBassPart.current.clear(); aiBassPart.current.dispose(); }
      activePianoNotesByKey.current.clear();
    };
  }, []);

  return {
    attackPianoNote, releasePianoNote, startAccompaniment, stopAccompaniment,
    setAccompanimentBPM, 
    setUserPianoInstrument, setUserPianoVolume, setTransposition,
    currentTransposition, isAccompanimentPlaying, currentBPM, currentUserPianoVolume,
    currentUserPianoInstrument,
    isAudioReady, isPianoLoading,
    setReverbLevel, setDelayLevel, setSwing,
    // Drum setters
    setDrumsEnabled, setDrumVolume, setDrumPattern,
    // Bass setters
    setBassEnabled, setBassVolume, setBassPattern, setBassInstrument,
  };
};