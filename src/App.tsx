




import React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';

import PianoKeyboard from './components/PianoKeyboard';
import TranspositionControl from './components/TranspositionControl';
import ChordSelector from './components/ChordSelector';
import ChordProgressionEditor from './components/ChordProgressionEditor';
import AccompanimentControls from './components/AccompanimentControls';
import SavedProgressions from './components/SavedProgressions';
import TutorialModal from './components/TutorialModal';
import GeminiChordGenerator from './components/GeminiChordGenerator';
import ApiSettings from './components/ApiSettings'; // Import the new component
import { useAudio, UseAudioReturn } from './hooks/useAudio';
import { useAiGeneration } from './hooks/useAiGeneration';
import {
  chooseVoicings, generateBassline, generateChordProgression,
  generateDrumPattern, reharmonizeProgression
} from './services/gemini';
import {
  NoteName, UserPianoInstrument,
  SavedProgressionEntry, SAVED_PROGRESSION_SCHEMA_VERSION, DrumPattern, BassPattern, BassInstrument, AiNoteEvent, GenerationKind
} from './types';
import {
  KEY_MAPPING, USER_PIANO_INSTRUMENT_OPTIONS,
  DEFAULT_DRUMS_ENABLED, DEFAULT_DRUM_VOLUME, DEFAULT_DRUM_PATTERN,
  DEFAULT_BASS_ENABLED, DEFAULT_BASS_VOLUME, DEFAULT_BASS_PATTERN, DEFAULT_BASS_INSTRUMENT,
  DEFAULT_USER_PIANO_VOLUME, MIN_USER_PIANO_VOLUME, MAX_USER_PIANO_VOLUME, ACCOMPANIMENT_BASE_OCTAVE,
  DEFAULT_BPM, DEFAULT_TRANSPOSE_SEMITONES, DEFAULT_USER_PIANO_INSTRUMENT,
  DEFAULT_REVERB_LEVEL, DEFAULT_DELAY_LEVEL, DEFAULT_SWING
} from './constants';
import {
  getVoicingOptionsForChord,
  loadSavedProgressions, persistSavedProgressions
} from './utils';
import { useChordProgression } from './hooks/useChordProgression';


const App: React.FC = () => {
  // `pressedComputerKeys` drives the highlight on the on-screen keyboard, while
  // `heldComputerKeys` is the mutable set the key handlers read to de-duplicate
  // auto-repeat. Keeping them separate lets the listener effect stay mounted.
  const [pressedComputerKeys, setPressedComputerKeys] = useState<Set<string>>(new Set());
  const heldComputerKeys = useRef<Set<string>>(new Set());

  // Main piano state
  const [userPianoVolume, setUserPianoVolume] = useState<number>(DEFAULT_USER_PIANO_VOLUME);

  // Drum State
  const [drumsEnabled, setDrumsEnabled] = useState<boolean>(DEFAULT_DRUMS_ENABLED);
  const [drumVolume, setDrumVolume] = useState<number>(DEFAULT_DRUM_VOLUME);
  const [drumPattern, setDrumPattern] = useState<DrumPattern>(DEFAULT_DRUM_PATTERN);

  // Bass State
  const [bassEnabled, setBassEnabled] = useState<boolean>(DEFAULT_BASS_ENABLED);
  const [bassVolume, setBassVolume] = useState<number>(DEFAULT_BASS_VOLUME);
  const [bassPattern, setBassPattern] = useState<BassPattern>(DEFAULT_BASS_PATTERN);
  const [bassInstrument, setBassInstrument] = useState<BassInstrument>(DEFAULT_BASS_INSTRUMENT);
  const [aiBassEvents, setAiBassEvents] = useState<AiNoteEvent[] | null>(null);

  // API Key and AI Generation State
  // Dev-only convenience: pre-fill from .env.local (VITE_GEMINI_API_KEY).
  // Guarded by import.meta.env.DEV so the key can never be inlined into the
  // public production bundle deployed to GitHub Pages.
  const [apiKey, setApiKey] = useState<string | null>(() =>
    (import.meta.env.DEV ? import.meta.env.VITE_GEMINI_API_KEY : undefined) ||
    localStorage.getItem('gemini_api_key')
  );
  // Loading/error bookkeeping for all five AI features lives in this hook.
  const { generationState, run, reportError } = useAiGeneration();


  // New state for playback highlighting and effects
  const [currentlyPlayingChordIndex, setCurrentlyPlayingChordIndex] = useState<number | null>(null);
  const [reverbLevel, setReverbLevel] = useState(DEFAULT_REVERB_LEVEL);
  const [delayLevel, setDelayLevel] = useState(DEFAULT_DELAY_LEVEL);
  const [swing, setSwing] = useState(DEFAULT_SWING);

  // New state for UI interactivity
  const [isBeat, setIsBeat] = useState(false);
  const [showAccompanimentNotes, setShowAccompanimentNotes] = useState(true);
  const [accompanimentActiveNotes, setAccompanimentActiveNotes] = useState<Set<string>>(new Set());
  const [isTutorialOpen, setIsTutorialOpen] = useState(false); // State for the tutorial modal

  // Reading and migrating stored entries lives in utils/progressionStorage so that
  // load and save share one code path. It used to be inlined here and duplicated
  // again in handleLoadProgression, and the two copies had drifted apart.
  const [savedProgressions, setSavedProgressions] =
    useState<Record<string, SavedProgressionEntry>>(loadSavedProgressions);

  useEffect(() => {
    persistSavedProgressions(savedProgressions);
  }, [savedProgressions]);

  // useAudio needs the progression, and the progression hook needs to be able to
  // stop playback. Break that cycle by routing the stop through a ref that is
  // populated once useAudio has run.
  const audioRef = useRef<UseAudioReturn | null>(null);

  const stopPlayback = useCallback(() => {
    audioRef.current?.stopAccompaniment();
    setCurrentlyPlayingChordIndex(null);
  }, []);

  const clearAiBass = useCallback(() => {
    setAiBassEvents(null);
    setBassPattern(DEFAULT_BASS_PATTERN);
  }, []);

  // Owns the chords plus the drum grids and rhythm grids that must stay aligned
  // with them. See useChordProgression for why those three live together.
  const {
    progression: chordProgression,
    progressionWithIndices,
    customRhythms,
    customDrumData,
    accompanimentLayers,
    drumPatternClipboard,
    addChord: handleAddChord,
    removeChord: handleRemoveChord,
    clearProgression: handleClearProgression,
    reorderProgression: handleReorderProgression,
    updateChordInversion: handleUpdateChordInversion,
    replaceProgression,
    restoreProgression,
    updateCustomRhythmBeat: handleUpdateCustomRhythmBeat,
    updateCustomDrumCell: handleUpdateCustomDrumCell,
    setCustomDrumPatternForChord: handleSetCustomDrumPatternForChord,
    copyDrumPattern: handleCopyDrumPattern,
    pasteDrumPattern: handlePasteDrumPattern,
    addAccompanimentLayer: handleAddAccompanimentLayer,
    removeAccompanimentLayer: handleRemoveAccompanimentLayer,
    updateAccompanimentLayer: handleUpdateAccompanimentLayer,
  } = useChordProgression({ stopPlayback, onProgressionReplaced: clearAiBass });

  const audio: UseAudioReturn = useAudio({
    progression: progressionWithIndices,
    customRhythms,
    accompanimentLayers,
    drumsEnabled,
    drumVolume,
    drumPattern,
    customDrumData,
    bassEnabled,
    bassVolume,
    bassPattern,
    bassInstrument,
    aiBassEvents,
    initialUserPianoVolume: userPianoVolume,
    showAccompanimentNotes,
    onPlayingChordIndexChange: setCurrentlyPlayingChordIndex,
    onBeat: setIsBeat,
    setAccompanimentNotes: setAccompanimentActiveNotes,
  });
  
  // Populate the ref the progression hook stops playback through.
  useEffect(() => {
    audioRef.current = audio;
  }, [audio]);

  const handleStopAccompaniment = stopPlayback;

  const handleToggleAccompaniment = useCallback(() => {
    if (audio.isAccompanimentPlaying) {
        handleStopAccompaniment();
    } else {
        // startAccompaniment in useAudio hook already checks for empty progression
        audio.startAccompaniment();
    }
  }, [audio, handleStopAccompaniment]);

  const handleUserPianoVolumeChange = (newVolume: number) => {
    setUserPianoVolume(newVolume);
    audio.setUserPianoVolume(newVolume);
  };

  const handleDrumVolumeChange = (newVolume: number) => {
    setDrumVolume(newVolume);
    audio.setDrumVolume(newVolume);
  };

  const handleBassVolumeChange = (newVolume: number) => {
    setBassVolume(newVolume);
    audio.setBassVolume(newVolume);
  };
  
  const handleReverbChange = useCallback((level: number) => {
    setReverbLevel(level);
    audio.setReverbLevel(level);
  }, [audio]);
  
  const handleDelayChange = useCallback((level: number) => {
    setDelayLevel(level);
    audio.setDelayLevel(level);
  }, [audio]);

  const handleSwingChange = useCallback((amount: number) => {
    setSwing(amount);
    audio.setSwing(amount);
  }, [audio]);

  const handleSaveCurrentProgression = useCallback(() => {
    if (chordProgression.length === 0) {
      alert("和弦進行是空的，無法儲存。");
      return;
    }
    const name: string | null = window.prompt("請輸入此和弦進行的名稱：");
    if (name === null) return;
    const trimmedName = name.trim();
    if (trimmedName === "") {
      alert("名稱不能為空。");
      return;
    }
    setSavedProgressions(prev => ({
      ...prev,
      [trimmedName]: {
        version: SAVED_PROGRESSION_SCHEMA_VERSION,
        progression: chordProgression,
        customRhythms: customRhythms,
        accompanimentLayers: accompanimentLayers,
        drumsEnabled,
        drumVolume,
        drumPattern,
        customDrumData,
        bassEnabled,
        bassVolume,
        bassPattern,
        bassInstrument,
        aiBassEvents,
        // Global mix and groove. These were previously dropped on save, so a
        // reloaded progression played back at whatever tempo, transposition and
        // effect levels happened to be set at the time.
        bpm: audio.currentBPM,
        transposition: audio.currentTransposition,
        userPianoVolume,
        userPianoInstrument: audio.currentUserPianoInstrument,
        reverbLevel,
        delayLevel,
        swing,
      }
    }));
    alert(`和弦進行 "${trimmedName}" 已儲存！`);
  }, [chordProgression, customRhythms, accompanimentLayers, drumsEnabled, drumVolume, drumPattern, customDrumData, bassEnabled, bassVolume, bassPattern, bassInstrument, aiBassEvents, audio.currentBPM, audio.currentTransposition, audio.currentUserPianoInstrument, userPianoVolume, reverbLevel, delayLevel, swing]);

  const handleLoadProgression = useCallback((name: string) => {
    const savedEntry = savedProgressions[name];
    if (!savedEntry) {
      alert(`無法載入和弦進行 "${name}"。`);
      return;
    }

    // Entries are normalised by loadSavedProgressions() when they are read, so
    // every field below is already migrated and defaulted. This path used to
    // repeat the migration inline, with subtly different fallbacks.
    restoreProgression(savedEntry);

    setDrumsEnabled(savedEntry.drumsEnabled ?? DEFAULT_DRUMS_ENABLED);
    setDrumVolume(savedEntry.drumVolume ?? DEFAULT_DRUM_VOLUME);
    setDrumPattern(savedEntry.drumPattern ?? DEFAULT_DRUM_PATTERN);

    setBassEnabled(savedEntry.bassEnabled ?? DEFAULT_BASS_ENABLED);
    setBassVolume(savedEntry.bassVolume ?? DEFAULT_BASS_VOLUME);
    setBassPattern(savedEntry.bassPattern ?? DEFAULT_BASS_PATTERN);
    setBassInstrument(savedEntry.bassInstrument ?? DEFAULT_BASS_INSTRUMENT);
    setAiBassEvents(savedEntry.aiBassEvents ?? null);

    // Global mix and groove. Restoring these is what makes a saved progression
    // actually play back the way it sounded when it was saved.
    const restoredPianoVolume = savedEntry.userPianoVolume ?? DEFAULT_USER_PIANO_VOLUME;
    const restoredReverb = savedEntry.reverbLevel ?? DEFAULT_REVERB_LEVEL;
    const restoredDelay = savedEntry.delayLevel ?? DEFAULT_DELAY_LEVEL;
    const restoredSwing = savedEntry.swing ?? DEFAULT_SWING;

    audio.setAccompanimentBPM(savedEntry.bpm ?? DEFAULT_BPM);
    audio.setTransposition(savedEntry.transposition ?? DEFAULT_TRANSPOSE_SEMITONES);
    audio.setUserPianoInstrument(
      savedEntry.userPianoInstrument ?? DEFAULT_USER_PIANO_INSTRUMENT
    );

    setUserPianoVolume(restoredPianoVolume);
    audio.setUserPianoVolume(restoredPianoVolume);
    setReverbLevel(restoredReverb);
    audio.setReverbLevel(restoredReverb);
    setDelayLevel(restoredDelay);
    audio.setDelayLevel(restoredDelay);
    setSwing(restoredSwing);
    audio.setSwing(restoredSwing);

    alert(`和弦進行 "${name}" 已載入！`);
  }, [savedProgressions, audio, restoreProgression]);

  const handleDeleteProgression = useCallback((name: string) => {
    if (window.confirm(`確定要刪除和弦進行 "${name}" 嗎？`)) {
        setSavedProgressions(prev => {
        const newState = { ...prev };
        delete newState[name];
        return newState;
        });
        alert(`和弦進行 "${name}" 已刪除！`);
    }
  }, []);

  const handleNoteAttack = useCallback((noteName: NoteName, octave: number, isComputerKey: boolean = false) => {
    if (audio.isPianoLoading) return;
    audio.attackPianoNote(noteName, octave, isComputerKey);
  }, [audio]);

  const handleNoteRelease = useCallback((noteName: NoteName, octave: number, isComputerKey: boolean = false) => {
    if (audio.isPianoLoading) return;
    audio.releasePianoNote(noteName, octave, isComputerKey);
  }, [audio]);

  const handleApiKeyChange = (key: string | null) => {
    setApiKey(key);
  };
  
  /**
   * Applies an AI-produced progression. Validation happens in the gemini service
   * and the parallel-array bookkeeping in useChordProgression, so this is just an
   * alias kept for readability at the call sites.
   */
  const applyGeneratedProgression = replaceProgression;

  /** Every AI feature needs a key; report it the same way for all of them. */
  const requireApiKey = useCallback((kind: GenerationKind): string | null => {
    if (!apiKey) {
      reportError(kind, "請先在 API 設定中輸入您的 Gemini API 金鑰。");
      return null;
    }
    return apiKey;
  }, [apiKey, reportError]);

  const handleGenerateProgression = useCallback(async (prompt: string, numChords: string) => {
    const key = requireApiKey('chords');
    if (!key) return;
    if (chordProgression.length > 0 && !window.confirm("AI 將會取代您目前的和弦進行。確定要繼續嗎？")) return;

    const progression = await run(
      { kind: 'chords', errorLabel: 'AI 和弦生成失敗' },
      () => generateChordProgression(key, prompt, numChords)
    );
    if (progression) applyGeneratedProgression(progression);
  }, [requireApiKey, chordProgression.length, run, applyGeneratedProgression]);

  const handleStyleTransfer = useCallback(async (prompt: string) => {
    if (chordProgression.length === 0) return;
    const key = requireApiKey('style');
    if (!key) return;

    const progression = await run(
      { kind: 'style', errorLabel: '風格轉換失敗' },
      () => reharmonizeProgression(key, chordProgression, prompt)
    );
    if (progression) applyGeneratedProgression(progression);
  }, [chordProgression, requireApiKey, run, applyGeneratedProgression]);

  const handleSmartVoicing = useCallback(async () => {
    if (chordProgression.length < 2) return;
    const key = requireApiKey('voicing');
    if (!key) return;
    if (!window.confirm("這將會由 AI 自動調整您所有和弦的轉位以獲得更流暢、音高更穩定的聲音。確定要繼續嗎？")) return;

    const voicingOptions = chordProgression.map(chord => ({
      chord_name: `${chord.root}${chord.type}`,
      voicings: getVoicingOptionsForChord(chord, ACCOMPANIMENT_BASE_OCTAVE),
    }));

    const inversions = await run(
      { kind: 'voicing', errorLabel: 'AI 智慧轉位失敗' },
      () => chooseVoicings(key, chordProgression, voicingOptions)
    );
    if (!inversions) return;

    // Apply each chosen inversion through the progression hook so the chords stay
    // the single source of truth.
    chordProgression.forEach((chord, index) => {
      handleUpdateChordInversion(chord.id, inversions[index]);
    });
  }, [chordProgression, requireApiKey, run, handleUpdateChordInversion]);

  const handleGenerateAIBassline = useCallback(async (prompt: string) => {
    if (chordProgression.length === 0) return;
    const key = requireApiKey('bass');
    if (!key) return;

    const events = await run(
      { kind: 'bass', errorLabel: 'AI 貝斯線生成失敗' },
      () => generateBassline(key, chordProgression, prompt)
    );
    if (events) setAiBassEvents(events);
  }, [chordProgression, requireApiKey, run]);


  const handleGenerateDrumPattern = useCallback(async (prompt: string, chordOriginalIndex: number) => {
    const key = requireApiKey('drums');
    if (!key) return;

    const pattern = await run(
      { kind: 'drums', errorLabel: '鼓組生成失敗', drumChordIndex: chordOriginalIndex },
      () => generateDrumPattern(key, prompt)
    );
    if (pattern) handleSetCustomDrumPatternForChord(chordOriginalIndex, pattern);
  }, [requireApiKey, run, handleSetCustomDrumPatternForChord]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      
      if (event.code === 'Space') {
          event.preventDefault();
          handleToggleAccompaniment();
          return;
      }
      
      const key = event.key.toLowerCase();
      const noteMapping = KEY_MAPPING[key];
      
      if (noteMapping && !audio.isPianoLoading) {
        event.preventDefault();
        const { note, octave } = noteMapping;
        const noteFullName = `${note}${octave}`;

        // The ref, not the state, is the source of truth for which keys are
        // physically held. Reading the state Set here would mean listing it as a
        // dependency, and since it changes on every keystroke the listeners would
        // be detached and reattached mid-performance.
        if (!heldComputerKeys.current.has(noteFullName)) {
            heldComputerKeys.current.add(noteFullName);
            handleNoteAttack(note, octave, true);
            setPressedComputerKeys(new Set(heldComputerKeys.current));
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const target = event.target as HTMLElement;
       if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const noteMapping = KEY_MAPPING[key];
      if (noteMapping && !audio.isPianoLoading) {
        event.preventDefault();
        const { note, octave } = noteMapping;
        const noteFullName = `${note}${octave}`;
        
        heldComputerKeys.current.delete(noteFullName);
        handleNoteRelease(note, octave, true);
        setPressedComputerKeys(new Set(heldComputerKeys.current));
      }
    };

    // If the window loses focus while a key is held, the matching keyup is
    // delivered to whatever took focus, so the note would sustain forever and stay
    // highlighted. Release everything still held when we stop being the active
    // window. KEY_MAPPING is keyed by keyboard character, so walk it to recover
    // the note and octave for each stuck entry.
    const releaseAllHeldKeys = () => {
      if (heldComputerKeys.current.size === 0) return;

      for (const mapping of Object.values(KEY_MAPPING)) {
        const noteFullName = `${mapping.note}${mapping.octave}`;
        if (heldComputerKeys.current.has(noteFullName)) {
          handleNoteRelease(mapping.note, mapping.octave, true);
        }
      }

      heldComputerKeys.current.clear();
      setPressedComputerKeys(new Set());
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', releaseAllHeldKeys);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', releaseAllHeldKeys);
    };
  }, [audio.isPianoLoading, handleNoteAttack, handleNoteRelease, handleToggleAccompaniment]);


  return (
    <>
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
      <div className="min-h-screen bg-gray-800 text-gray-100 selection:bg-purple-500 selection:text-white">
        <div className="container mx-auto p-2 sm:p-4 flex flex-col items-center space-y-4 sm:space-y-6">
          <header className="text-center my-3 sm:my-5">
            <h1 className="text-3xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
              互動鋼琴工作室
            </h1>
            <p className="text-gray-300 mt-2 text-xs sm:text-base">釋放您的音樂創意！在這裡，您不僅可以自由彈奏、編曲，更能讓 AI 成為您的智慧編曲夥伴，輕鬆打造專屬伴奏。</p>
            <button
              onClick={() => setIsTutorialOpen(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              使用教學
            </button>
          </header>

          <PianoKeyboard
              onNoteAttack={handleNoteAttack}
              onNoteRelease={handleNoteRelease}
              pressedKeys={pressedComputerKeys}
              accompanimentActiveNotes={showAccompanimentNotes ? accompanimentActiveNotes : new Set()}
          />

          <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4 sm:space-y-6">
              <TranspositionControl
                currentTransposition={audio.currentTransposition}
                onTransposeChange={audio.setTransposition}
              />
              <div className="p-4 bg-gray-700 rounded-lg shadow-md space-y-3">
                   <h3 className="text-lg font-semibold text-gray-100">主鍵盤設定 (Main Keyboard)</h3>
                   <div>
                      <label htmlFor="userPianoInstrument" className="block text-sm font-medium text-gray-300 mb-1">音色 (Instrument)</label>
                      <select
                          id="userPianoInstrument"
                          value={audio.currentUserPianoInstrument}
                          onChange={(e) => audio.setUserPianoInstrument(e.target.value as UserPianoInstrument)}
                          className="w-full p-2.5 bg-gray-600 border border-gray-500 rounded-md text-gray-100 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          aria-label="選擇您的鋼琴音色"
                          disabled={audio.isPianoLoading}
                      >
                          {USER_PIANO_INSTRUMENT_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                      </select>
                      {audio.isPianoLoading && (
                          <p className="text-xs text-yellow-400 text-center mt-2">鋼琴音色載入中...</p>
                      )}
                   </div>
                   <div>
                      <label htmlFor="userPianoVolume" className="block text-sm font-medium text-gray-300 mb-1">音量 (Volume): {userPianoVolume.toFixed(0)} dB</label>
                      <input
                          type="range"
                          id="userPianoVolume"
                          min={MIN_USER_PIANO_VOLUME}
                          max={MAX_USER_PIANO_VOLUME}
                          step="1"
                          value={userPianoVolume}
                          onChange={(e) => handleUserPianoVolumeChange(parseFloat(e.target.value))}
                          className="w-full h-2.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                          aria-label="調整主鍵盤音量"
                      />
                   </div>
                   <div className="flex items-center justify-between pt-2">
                      <label htmlFor="showAccompanimentNotes" className="text-sm font-medium text-gray-300">顯示伴奏音符</label>
                      <button
                          id="showAccompanimentNotes"
                          onClick={() => setShowAccompanimentNotes(!showAccompanimentNotes)}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${showAccompanimentNotes ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500 hover:bg-gray-400'}`}
                          aria-pressed={showAccompanimentNotes}
                      >
                          {showAccompanimentNotes ? '已啟用' : '已停用'}
                      </button>
                   </div>
              </div>
              <ChordSelector onAddChord={handleAddChord} />
              <ApiSettings apiKey={apiKey} onApiKeyChange={handleApiKeyChange} />
              <GeminiChordGenerator 
                onGenerate={handleGenerateProgression}
                isGenerating={generationState.isLoading && generationState.type === 'chords'}
                generationError={generationState.type === 'chords' ? generationState.error : null}
                isApiKeySet={!!apiKey}
              />
              <SavedProgressions
                savedProgressions={savedProgressions}
                onLoadProgression={handleLoadProgression}
                onDeleteProgression={handleDeleteProgression}
              />
            </div>
            <div className="space-y-4 sm:space-y-6 flex flex-col">
               <ChordProgressionEditor
                progression={chordProgression}
                onRemoveChord={handleRemoveChord}
                onClearProgression={handleClearProgression}
                onSaveProgression={handleSaveCurrentProgression}
                onReorderProgression={handleReorderProgression}
                onUpdateChordInversion={handleUpdateChordInversion}
                currentlyPlayingChordIndex={currentlyPlayingChordIndex}
                onStyleTransfer={handleStyleTransfer}
                isGeneratingStyle={generationState.isLoading && generationState.type === 'style'}
                isApiKeySet={!!apiKey}
                onSmartVoicing={handleSmartVoicing}
                isGeneratingVoicing={generationState.isLoading && generationState.type === 'voicing'}
              />
              <AccompanimentControls
                progression={progressionWithIndices}
                generationState={generationState}
                isApiKeySet={!!apiKey}
                transport={{
                  bpm: audio.currentBPM,
                  onBpmChange: audio.setAccompanimentBPM,
                  isBeat,
                  isPlaying: audio.isAccompanimentPlaying,
                  onPlay: audio.startAccompaniment,
                  onStop: handleStopAccompaniment,
                  isAudioReady: audio.isAudioReady,
                }}
                layers={{
                  accompanimentLayers,
                  onAddAccompanimentLayer: handleAddAccompanimentLayer,
                  onRemoveAccompanimentLayer: handleRemoveAccompanimentLayer,
                  onUpdateAccompanimentLayer: handleUpdateAccompanimentLayer,
                  customRhythms,
                  onUpdateCustomBeat: handleUpdateCustomRhythmBeat,
                }}
                effects={{
                  reverbLevel,
                  onReverbLevelChange: handleReverbChange,
                  delayLevel,
                  onDelayLevelChange: handleDelayChange,
                  swing,
                  onSwingChange: handleSwingChange,
                }}
                bass={{
                  bassEnabled,
                  onBassEnabledChange: setBassEnabled,
                  bassVolume,
                  onBassVolumeChange: handleBassVolumeChange,
                  bassPattern,
                  onBassPatternChange: setBassPattern,
                  bassInstrument,
                  onBassInstrumentChange: setBassInstrument,
                  onGenerateAIBassline: handleGenerateAIBassline,
                }}
                drums={{
                  drumsEnabled,
                  onDrumsEnabledChange: setDrumsEnabled,
                  drumVolume,
                  onDrumVolumeChange: handleDrumVolumeChange,
                  drumPattern,
                  onDrumPatternChange: setDrumPattern,
                  customDrumData,
                  onUpdateCustomDrumCell: handleUpdateCustomDrumCell,
                  onGenerateDrumPattern: handleGenerateDrumPattern,
                  drumPatternClipboard,
                  onCopyDrumPattern: handleCopyDrumPattern,
                  onPasteDrumPattern: handlePasteDrumPattern,
                }}
              />
            </div>
          </div>
          <footer className="text-center text-gray-500 text-xs sm:text-sm mt-6 sm:mt-8 pb-4">
            <p>技術支持：React, Tailwind CSS, Tone.js, Gemini API</p>
            <p>&copy; {new Date().getFullYear()} by hsuchen</p>
          </footer>
        </div>
      </div>
    </>
  );
};

export default App;