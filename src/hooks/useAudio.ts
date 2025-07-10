
import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import {
    ChordDefinition, AccompanimentInstrument, NoteName, UserPianoInstrument, AccompanimentRhythmPattern, BeatDuration,
    DrumInstrument, DrumPattern, BassInstrument, BassPattern, CustomDrumProgressionData, CustomDrumChordPattern,
    AccompanimentLayer
} from '../types';
import {
  getNoteFullName, DEFAULT_BPM, DEFAULT_USER_PIANO_VOLUME,
  ACCOMPANIMENT_SYNTH_PIANO_CONFIG, ACCOMPANIMENT_MELLOW_SYNTH_CONFIG,
  USER_PIANO_SOUND_CONFIGS, DEFAULT_USER_PIANO_INSTRUMENT,
  SAMPLED_GRAND_PIANO_URLS, SAMPLED_GRAND_PIANO_BASE_URL,
  ACCOMPANIMENT_RHYTHM_PATTERN_OPTIONS,
  DRUM_SYNTH_CONFIGS, BASS_SYNTH_CONFIGS, PREDEFINED_DRUM_PATTERNS, BASS_DEFAULT_OCTAVE,
  NUM_BEATS_PER_DRUM_MEASURE, NUM_SUBDIVISIONS_PER_DRUM_BEAT,
  ACCOMPANIMENT_GENERAL_SYNTH_CONFIG, ACCOMPANIMENT_TRIANGLE_SYNTH_CONFIG
} from '../constants';
import { getChordNotes, getBassNotesForPattern } from '../utils/audioUtils';
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

// New type for Part events to unify scheduling
type AccompanimentEvent = {
  time: string; // e.g., "0:1:2"
  type: 'chord' | 'drum' | 'bass';
  // Chord specific
  layerId?: string;
  notes?: string[];
  duration?: Tone.Unit.Time;
  // Drum specific
  instrument?: DrumInstrument;
  noteValue?: string; // e.g., "C2" for kick
  // Bass specific (already covered by notes/duration)
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

const ACCOMPANIMENT_BASE_OCTAVE = 3;
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
    initialUserPianoVolume: number,
    // New callback for highlighting
    setCurrentlyPlayingChordIndex: (index: number | null) => void
): UseAudioReturn => {
  const [isAudioReady, setIsAudioReady] = useState(false);
  const pianoSynth = useRef<(Tone.PolySynth<Tone.Synth> | Tone.Sampler) | null>(null);
  const userPianoVolumeNode = useRef<Tone.Volume | null>(null);
  
  const accompanimentSynths = useRef<Map<string, AccompanimentSynthMapEntry>>(new Map());
  // Refactored to use Tone.Part for swing compatibility
  const accompanimentPart = useRef<Tone.Part<AccompanimentEvent> | null>(null);
  const highlightSequence = useRef<Tone.Sequence<ChordWithIndex> | null>(null);


  const drumSynths = useRef<Partial<Record<DrumInstrument, Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth>>>({});
  const drumVolumeNode = useRef<Tone.Volume | null>(null);
  const bassSynth = useRef<Tone.MonoSynth | Tone.Sampler | null>(null);
  const bassVolumeNode = useRef<Tone.Volume | null>(null);

  // Global Effects
  const globalReverb = useRef<Tone.Reverb | null>(null);
  const globalDelay = useRef<Tone.FeedbackDelay | null>(null);

  const activePianoNotesByKey = useRef<Map<string, string>>(new Map());

  const [currentTransposition, setCurrentTransposition] = useState(0);
  const [isAccompanimentPlaying, setIsAccompanimentPlaying] = useState(false);

  const [internalChordProgression, setInternalChordProgression] = useState<ChordWithIndex[]>(progressionWithIndicesFromProps);
  
  // Refs for props to use in Tone.js callbacks
  const currentTranspositionRef = useRef(currentTransposition);

  useEffect(() => { currentTranspositionRef.current = currentTransposition; }, [currentTransposition]);
  useEffect(() => { setInternalChordProgression(progressionWithIndicesFromProps); }, [progressionWithIndicesFromProps]);

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

  const connectToEffects = useCallback((node: Tone.Volume | Tone.PolySynth | Tone.Sampler | Tone.MonoSynth | Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth) => {
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
            const volumeNode = new ToneRef.Volume(layer.volume).toDestination();
            connectToEffects(volumeNode);
            const synth = createAccompanimentSynthInstance(layer.instrument).connect(volumeNode);
            synthMap.set(layer.id, { synth, volumeNode, instrument: layer.instrument });
        }
    });

  }, [accompanimentLayersProp, isAudioReady, createAccompanimentSynthInstance, connectToEffects]);

  const [currentUserPianoInstrument, setCurrentUserPianoInstrument] = useState(DEFAULT_USER_PIANO_INSTRUMENT);
  const [isPianoLoading, setIsPianoLoading] = useState(false);
  const currentUserPianoInstrumentRef = useRef(currentUserPianoInstrument);
  useEffect(() => { currentUserPianoInstrumentRef.current = currentUserPianoInstrument; }, [currentUserPianoInstrument]);

  const createUserPianoSynthInstance = useCallback((instrument: UserPianoInstrument, volNode: Tone.Volume) => {
    if (pianoSynth.current && !(pianoSynth.current as any).disposed) {
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
      tempSamplerRef = sampler; pianoSynth.current = sampler;
    } else if (instrument === UserPianoInstrument.SampledGuitar) {
      setIsPianoLoading(true);
      const sampler = new ToneRef.Sampler({ urls: { 'A3': 'guitar.wav' }, baseUrl: SAMPLES_BASE_URL, release: 1,
        onload: () => { if (pianoSynth.current === tempSamplerRef) setIsPianoLoading(false); },
        onerror: (error) => {
          console.error('Error loading sampled guitar:', error);
          if (pianoSynth.current === tempSamplerRef || !pianoSynth.current) {
            setIsPianoLoading(false); if (tempSamplerRef && !(tempSamplerRef as any).disposed) tempSamplerRef.dispose();
            createFallbackSynth();
          }
        }
      }).connect(volNode);
      tempSamplerRef = sampler; pianoSynth.current = sampler;
    } else if (instrument === UserPianoInstrument.StringEnsemble) {
        setIsPianoLoading(true);
        const sampler = new ToneRef.Sampler({ urls: { 'A4': 'strings.wav' }, baseUrl: SAMPLES_BASE_URL, release: 1.5,
          onload: () => { if (pianoSynth.current === tempSamplerRef) setIsPianoLoading(false); },
          onerror: (error) => {
            console.error('Error loading string ensemble:', error);
            if (pianoSynth.current === tempSamplerRef || !pianoSynth.current) {
              setIsPianoLoading(false); if (tempSamplerRef && !(tempSamplerRef as any).disposed) tempSamplerRef.dispose();
              createFallbackSynth();
            }
          }
        }).connect(volNode);
        tempSamplerRef = sampler; pianoSynth.current = sampler;
    } else {
      setIsPianoLoading(false);
      const configKey = instrument as Exclude<UserPianoInstrument, UserPianoInstrument.SampledGrand | UserPianoInstrument.SampledGuitar | UserPianoInstrument.StringEnsemble>;
      const isDefaultASampler = [UserPianoInstrument.SampledGrand, UserPianoInstrument.SampledGuitar, UserPianoInstrument.StringEnsemble].includes(DEFAULT_USER_PIANO_INSTRUMENT);
      const fallbackSynthKey = isDefaultASampler ? UserPianoInstrument.ClassicGrand : DEFAULT_USER_PIANO_INSTRUMENT as Exclude<UserPianoInstrument, UserPianoInstrument.SampledGrand | UserPianoInstrument.SampledGuitar | UserPianoInstrument.StringEnsemble>;
      const config = USER_PIANO_SOUND_CONFIGS[configKey] || USER_PIANO_SOUND_CONFIGS[fallbackSynthKey];
      pianoSynth.current = new ToneRef.PolySynth<Tone.Synth>({ voice: ToneRef.Synth, options: config }).connect(volNode);
    }
  }, []);

  const createDrumSynths = useCallback((volNode: Tone.Volume) => {
    (Object.keys(DrumInstrument) as Array<keyof typeof DrumInstrument>).forEach(key => {
        const enumValue = DrumInstrument[key];
        if (drumSynths.current[enumValue] && !(drumSynths.current[enumValue] as any).disposed) {
            drumSynths.current[enumValue]!.dispose();
        }
        const config = DRUM_SYNTH_CONFIGS[enumValue];
        let synth: Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth;
        if (enumValue === DrumInstrument.Kick || enumValue === DrumInstrument.Tom1) {
            synth = new ToneRef.MembraneSynth(config as any).connect(volNode);
        } else if (enumValue === DrumInstrument.Snare || enumValue === DrumInstrument.HiHatClosed) {
            synth = new ToneRef.NoiseSynth(config as any).connect(volNode);
        } else { // CrashCymbal
            synth = new ToneRef.MetalSynth(config as any).connect(volNode);
        }
        drumSynths.current[enumValue] = synth;
    });
  }, []);

  const createBassSynthInstance = useCallback((instrument: BassInstrument, volNode: Tone.Volume) => {
    if (bassSynth.current && !(bassSynth.current as any).disposed) {
        bassSynth.current.dispose();
    }

    if (instrument === BassInstrument.PopPulseBass) {
        bassSynth.current = new ToneRef.Sampler({
            urls: { 'A4': 'pop-pulse-bass.wav' }, baseUrl: SAMPLES_BASE_URL, release: 0.5,
            onerror: (err) => console.error('[useAudio] CRITICAL: Failed to load PopPulseBass sample:', err),
        }).connect(volNode);
    } else {
        const configKey = instrument as Exclude<BassInstrument, BassInstrument.PopPulseBass>;
        const config = BASS_SYNTH_CONFIGS[configKey] || BASS_SYNTH_CONFIGS[BassInstrument.ElectricBass];
        bassSynth.current = new ToneRef.MonoSynth(config as any).connect(volNode);
    }
  }, []);

  useEffect(() => {
    if (isAudioReady && bassVolumeNode.current && !bassVolumeNode.current.disposed) {
        createBassSynthInstance(bassInstrumentProp, bassVolumeNode.current);
    }
  }, [bassInstrumentProp, isAudioReady, createBassSynthInstance]);

  const [currentBPM, setCurrentBPM] = useState(DEFAULT_BPM);
  const [currentUserPianoVolume, setCurrentUserPianoVolume] = useState(initialUserPianoVolume);

  const initializeAudio = useCallback(async () => {
    if (!ToneRef) return false; if (isAudioReady) return true;
    try {
      await ToneRef.start();
      
      if (!globalReverb.current || globalReverb.current.disposed) {
        globalReverb.current = new ToneRef.Reverb({ decay: 5, wet: 0 }).toDestination();
      }
      if (!globalDelay.current || globalDelay.current.disposed) {
        globalDelay.current = new ToneRef.FeedbackDelay({delayTime: "8n.", feedback: 0.6, wet: 0}).toDestination();
      }
      
      if (!userPianoVolumeNode.current || userPianoVolumeNode.current.disposed) {
        userPianoVolumeNode.current = new ToneRef.Volume(initialUserPianoVolume).toDestination();
        connectToEffects(userPianoVolumeNode.current);
      }
      createUserPianoSynthInstance(currentUserPianoInstrumentRef.current, userPianoVolumeNode.current);

      accompanimentLayersProp.forEach(layer => {
        if (!accompanimentSynths.current.has(layer.id)) {
            const volumeNode = new ToneRef.Volume(layer.volume).toDestination();
            connectToEffects(volumeNode);
            const synth = createAccompanimentSynthInstance(layer.instrument).connect(volumeNode);
            accompanimentSynths.current.set(layer.id, { synth, volumeNode, instrument: layer.instrument });
        }
      });

      if (!drumVolumeNode.current || drumVolumeNode.current.disposed) {
        drumVolumeNode.current = new ToneRef.Volume(drumVolumeProp).toDestination();
        connectToEffects(drumVolumeNode.current);
      }
      createDrumSynths(drumVolumeNode.current);

      if (!bassVolumeNode.current || bassVolumeNode.current.disposed) {
        bassVolumeNode.current = new ToneRef.Volume(bassVolumeProp).toDestination();
        connectToEffects(bassVolumeNode.current);
      }
      createBassSynthInstance(bassInstrumentProp, bassVolumeNode.current);

      ToneRef.Transport.bpm.value = currentBPM; ToneRef.Transport.timeSignature = 4; setIsAudioReady(true); return true;
    } catch (e) { console.error("Error starting Tone.js or initializing synths:", e); setIsAudioReady(false); return false; }
  }, [isAudioReady, currentBPM, initialUserPianoVolume, accompanimentLayersProp, drumVolumeProp, bassVolumeProp, bassInstrumentProp, connectToEffects, createAccompanimentSynthInstance, createBassSynthInstance, createDrumSynths, createUserPianoSynthInstance]);

  const stopAccompaniment = useCallback(() => {
    if (!ToneRef) return;
    setIsAccompanimentPlaying(false);
    setCurrentlyPlayingChordIndex(null);
    if (ToneRef.Transport.state !== 'stopped') {
        ToneRef.Transport.stop(ToneRef.now());
        ToneRef.Transport.position = 0;
        ToneRef.Transport.cancel();
    }
  }, [setCurrentlyPlayingChordIndex]);

  // REFACTORED: Main scheduling logic using Tone.Part for Swing compatibility
  useEffect(() => {
    if (!isAudioReady || !ToneRef) {
        if (accompanimentPart.current) { accompanimentPart.current.stop(0).dispose(); accompanimentPart.current = null; }
        if (highlightSequence.current) { highlightSequence.current.stop(0).dispose(); highlightSequence.current = null; }
        return;
    }

    if (accompanimentPart.current) { accompanimentPart.current.stop(0).dispose(); }
    if (highlightSequence.current) { highlightSequence.current.stop(0).dispose(); }

    if (internalChordProgression.length > 0) {
        const events: AccompanimentEvent[] = [];

        internalChordProgression.forEach((chordDef, measureIndex) => {
            // Chord Accompaniment
            accompanimentLayersProp.forEach(layer => {
                const notes = getChordNotes(chordDef, ACCOMPANIMENT_BASE_OCTAVE, currentTranspositionRef.current);
                if (notes.length === 0) return;
                
                if (layer.rhythmPattern !== AccompanimentRhythmPattern.Custom) {
                    const patternConfig = ACCOMPANIMENT_RHYTHM_PATTERN_OPTIONS.find(p => p.value === layer.rhythmPattern);
                    if (patternConfig?.hits) {
                        patternConfig.hits.forEach(hit => events.push({
                            time: `${measureIndex}:${hit.offset}`, type: 'chord', layerId: layer.id, notes, duration: hit.duration,
                        }));
                    }
                } else {
                    const customRhythmForLayer = customRhythmsFromProps[layer.id];
                    const customBeats = customRhythmForLayer?.[chordDef.originalIndex];
                    if (customBeats) {
                        customBeats.forEach((duration, beatIndex) => {
                            if (duration !== "off") events.push({
                                time: `${measureIndex}:${beatIndex}:0`, type: 'chord', layerId: layer.id, notes, duration
                            });
                        });
                    }
                }
            });

            // Drum Accompaniment
            if (drumsEnabledProp && drumPatternProp !== DrumPattern.Off) {
                const drumPattern = drumPatternProp === DrumPattern.Custom ? customDrumDataProp[chordDef.originalIndex] : PREDEFINED_DRUM_PATTERNS[drumPatternProp];
                if (drumPattern) {
                    (Object.keys(drumPattern) as DrumInstrument[]).forEach(inst => {
                        const instrumentPattern = drumPattern[inst];
                        instrumentPattern?.forEach((beat, beatIndex) => {
                            beat.forEach((isActive, subIndex) => {
                                if (isActive) events.push({
                                    time: `${measureIndex}:${beatIndex}:${subIndex}`, type: 'drum', instrument: inst, noteValue: inst === DrumInstrument.Kick ? "C2" : (inst === DrumInstrument.Tom1 ? "G2" : undefined)
                                });
                            });
                        });
                    });
                }
            }
            
            // Bass Accompaniment
            if (bassEnabledProp && bassPatternProp !== BassPattern.Off) {
                const bassNotes = getBassNotesForPattern(chordDef, bassPatternProp, BASS_DEFAULT_OCTAVE, currentTranspositionRef.current);
                bassNotes.forEach(noteEvent => events.push({
                    time: `${measureIndex}:${noteEvent.timeOffset}`, type: 'bass', notes: [noteEvent.note], duration: noteEvent.duration
                }));
            }
        });
        
        accompanimentPart.current = new ToneRef.Part<AccompanimentEvent>((time, event) => {
            switch(event.type) {
                case 'chord':
                    const synthEntry = accompanimentSynths.current.get(event.layerId!);
                    if (synthEntry && !synthEntry.synth.disposed) {
                        synthEntry.synth.triggerAttackRelease(event.notes!, event.duration!, time);
                    }
                    break;
                case 'drum':
                    const drumSynth = drumSynths.current[event.instrument!];
                    if (drumSynth && !drumSynth.disposed) {
                        if (event.instrument === DrumInstrument.CrashCymbal) (drumSynth as Tone.MetalSynth).triggerAttack(time);
                        else if (event.noteValue) (drumSynth as Tone.MembraneSynth).triggerAttackRelease(event.noteValue, DRUM_NOTE_DURATION, time);
                        else (drumSynth as Tone.NoiseSynth).triggerAttackRelease(DRUM_NOTE_DURATION, time);
                    }
                    break;
                case 'bass':
                    if (bassSynth.current && !bassSynth.current.disposed) {
                        bassSynth.current.triggerAttackRelease(event.notes![0], event.duration!, time);
                    }
                    break;
            }
        }, events);

        highlightSequence.current = new ToneRef.Sequence<ChordWithIndex>(
            (time, chordDef) => ToneRef.Draw.schedule(() => setCurrentlyPlayingChordIndex(chordDef.originalIndex), time),
            internalChordProgression, "1m"
        );
        
        ToneRef.Transport.loopEnd = `${internalChordProgression.length}m`;
        ToneRef.Transport.loop = true;
        accompanimentPart.current.loop = false;
        highlightSequence.current.loop = true;

        if (isAccompanimentPlaying) {
             if (ToneRef.Transport.state !== 'started') {
                 ToneRef.Transport.start(ToneRef.now() + 0.1);
             }
             accompanimentPart.current.start(0);
             highlightSequence.current.start(0);
        }

    } else if (isAccompanimentPlaying) {
        stopAccompaniment();
    }
  }, [
    internalChordProgression, isAudioReady, isAccompanimentPlaying, accompanimentLayersProp,
    customRhythmsFromProps, drumsEnabledProp, drumPatternProp, customDrumDataProp,
    bassEnabledProp, bassPatternProp, stopAccompaniment, setCurrentlyPlayingChordIndex
  ]);

  const attackPianoNote = useCallback((noteName: NoteName, octave: number, isComputerKey: boolean = false) => {
     const play = () => { if (pianoSynth.current && !pianoSynth.current.disposed && ToneRef && !isPianoLoading) { const fullName = getNoteFullName(noteName, octave, currentTranspositionRef.current); pianoSynth.current.triggerAttack(fullName, ToneRef.now()); if (isComputerKey) activePianoNotesByKey.current.set(`${noteName}${octave}`, fullName); }};
     if (!isAudioReady) initializeAudio().then(success => { if (success && !isPianoLoading) play(); }); else if (!isPianoLoading) play();
  }, [isAudioReady, initializeAudio, isPianoLoading]);

  const releasePianoNote = useCallback((noteName: NoteName, octave: number, isComputerKey: boolean = false) => {
    let noteToRelease: string | null = null; const keyStr = `${noteName}${octave}`;
    noteToRelease = getNoteFullName(noteName, octave, currentTranspositionRef.current); 
    if (isComputerKey) activePianoNotesByKey.current.delete(keyStr);
    if (noteToRelease && pianoSynth.current && !pianoSynth.current.disposed && ToneRef && !isPianoLoading) pianoSynth.current.triggerRelease([noteToRelease], ToneRef.now() + PIANO_NOTE_RELEASE_TIME);
  }, [isPianoLoading]);

  const startAccompaniment = useCallback(async () => {
    if (!ToneRef) return; const ready = isAudioReady ? true : await initializeAudio(); if (!ready) return;
    if (internalChordProgression.length === 0) return;
    setIsAccompanimentPlaying(true);
  }, [isAudioReady, initializeAudio, internalChordProgression.length]);

  const setAccompanimentBPM = useCallback((bpm: number) => { setCurrentBPM(bpm); if (isAudioReady && ToneRef) ToneRef.Transport.bpm.value = bpm; }, [isAudioReady]);
  const setUserPianoVolume = useCallback((volume: number) => { setCurrentUserPianoVolume(volume); if (isAudioReady && userPianoVolumeNode.current && !userPianoVolumeNode.current.disposed) userPianoVolumeNode.current.volume.value = volume; }, [isAudioReady]);

  const setUserPianoInstrument = useCallback((instrument: UserPianoInstrument) => {
    if (currentUserPianoInstrumentRef.current === instrument && !isPianoLoading) return; setCurrentUserPianoInstrument(instrument);
    if (isAudioReady && ToneRef && userPianoVolumeNode.current && !userPianoVolumeNode.current.disposed) {
         createUserPianoSynthInstance(instrument, userPianoVolumeNode.current);
    } else if (!isAudioReady && [UserPianoInstrument.SampledGrand, UserPianoInstrument.SampledGuitar, UserPianoInstrument.StringEnsemble].includes(instrument)) {
        setIsPianoLoading(true);
    }
  }, [isAudioReady, createUserPianoSynthInstance, isPianoLoading]);

  const setTransposition = useCallback((semitones: number) => {
    if (pianoSynth.current && !pianoSynth.current.disposed && pianoSynth.current instanceof ToneRef.PolySynth) {
      pianoSynth.current.releaseAll(ToneRef.now());
    }
    activePianoNotesByKey.current.clear();
    setCurrentTransposition(semitones);
  }, []);

  const setReverbLevel = useCallback((level: number) => { if (isAudioReady && globalReverb.current) globalReverb.current.wet.linearRampTo(Math.pow(level, 0.7), 0.1); }, [isAudioReady]);
  const setDelayLevel = useCallback((level: number) => { if (isAudioReady && globalDelay.current) globalDelay.current.wet.linearRampTo(Math.pow(level, 0.7), 0.1); }, [isAudioReady]);
  const setSwing = useCallback((amount: number) => { if (isAudioReady && ToneRef) ToneRef.Transport.swing = amount; }, [isAudioReady]);

  const setDrumsEnabled = useCallback((enabled: boolean) => { drumsEnabledProp = enabled; }, []);
  const setDrumVolume = useCallback((volume: number) => { if (isAudioReady && drumVolumeNode.current && !drumVolumeNode.current.disposed) drumVolumeNode.current.volume.value = volume; }, [isAudioReady]);
  const setDrumPattern = useCallback((pattern: DrumPattern) => { drumPatternProp = pattern; }, []);

  const setBassEnabled = useCallback((enabled: boolean) => { bassEnabledProp = enabled; }, []);
  const setBassVolume = useCallback((volume: number) => { if (isAudioReady && bassVolumeNode.current && !bassVolumeNode.current.disposed) bassVolumeNode.current.volume.value = volume; }, [isAudioReady]);
  const setBassPattern = useCallback((pattern: BassPattern) => { bassPatternProp = pattern; }, []);
  const setBassInstrument = useCallback((instrument: BassInstrument) => {
    bassInstrumentProp = instrument;
    if (isAudioReady && bassVolumeNode.current && !bassVolumeNode.current.disposed) {
      createBassSynthInstance(instrument, bassVolumeNode.current);
    }
  }, [isAudioReady, createBassSynthInstance]);

  useEffect(() => { // Master cleanup
    return () => {
      if (ToneRef) { if (ToneRef.Transport.state !== 'stopped') { ToneRef.Transport.stop(); ToneRef.Transport.cancel(); }}
      [pianoSynth.current, userPianoVolumeNode.current, globalReverb.current, globalDelay.current, drumVolumeNode.current, bassSynth.current, bassVolumeNode.current, accompanimentPart.current, highlightSequence.current].forEach(node => {
        if(node && !node.disposed) node.dispose();
      });
      accompanimentSynths.current.forEach(entry => {
        if(entry.synth && !entry.synth.disposed) entry.synth.dispose();
        if(entry.volumeNode && !entry.volumeNode.disposed) entry.volumeNode.dispose();
      });
      accompanimentSynths.current.clear();
      Object.values(drumSynths.current).forEach(synth => { if(synth && !synth.disposed) synth.dispose(); });
      activePianoNotesByKey.current.clear();
    };
  }, []);

  return {
    attackPianoNote, releasePianoNote, startAccompaniment, stopAccompaniment,
    setAccompanimentBPM, setUserPianoInstrument, setUserPianoVolume, setTransposition,
    currentTransposition, isAccompanimentPlaying, currentBPM, currentUserPianoVolume,
    currentUserPianoInstrument, isAudioReady, isPianoLoading,
    setReverbLevel, setDelayLevel, setSwing,
    setDrumsEnabled, setDrumVolume, setDrumPattern,
    setBassEnabled, setBassVolume, setBassPattern, setBassInstrument,
  };
};
