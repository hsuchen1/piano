
import React from 'react'; // Import React
import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { ChordDefinition, AccompanimentInstrument, NoteName, UserPianoInstrument, AccompanimentRhythmPattern, BeatDuration } from '../types';
import {
  getNoteFullName, DEFAULT_BPM, DEFAULT_ACCOMPANIMENT_VOLUME, DEFAULT_ACCOMPANIMENT_INSTRUMENT,
  ACCOMPANIMENT_SYNTH_PIANO_CONFIG, 
  ACCOMPANIMENT_MELLOW_SYNTH_CONFIG, 
  ACCOMPANIMENT_PLUCKY_SYNTH_CONFIG,
  USER_PIANO_SOUND_CONFIGS, DEFAULT_USER_PIANO_INSTRUMENT,
  SAMPLED_GRAND_PIANO_URLS, SAMPLED_GRAND_PIANO_BASE_URL,
  DEFAULT_ACCOMPANIMENT_RHYTHM_PATTERN, ACCOMPANIMENT_RHYTHM_PATTERN_OPTIONS
} from '../constants';
import { getChordNotes } from '../utils/audioUtils';
import type { ChordWithIndex } from '../App'; // Import ChordWithIndex

// Use the imported Tone directly
const ToneRef = Tone;

export interface UseAudioReturn {
  attackPianoNote: (noteName: NoteName, octave: number, isComputerKey?: boolean) => void;
  releasePianoNote: (noteName: NoteName, octave: number, isComputerKey?: boolean) => void;
  startAccompaniment: () => void;
  stopAccompaniment: () => void;
  setAccompanimentBPM: (bpm: number) => void;
  setAccompanimentVolume: (volume: number) => void;
  setAccompanimentInstrument: (instrument: AccompanimentInstrument) => void;
  setAccompanimentRhythmPattern: (pattern: AccompanimentRhythmPattern) => void;
  setUserPianoInstrument: (instrument: UserPianoInstrument) => void;
  setTransposition: (semitones: number) => void;
  currentTransposition: number;
  isAccompanimentPlaying: boolean;
  currentBPM: number;
  currentVolume: number;
  currentAccompanimentInstrument: AccompanimentInstrument;
  currentAccompanimentRhythmPattern: AccompanimentRhythmPattern;
  currentUserPianoInstrument: UserPianoInstrument;
  isAudioReady: boolean;
  isPianoLoading: boolean;
}

const ACCOMPANIMENT_BASE_OCTAVE = 3;
const PIANO_NOTE_RELEASE_TIME = 0.2; // Seconds for release phase of piano note

export const useAudio = (
    progressionWithIndicesFromProps: ChordWithIndex[],
    customRhythmDataFromProps: BeatDuration[][] // Updated type
): UseAudioReturn => {
  const [isAudioReady, setIsAudioReady] = useState(false);
  const pianoSynth = useRef<(Tone.PolySynth<Tone.Synth> | Tone.Sampler) | null>(null);
  const accompanimentSynth = useRef<Tone.PolySynth | Tone.Sampler | null>(null); 
  const accompanimentVolumeNode = useRef<Tone.Volume | null>(null);
  const accompanimentSequence = useRef<Tone.Sequence<ChordWithIndex> | null>(null);

  const activePianoNotesByKey = useRef<Map<string, string>>(new Map());

  const [currentTransposition, setCurrentTransposition] = useState(0);
  const [isAccompanimentPlaying, setIsAccompanimentPlaying] = useState(false);
  
  // Internal state for chord progression, updated from props
  const [internalChordProgression, setInternalChordProgression] = useState<ChordWithIndex[]>(progressionWithIndicesFromProps);
  const customRhythmDataRef = useRef<BeatDuration[][]>(customRhythmDataFromProps); // Updated type


  const [currentBPM, setCurrentBPM] = useState(DEFAULT_BPM);
  const [currentVolume, setCurrentVolume] = useState(DEFAULT_ACCOMPANIMENT_VOLUME);
  const [currentAccompanimentInstrument, setCurrentAccompanimentInstrument] = useState(DEFAULT_ACCOMPANIMENT_INSTRUMENT);
  const [currentAccompanimentRhythmPattern, setCurrentAccompanimentRhythmPattern] = useState(DEFAULT_ACCOMPANIMENT_RHYTHM_PATTERN);
  const [currentUserPianoInstrument, setCurrentUserPianoInstrument] = useState(DEFAULT_USER_PIANO_INSTRUMENT);
  const [isPianoLoading, setIsPianoLoading] = useState(false);

  const currentTranspositionRef = useRef(currentTransposition);
  const currentAccompanimentRhythmPatternRef = useRef(currentAccompanimentRhythmPattern);
  const currentUserPianoInstrumentRef = useRef(currentUserPianoInstrument);
  const currentAccompanimentInstrumentRef = useRef(currentAccompanimentInstrument);

  useEffect(() => {
    currentTranspositionRef.current = currentTransposition;
  }, [currentTransposition]);

  useEffect(() => {
    currentAccompanimentRhythmPatternRef.current = currentAccompanimentRhythmPattern;
  }, [currentAccompanimentRhythmPattern]);

  useEffect(() => {
    currentUserPianoInstrumentRef.current = currentUserPianoInstrument;
  }, [currentUserPianoInstrument]);
  
  useEffect(() => {
    currentAccompanimentInstrumentRef.current = currentAccompanimentInstrument;
  }, [currentAccompanimentInstrument]);

  useEffect(() => {
    setInternalChordProgression(progressionWithIndicesFromProps);
  }, [progressionWithIndicesFromProps]);

  useEffect(() => {
    customRhythmDataRef.current = customRhythmDataFromProps;
  }, [customRhythmDataFromProps]);


  const createAccompanimentSynthInstance = useCallback((instrument: AccompanimentInstrument, volumeNode: Tone.Volume) => {
    let synth: Tone.PolySynth | Tone.Sampler;
    switch (instrument) {
      case AccompanimentInstrument.AcousticPiano:
         synth = new ToneRef.Sampler({
            urls: SAMPLED_GRAND_PIANO_URLS,
            baseUrl: SAMPLED_GRAND_PIANO_BASE_URL,
            release: 1,
            volume: -3, 
            onload: () => {
              console.log('Accompaniment Acoustic Piano sampler loaded.');
            },
            onerror: (error) => {
              console.error('Error loading accompaniment Acoustic Piano sampler:', error);
            }
          });
         break;
      case AccompanimentInstrument.SynthPiano:
         synth = new ToneRef.PolySynth<Tone.Synth>({ voice: ToneRef.Synth, options: ACCOMPANIMENT_SYNTH_PIANO_CONFIG });
         break;
      case AccompanimentInstrument.MellowSynth:
         synth = new ToneRef.PolySynth<Tone.Synth>({ voice: ToneRef.Synth, options: ACCOMPANIMENT_MELLOW_SYNTH_CONFIG });
         break;
      case AccompanimentInstrument.FMSynth:
        synth = new ToneRef.PolySynth<Tone.FMSynth>({ voice: ToneRef.FMSynth, options: { volume: -10, harmonicity: 3, modulationIndex: 10, detune: 0, oscillator: {type: "sine"}, envelope: {attack:0.01, decay:0.2, sustain:0.5, release:0.8}, modulation: {type:"square"}, modulationEnvelope: {attack:0.01, decay:0.1, sustain:0.3, release:0.5} }});
        break;
      case AccompanimentInstrument.AMSynth:
        synth = new ToneRef.PolySynth<Tone.AMSynth>({ voice: ToneRef.AMSynth, options: { volume: -10, harmonicity: 2.5, detune: 0, oscillator: {type:"sawtooth"}, envelope: {attack:0.02, decay:0.3, sustain:0.4, release:0.7}, modulation: {type:"sine"}, modulationEnvelope: {attack:0.01, decay:0.1, sustain:0.2, release:0.6} }});
        break;
      case AccompanimentInstrument.PluckSynth:
        synth = new ToneRef.PolySynth<Tone.Synth>({
            voice: ToneRef.Synth,
            options: ACCOMPANIMENT_PLUCKY_SYNTH_CONFIG
        });
        break;
      case AccompanimentInstrument.Synth:
      default:
        synth = new ToneRef.PolySynth<Tone.Synth>({ voice: ToneRef.Synth, options: { volume: -38, oscillator: {type: "pulse", width: 0.4}, envelope: {attack:0.05, decay:0.2, sustain:0.6, release:0.9} } });
    }
    return synth.connect(volumeNode);
  }, []);

  const createUserPianoSynthInstance = useCallback((instrument: UserPianoInstrument) => {
    if (pianoSynth.current && !(pianoSynth.current as any).disposed) {
        if (pianoSynth.current instanceof ToneRef.PolySynth) {
            pianoSynth.current.releaseAll(ToneRef.now());
        }
        pianoSynth.current.dispose();
        pianoSynth.current = null;
    }
    activePianoNotesByKey.current.clear();

    let tempSamplerRef: Tone.Sampler | null = null;

    if (instrument === UserPianoInstrument.SampledGrand) {
      setIsPianoLoading(true);
      const sampler = new ToneRef.Sampler({
        urls: SAMPLED_GRAND_PIANO_URLS,
        baseUrl: SAMPLED_GRAND_PIANO_BASE_URL,
        release: 1,
        volume: -6,
        onload: () => {
          console.log('Sampled Grand piano loaded');
          if (pianoSynth.current === tempSamplerRef) { 
            setIsPianoLoading(false);
          }
        },
        onerror: (error) => {
          console.error('Error loading sampled grand piano:', error);
          if (pianoSynth.current === tempSamplerRef || !pianoSynth.current) {
            setIsPianoLoading(false);
            if (tempSamplerRef && !(tempSamplerRef as any).disposed) {
                 tempSamplerRef.dispose();
            }
            const fallbackInstrumentKey = DEFAULT_USER_PIANO_INSTRUMENT === UserPianoInstrument.SampledGrand
                                            ? UserPianoInstrument.ClassicGrand
                                            : DEFAULT_USER_PIANO_INSTRUMENT as Exclude<UserPianoInstrument, UserPianoInstrument.SampledGrand>;
            const fallbackConfig = USER_PIANO_SOUND_CONFIGS[fallbackInstrumentKey] || USER_PIANO_SOUND_CONFIGS[UserPianoInstrument.ClassicGrand];
            pianoSynth.current = new ToneRef.PolySynth<Tone.Synth>({
                voice: ToneRef.Synth,
                options: fallbackConfig
            }).toDestination();
            console.log('Fallback piano synth created due to sampler error.');
            setCurrentUserPianoInstrument(fallbackInstrumentKey);
          }
        }
      }).toDestination();
      tempSamplerRef = sampler;
      pianoSynth.current = sampler;
      return sampler;
    } else {
      setIsPianoLoading(false);
      const config = USER_PIANO_SOUND_CONFIGS[instrument as Exclude<UserPianoInstrument, UserPianoInstrument.SampledGrand>] || USER_PIANO_SOUND_CONFIGS[DEFAULT_USER_PIANO_INSTRUMENT as Exclude<UserPianoInstrument, UserPianoInstrument.SampledGrand>];
      const newSynth = new ToneRef.PolySynth<Tone.Synth>({ voice: ToneRef.Synth, options: config }).toDestination();
      pianoSynth.current = newSynth;
      return newSynth;
    }
  }, []);


  const initializeAudio = useCallback(async () => {
    if (!ToneRef) {
      console.error("Tone.js is not loaded.");
      return false;
    }
    if (isAudioReady) return true;

    try {
      await ToneRef.start();
      console.log("AudioContext started");

      if (!pianoSynth.current || (pianoSynth.current as any).disposed) {
         createUserPianoSynthInstance(currentUserPianoInstrumentRef.current);
      }

      if (!accompanimentVolumeNode.current || accompanimentVolumeNode.current.disposed) {
        accompanimentVolumeNode.current = new ToneRef.Volume(currentVolume).toDestination();
      }
      if (!accompanimentSynth.current || (accompanimentSynth.current as any).disposed) {
        accompanimentSynth.current = createAccompanimentSynthInstance(currentAccompanimentInstrumentRef.current, accompanimentVolumeNode.current);
      }

      ToneRef.Transport.bpm.value = currentBPM;
      ToneRef.Transport.timeSignature = 4; 
      setIsAudioReady(true);
      return true;
    } catch (e) {
      console.error("Error starting Tone.js or initializing synths:", e);
      setIsAudioReady(false);
      return false;
    }
  }, [isAudioReady, currentBPM, currentVolume, createAccompanimentSynthInstance, createUserPianoSynthInstance]);


  useEffect(() => {
    if (!isAudioReady || !accompanimentSynth.current || !ToneRef || (accompanimentSynth.current as any).disposed) {
      if(accompanimentSequence.current) {
          accompanimentSequence.current.stop(0);
          accompanimentSequence.current.dispose();
          accompanimentSequence.current = null;
      }
      return;
    }

    if (accompanimentSequence.current) {
      accompanimentSequence.current.stop(0);
      accompanimentSequence.current.dispose();
      accompanimentSequence.current = null;
    }

    if (internalChordProgression.length > 0) {
      const newSequence = new ToneRef.Sequence<ChordWithIndex>(
        (scheduledTimeInSeconds, chordDef) => { 
          const notes = getChordNotes(chordDef.root, chordDef.type, ACCOMPANIMENT_BASE_OCTAVE, currentTranspositionRef.current);
          
          if (notes.length > 0 && accompanimentSynth.current && !(accompanimentSynth.current as any).disposed) {
            if (currentAccompanimentRhythmPatternRef.current === AccompanimentRhythmPattern.Custom) {
                const customChordBeatsConfig = customRhythmDataRef.current[chordDef.originalIndex];
                if (customChordBeatsConfig) {
                    // Iterate through the 4 main beats of the measure
                    for (let mainBeatIdx = 0; mainBeatIdx < 4; mainBeatIdx++) {
                        const fillType = customChordBeatsConfig[mainBeatIdx];
                        if (fillType === "off") {
                            continue; // Skip this main beat
                        }

                        let hitsForThisMainBeat: { subOffsetSixteenths: number; duration: Tone.Unit.Time }[] = [];

                        switch (fillType) {
                            case "1n": // Whole note fill
                            case "2n": // Half note fill
                            case "4n": // Quarter note fill
                                hitsForThisMainBeat.push({ subOffsetSixteenths: 0, duration: "4n" });
                                break;
                            case "8n": // Eighth note fill
                                hitsForThisMainBeat.push({ subOffsetSixteenths: 0, duration: "8n" });
                                hitsForThisMainBeat.push({ subOffsetSixteenths: 2, duration: "8n" }); // 2/16ths = 1/8th note
                                break;
                            case "16n": // Sixteenth note fill
                                hitsForThisMainBeat.push({ subOffsetSixteenths: 0, duration: "16n" });
                                hitsForThisMainBeat.push({ subOffsetSixteenths: 1, duration: "16n" });
                                hitsForThisMainBeat.push({ subOffsetSixteenths: 2, duration: "16n" });
                                hitsForThisMainBeat.push({ subOffsetSixteenths: 3, duration: "16n" });
                                break;
                        }

                        hitsForThisMainBeat.forEach(hit => {
                            try {
                                const mainBeatOffsetString = `0:${mainBeatIdx}:0` as Tone.Unit.Time;
                                const subHitOffsetString = `0:0:${hit.subOffsetSixteenths}` as Tone.Unit.Time;
                                
                                const mainBeatOffsetSec = ToneRef.Time(mainBeatOffsetString).toSeconds();
                                const subHitOffsetSec = ToneRef.Time(subHitOffsetString).toSeconds();
                                
                                const absoluteHitTimeInSeconds = scheduledTimeInSeconds + mainBeatOffsetSec + subHitOffsetSec;
                                
                                accompanimentSynth.current!.triggerAttackRelease(notes, hit.duration, absoluteHitTimeInSeconds);

                            } catch (e) {
                                console.error("Error processing custom hit:", e, {
                                    chord: `${chordDef.root}${chordDef.type}`,
                                    mainBeatIdx,
                                    fillType,
                                    hit
                                });
                            }
                        });
                    }
                }
            } else {
                const patternConfig = ACCOMPANIMENT_RHYTHM_PATTERN_OPTIONS.find(
                    p => p.value === currentAccompanimentRhythmPatternRef.current
                );
                if (patternConfig && patternConfig.hits) {
                    patternConfig.hits.forEach(hit => {
                        try {
                            const offsetInSeconds = ToneRef.Time(hit.offset as Tone.Unit.Time).toSeconds();
                            const absoluteHitTimeInSeconds = scheduledTimeInSeconds + offsetInSeconds;
                            accompanimentSynth.current!.triggerAttackRelease(notes, hit.duration, absoluteHitTimeInSeconds);
                        } catch (e) {
                            console.error("Error processing hit:", e, { chord: `${chordDef.root}${chordDef.type}`, hit });
                        }
                    });
                }
            }
          }
        },
        internalChordProgression,
        "1m" 
      );
      newSequence.loop = true;
      accompanimentSequence.current = newSequence;

      if (isAccompanimentPlaying && accompanimentSequence.current) {
        if (ToneRef.Transport.state !== 'started') {
          ToneRef.Transport.start(ToneRef.now() + 0.1);
          accompanimentSequence.current.start(ToneRef.Transport.seconds + 0.15);
        } else {
          if(accompanimentSequence.current.state !== 'started'){
            accompanimentSequence.current.start(ToneRef.Transport.seconds + 0.05);
          }
        }
      }
    } else if (isAccompanimentPlaying) {
        stopAccompaniment(); 
    }
  // Dependencies for sequence recreation
  }, [
    internalChordProgression, 
    isAudioReady, 
    currentAccompanimentInstrument, 
    isAccompanimentPlaying, 
    currentAccompanimentRhythmPattern, // For non-custom patterns
    customRhythmDataFromProps,      // For custom patterns
    currentTransposition            // For notes calculation
]);


  const attackPianoNote = useCallback((noteName: NoteName, octave: number, isComputerKey: boolean = false) => {
    const play = () => {
      if (pianoSynth.current && !(pianoSynth.current as any).disposed && ToneRef && !isPianoLoading) {
        const fullName = getNoteFullName(noteName, octave, currentTranspositionRef.current);
        pianoSynth.current.triggerAttack(fullName, ToneRef.now());
        if (isComputerKey) {
          activePianoNotesByKey.current.set(`${noteName}${octave}`, fullName);
        }
      } else {
         if (!isPianoLoading && (!pianoSynth.current || (pianoSynth.current as any).disposed)) {
            console.warn('Piano synth not available or disposed when play() was called. Attempting reinitialization.');
            initializeAudio().then(success => {
                if(success && pianoSynth.current && !(pianoSynth.current as any).disposed && !isPianoLoading){
                    const fullName = getNoteFullName(noteName, octave, currentTranspositionRef.current);
                    pianoSynth.current.triggerAttack(fullName, ToneRef.now());
                    if (isComputerKey) activePianoNotesByKey.current.set(`${noteName}${octave}`, fullName);
                }
            });
        }
      }
    };

    if (!isAudioReady) {
      initializeAudio().then((success) => {
        if (success) {
          if (!isPianoLoading) {
            play();
          }
        }
      });
    } else {
      if (!isPianoLoading) {
        play();
      }
    }
  }, [isAudioReady, initializeAudio, isPianoLoading]);

  const releasePianoNote = useCallback((noteName: NoteName, octave: number, isComputerKey: boolean = false) => {
    let noteToActuallyRelease: string | null = null;
    const keyString = `${noteName}${octave}`;

    if (isComputerKey) {
        noteToActuallyRelease = getNoteFullName(noteName, octave, currentTranspositionRef.current);
        if (activePianoNotesByKey.current.has(keyString)) {
            activePianoNotesByKey.current.delete(keyString);
        }
    } else {
      noteToActuallyRelease = getNoteFullName(noteName, octave, currentTranspositionRef.current);
    }

    if (noteToActuallyRelease && pianoSynth.current && !(pianoSynth.current as any).disposed && ToneRef && !isPianoLoading) {
      const notesToReleaseArray = [noteToActuallyRelease];
      pianoSynth.current.triggerRelease(notesToReleaseArray, ToneRef.now() + PIANO_NOTE_RELEASE_TIME);
    }
  }, [isPianoLoading]);


  const startAccompaniment = useCallback(async () => {
    if (!ToneRef) return;
    const ready = isAudioReady ? true : await initializeAudio();
    if (!ready) {
        console.warn("Audio not ready, cannot start accompaniment.");
        return;
    }
    if (internalChordProgression.length === 0) {
      console.warn("Cannot start accompaniment: chord progression is empty.");
      return;
    }
    if (!isAccompanimentPlaying) {
        setIsAccompanimentPlaying(true);
    } else {
        if (ToneRef.Transport.state !== 'started') {
            ToneRef.Transport.start(ToneRef.now() + 0.05);
            if (accompanimentSequence.current && accompanimentSequence.current.state !== 'started') {
                accompanimentSequence.current.start(ToneRef.Transport.seconds + 0.1);
            }
        }
    }
  }, [isAudioReady, initializeAudio, internalChordProgression.length, isAccompanimentPlaying]);

  const stopAccompaniment = useCallback(() => {
    if (!ToneRef) return;
    setIsAccompanimentPlaying(false); 
    if (ToneRef.Transport.state === 'started') {
      ToneRef.Transport.stop(ToneRef.now());
    }
    if (accompanimentSynth.current && accompanimentSynth.current instanceof ToneRef.PolySynth) {
        accompanimentSynth.current.releaseAll(ToneRef.now());
    }
  }, []);

  const setAccompanimentBPM = useCallback((bpm: number) => {
    setCurrentBPM(bpm);
    if (isAudioReady && ToneRef) {
      ToneRef.Transport.bpm.value = bpm;
    }
  }, [isAudioReady]);

  const setAccompanimentVolume = useCallback((volume: number) => {
    setCurrentVolume(volume);
    if (isAudioReady && accompanimentVolumeNode.current && !accompanimentVolumeNode.current.disposed) {
      accompanimentVolumeNode.current.volume.value = volume;
    }
  }, [isAudioReady]);

  const setAccompanimentInstrument = useCallback((instrument: AccompanimentInstrument) => {
    if (currentAccompanimentInstrumentRef.current === instrument) return;
    setCurrentAccompanimentInstrument(instrument); 

    if (isAudioReady && accompanimentVolumeNode.current && ToneRef && !accompanimentVolumeNode.current.disposed) {
      if (accompanimentSequence.current) {
        accompanimentSequence.current.stop(0); 
      }
      if (accompanimentSynth.current) {
        if (accompanimentSynth.current instanceof ToneRef.PolySynth) {
          accompanimentSynth.current.releaseAll(ToneRef.now());
        }
        accompanimentSynth.current.dispose();
      }
      accompanimentSynth.current = createAccompanimentSynthInstance(instrument, accompanimentVolumeNode.current);
    }
  }, [isAudioReady, createAccompanimentSynthInstance]);

  const setAccompanimentRhythmPattern = useCallback((pattern: AccompanimentRhythmPattern) => {
    setCurrentAccompanimentRhythmPattern(pattern);
  }, []);


  const setUserPianoInstrument = useCallback((instrument: UserPianoInstrument) => {
    if (currentUserPianoInstrumentRef.current === instrument && !isPianoLoading) return;
     setCurrentUserPianoInstrument(instrument);
     if (isAudioReady && ToneRef) {
        createUserPianoSynthInstance(instrument);
     } else if (!isAudioReady && instrument === UserPianoInstrument.SampledGrand) {
        setIsPianoLoading(true);
     }
  }, [isAudioReady, createUserPianoSynthInstance, isPianoLoading]);

  const setTransposition = useCallback((semitones: number) => {
    if (pianoSynth.current && !(pianoSynth.current as any).disposed && ToneRef && !isPianoLoading) {
         if (pianoSynth.current instanceof ToneRef.PolySynth) {
            pianoSynth.current.releaseAll(ToneRef.now());
         }
    }
    activePianoNotesByKey.current.clear();
    setCurrentTransposition(semitones);
  }, [isPianoLoading]);

  useEffect(() => {
    return () => {
      if (ToneRef) {
        if (ToneRef.Transport.state !== 'stopped') ToneRef.Transport.stop();
        ToneRef.Transport.cancel();
      }
      if (pianoSynth.current && !(pianoSynth.current as any).disposed) {
        if (pianoSynth.current instanceof ToneRef.PolySynth) pianoSynth.current.releaseAll();
        pianoSynth.current.dispose();
        pianoSynth.current = null;
      }
      if (accompanimentSynth.current && !(accompanimentSynth.current as any).disposed) {
        if (accompanimentSynth.current instanceof ToneRef.PolySynth) accompanimentSynth.current.releaseAll();
        accompanimentSynth.current.dispose();
        accompanimentSynth.current = null;
      }
      if (accompanimentVolumeNode.current && !accompanimentVolumeNode.current.disposed) {
        accompanimentVolumeNode.current.dispose();
        accompanimentVolumeNode.current = null;
      }
      if (accompanimentSequence.current) {
        accompanimentSequence.current.stop(0);
        accompanimentSequence.current.clear();
        accompanimentSequence.current.dispose();
        accompanimentSequence.current = null;
      }
      activePianoNotesByKey.current.clear();
    };
  }, []);

  return {
    attackPianoNote,
    releasePianoNote,
    startAccompaniment,
    stopAccompaniment,
    setAccompanimentBPM,
    setAccompanimentVolume,
    setAccompanimentInstrument,
    setAccompanimentRhythmPattern,
    setUserPianoInstrument,
    setTransposition,
    currentTransposition,
    isAccompanimentPlaying,
    currentBPM,
    currentVolume,
    currentAccompanimentInstrument: currentAccompanimentInstrument,
    currentAccompanimentRhythmPattern: currentAccompanimentRhythmPattern,
    currentUserPianoInstrument: currentUserPianoInstrument,
    isAudioReady,
    isPianoLoading
  };
};
