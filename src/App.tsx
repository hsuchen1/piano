
import React from 'react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import PianoKeyboard from './components/PianoKeyboard.tsx';
import TranspositionControl from './components/TranspositionControl.tsx';
import ChordSelector from './components/ChordSelector.tsx';
import ChordProgressionEditor from './components/ChordProgressionEditor.tsx';
import AccompanimentControls from './components/AccompanimentControls.tsx';
import SavedProgressions from './components/SavedProgressions.tsx';
import { useAudio, UseAudioReturn } from './hooks/useAudio.ts';
import {
  ChordDefinition, NoteName, UserPianoInstrument, AccompanimentRhythmPattern, BeatDuration,
  SavedProgressionEntry, DrumPattern, DrumInstrument, BassPattern, BassInstrument, CustomDrumProgressionData, CustomDrumChordPattern
} from './types';
import {
  KEY_MAPPING, USER_PIANO_INSTRUMENT_OPTIONS, DEFAULT_CUSTOM_BEAT_DURATION, SAVED_PROGRESSIONS_LOCAL_STORAGE_KEY,
  DEFAULT_DRUMS_ENABLED, DEFAULT_DRUM_VOLUME, DEFAULT_DRUM_PATTERN,
  DEFAULT_BASS_ENABLED, DEFAULT_BASS_VOLUME, DEFAULT_BASS_PATTERN, DEFAULT_BASS_INSTRUMENT,
  createDefaultCustomDrumChordPattern, DEFAULT_USER_PIANO_VOLUME, MIN_USER_PIANO_VOLUME, MAX_USER_PIANO_VOLUME
} from './constants';

export interface ChordWithIndex extends ChordDefinition {
  originalIndex: number;
}

const App: React.FC = () => {
  const [chordProgression, setChordProgression] = useState<ChordDefinition[]>([]);
  const [pressedComputerKeys, setPressedComputerKeys] = useState<Set<string>>(new Set());
  const [customRhythmData, setCustomRhythmData] = useState<BeatDuration[][]>([]);

  // Main piano state
  const [userPianoVolume, setUserPianoVolume] = useState<number>(DEFAULT_USER_PIANO_VOLUME);

  // Drum State
  const [drumsEnabled, setDrumsEnabled] = useState<boolean>(DEFAULT_DRUMS_ENABLED);
  const [drumVolume, setDrumVolume] = useState<number>(DEFAULT_DRUM_VOLUME);
  const [drumPattern, setDrumPattern] = useState<DrumPattern>(DEFAULT_DRUM_PATTERN);
  const [customDrumData, setCustomDrumData] = useState<CustomDrumProgressionData>([]);

  // Bass State
  const [bassEnabled, setBassEnabled] = useState<boolean>(DEFAULT_BASS_ENABLED);
  const [bassVolume, setBassVolume] = useState<number>(DEFAULT_BASS_VOLUME);
  const [bassPattern, setBassPattern] = useState<BassPattern>(DEFAULT_BASS_PATTERN);
  const [bassInstrument, setBassInstrument] = useState<BassInstrument>(DEFAULT_BASS_INSTRUMENT);


  const [savedProgressions, setSavedProgressions] = useState<Record<string, SavedProgressionEntry>>(() => {
    let loadedProgressions: Record<string, SavedProgressionEntry> = {};
    try {
      const item = window.localStorage.getItem(SAVED_PROGRESSIONS_LOCAL_STORAGE_KEY);
      if (item) {
        const parsedItem = JSON.parse(item);
        Object.keys(parsedItem).forEach(key => {
          const entry = parsedItem[key];
          if (entry && entry.progression) { 
            loadedProgressions[key] = {
              progression: entry.progression,
              customRhythm: entry.customRhythm || Array(entry.progression.length).fill(null).map(() => Array(4).fill(DEFAULT_CUSTOM_BEAT_DURATION)),
              drumsEnabled: entry.drumsEnabled === undefined ? DEFAULT_DRUMS_ENABLED : entry.drumsEnabled,
              drumVolume: entry.drumVolume === undefined ? DEFAULT_DRUM_VOLUME : entry.drumVolume,
              drumPattern: entry.drumPattern === undefined ? DEFAULT_DRUM_PATTERN : entry.drumPattern,
              customDrumData: entry.customDrumData || Array(entry.progression.length).fill(null).map(() => createDefaultCustomDrumChordPattern()),
              bassEnabled: entry.bassEnabled === undefined ? DEFAULT_BASS_ENABLED : entry.bassEnabled,
              bassVolume: entry.bassVolume === undefined ? DEFAULT_BASS_VOLUME : entry.bassVolume,
              bassPattern: entry.bassPattern === undefined ? DEFAULT_BASS_PATTERN : entry.bassPattern,
              bassInstrument: entry.bassInstrument === undefined ? DEFAULT_BASS_INSTRUMENT : entry.bassInstrument,
            };
          } else if (Array.isArray(entry)) { 
             loadedProgressions[key] = {
                progression: entry,
                customRhythm: Array(entry.length).fill(null).map(() => Array(4).fill(DEFAULT_CUSTOM_BEAT_DURATION)),
                drumsEnabled: DEFAULT_DRUMS_ENABLED,
                drumVolume: DEFAULT_DRUM_VOLUME,
                drumPattern: DEFAULT_DRUM_PATTERN,
                customDrumData: Array(entry.length).fill(null).map(() => createDefaultCustomDrumChordPattern()),
                bassEnabled: DEFAULT_BASS_ENABLED,
                bassVolume: DEFAULT_BASS_VOLUME,
                bassPattern: DEFAULT_BASS_PATTERN,
                bassInstrument: DEFAULT_BASS_INSTRUMENT,
              };
          }
        });
      }
    } catch (error) {
      console.error("[App.tsx] CRITICAL ERROR reading/parsing saved progressions from localStorage during init:", error);
      loadedProgressions = {};
    }
    return loadedProgressions;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(SAVED_PROGRESSIONS_LOCAL_STORAGE_KEY, JSON.stringify(savedProgressions));
    } catch (error) {
      console.error("[App.tsx] Error saving progressions to localStorage (in useEffect):", error);
    }
  }, [savedProgressions]);

  const progressionWithIndices: ChordWithIndex[] = useMemo(() => {
    return chordProgression.map((chord, index) => ({ ...chord, originalIndex: index }));
  }, [chordProgression]);

  const audio: UseAudioReturn = useAudio(
    progressionWithIndices,
    customRhythmData,
    drumsEnabled, drumVolume, drumPattern, customDrumData,
    bassEnabled, bassVolume, bassPattern, bassInstrument,
    userPianoVolume // Pass initial user piano volume
  );

  const handleUserPianoVolumeChange = (newVolume: number) => {
    setUserPianoVolume(newVolume);
    audio.setUserPianoVolume(newVolume);
  };

  const handleAddChord = useCallback((chord: ChordDefinition) => {
    setChordProgression(prev => [...prev, chord]);
    setCustomRhythmData(prev => [...prev, Array(4).fill(DEFAULT_CUSTOM_BEAT_DURATION)]);
    setCustomDrumData(prev => [...prev, createDefaultCustomDrumChordPattern()]);
  }, []);

  const handleRemoveChord = useCallback((idToRemove: string) => {
    setChordProgression(prevProgression => {
      const indexToRemove = prevProgression.findIndex(chord => chord.id === idToRemove);
      if (indexToRemove !== -1) {
        setCustomRhythmData(prevCustomData => {
          const newData = [...prevCustomData];
          newData.splice(indexToRemove, 1);
          return newData;
        });
        setCustomDrumData(prevCustomDrumData => {
          const newData = [...prevCustomDrumData];
          newData.splice(indexToRemove, 1);
          return newData;
        });
        return prevProgression.filter(chord => chord.id !== idToRemove);
      }
      return prevProgression;
    });
  }, []);

  const handleClearProgression = useCallback(() => {
    if (audio.isAccompanimentPlaying) {
      audio.stopAccompaniment();
    }
    setChordProgression([]);
    setCustomRhythmData([]);
    setCustomDrumData([]);
  }, [audio]);

  const handleUpdateCustomRhythmBeat = useCallback((chordIndex: number, beatIndex: number, newDuration: BeatDuration) => {
    setCustomRhythmData(prevData => {
      const newData = prevData.map((chordBeats, cIndex) => {
        if (cIndex === chordIndex) {
          const newBeats = [...chordBeats];
          newBeats[beatIndex] = newDuration;
          return newBeats;
        }
        return chordBeats;
      });
      return newData;
    });
  }, []);

  const handleUpdateCustomDrumCell = useCallback((chordOriginalIndex: number, instrument: DrumInstrument, beatIndex: number, subdivisionIndex: number, isActive: boolean) => {
    setCustomDrumData(prevData => {
        const newData = [...prevData];
        if (!newData[chordOriginalIndex]) {
            newData[chordOriginalIndex] = createDefaultCustomDrumChordPattern();
        }
        const chordPattern = { ...newData[chordOriginalIndex] };
        if (!chordPattern[instrument]) {
            chordPattern[instrument] = Array(4).fill(null).map(() => Array(4).fill(false));
        }
        const instrumentPattern = chordPattern[instrument]!.map(beat => [...beat]); 
        instrumentPattern[beatIndex][subdivisionIndex] = isActive;
        chordPattern[instrument] = instrumentPattern;
        newData[chordOriginalIndex] = chordPattern;
        return newData;
    });
  }, []);


  const handleSaveCurrentProgression = useCallback(() => {
    if (chordProgression.length === 0) {
      alert("和弦進行是空的，無法儲存。");
      return;
    }
    let name: string | null = window.prompt("請輸入此和弦進行的名稱：");
    if (name === null) return;
    const trimmedName = name.trim();
    if (trimmedName === "") {
      alert("名稱不能為空。");
      return;
    }
    setSavedProgressions(prev => ({
      ...prev,
      [trimmedName]: {
        progression: chordProgression,
        customRhythm: customRhythmData,
        drumsEnabled,
        drumVolume,
        drumPattern,
        customDrumData,
        bassEnabled,
        bassVolume,
        bassPattern,
        bassInstrument,
      }
    }));
    alert(`和弦進行 "${trimmedName}" 已儲存！`);
  }, [chordProgression, customRhythmData, drumsEnabled, drumVolume, drumPattern, customDrumData, bassEnabled, bassVolume, bassPattern, bassInstrument, setSavedProgressions]);

  const handleLoadProgression = useCallback((name: string) => {
    const savedEntry = savedProgressions[name];
    if (savedEntry) {
      if (audio.isAccompanimentPlaying) {
        audio.stopAccompaniment();
      }
      setChordProgression(savedEntry.progression);
      setCustomRhythmData(savedEntry.customRhythm || Array(savedEntry.progression.length).fill(null).map(() => Array(4).fill(DEFAULT_CUSTOM_BEAT_DURATION)));
      setDrumsEnabled(savedEntry.drumsEnabled === undefined ? DEFAULT_DRUMS_ENABLED : savedEntry.drumsEnabled);
      setDrumVolume(savedEntry.drumVolume === undefined ? DEFAULT_DRUM_VOLUME : savedEntry.drumVolume);
      setDrumPattern(savedEntry.drumPattern === undefined ? DEFAULT_DRUM_PATTERN : savedEntry.drumPattern);
      setCustomDrumData(savedEntry.customDrumData || Array(savedEntry.progression.length).fill(null).map(() => createDefaultCustomDrumChordPattern()));
      setBassEnabled(savedEntry.bassEnabled === undefined ? DEFAULT_BASS_ENABLED : savedEntry.bassEnabled);
      setBassVolume(savedEntry.bassVolume === undefined ? DEFAULT_BASS_VOLUME : savedEntry.bassVolume);
      setBassPattern(savedEntry.bassPattern === undefined ? DEFAULT_BASS_PATTERN : savedEntry.bassPattern);
      setBassInstrument(savedEntry.bassInstrument === undefined ? DEFAULT_BASS_INSTRUMENT : savedEntry.bassInstrument);
      alert(`和弦進行 "${name}" 已載入！`);
    } else {
      alert(`無法載入和弦進行 "${name}"。`);
    }
  }, [savedProgressions, audio]);

  const handleDeleteProgression = useCallback((name: string) => {
    if (window.confirm(`確定要刪除和弦進行 "${name}" 嗎？`)) {
        setSavedProgressions(prev => {
        const newState = { ...prev };
        delete newState[name];
        return newState;
        });
        alert(`和弦進行 "${name}" 已刪除！`);
    }
  }, [setSavedProgressions]);

  const handleReorderProgression = useCallback((sourceIndex: number, destinationIndex: number) => {
    setChordProgression(prevProgression => {
      const newProgression = Array.from(prevProgression);
      const [movedItem] = newProgression.splice(sourceIndex, 1);
      newProgression.splice(destinationIndex, 0, movedItem);
      return newProgression;
    });
    setCustomRhythmData(prevCustomData => {
      const newCustomData = Array.from(prevCustomData);
      const [movedRhythm] = newCustomData.splice(sourceIndex, 1);
      newCustomData.splice(destinationIndex, 0, movedRhythm);
      return newCustomData;
    });
    setCustomDrumData(prevCustomDrumData => {
      const newCustomDrumData = Array.from(prevCustomDrumData);
      const [movedDrumPattern] = newCustomDrumData.splice(sourceIndex, 1);
      newCustomDrumData.splice(destinationIndex, 0, movedDrumPattern);
      return newCustomDrumData;
    });
  }, []);
  
  const handleNoteAttack = useCallback((noteName: NoteName, octave: number, isComputerKey: boolean = false) => {
    if (audio.isPianoLoading) return;
    audio.attackPianoNote(noteName, octave, isComputerKey);
  }, [audio]);

  const handleNoteRelease = useCallback((noteName: NoteName, octave: number, isComputerKey: boolean = false) => {
    if (audio.isPianoLoading) return;
    audio.releasePianoNote(noteName, octave, isComputerKey);
  }, [audio]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
        
        if (!pressedComputerKeys.has(noteFullName)) {
            handleNoteAttack(note, octave, true);
            setPressedComputerKeys(prev => new Set(prev).add(noteFullName));
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
        
        handleNoteRelease(note, octave, true);
        setPressedComputerKeys(prev => {
          const next = new Set(prev);
          next.delete(noteFullName);
          return next;
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [audio, handleNoteAttack, handleNoteRelease, pressedComputerKeys]);


  return (
    <div className="min-h-screen bg-gray-800 text-gray-100 selection:bg-purple-500 selection:text-white">
      <div className="container mx-auto p-2 sm:p-4 flex flex-col items-center space-y-4 sm:space-y-6">
        <header className="text-center my-3 sm:my-5">
          <h1 className="text-3xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
            互動鋼琴工作室
          </h1>
          <p className="text-gray-300 mt-2 text-xs sm:text-base">自由彈奏、移調，並創造您的和弦、鼓組與貝斯伴奏。</p>
        </header>

        <PianoKeyboard
            onNoteAttack={handleNoteAttack}
            onNoteRelease={handleNoteRelease}
            pressedKeys={pressedComputerKeys}
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
            </div>
            <ChordSelector onAddChord={handleAddChord} />
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
            />
            <AccompanimentControls
              bpm={audio.currentBPM}
              onBpmChange={audio.setAccompanimentBPM}
              volume={audio.currentVolume}
              onVolumeChange={audio.setAccompanimentVolume}
              instrument={audio.currentAccompanimentInstrument}
              onInstrumentChange={audio.setAccompanimentInstrument}
              rhythmPattern={audio.currentAccompanimentRhythmPattern}
              onRhythmPatternChange={audio.setAccompanimentRhythmPattern}
              isPlaying={audio.isAccompanimentPlaying}
              onPlay={audio.startAccompaniment}
              onStop={audio.stopAccompaniment}
              isAudioReady={audio.isAudioReady}
              chordProgressionEmpty={chordProgression.length === 0}
              chordProgressionForCustomEditor={progressionWithIndices}
              customRhythmData={customRhythmData}
              onUpdateCustomBeat={handleUpdateCustomRhythmBeat}
              // Drum Props
              drumsEnabled={drumsEnabled}
              onDrumsEnabledChange={setDrumsEnabled}
              drumVolume={drumVolume}
              onDrumVolumeChange={setDrumVolume}
              drumPattern={drumPattern}
              onDrumPatternChange={setDrumPattern}
              customDrumData={customDrumData}
              onUpdateCustomDrumCell={handleUpdateCustomDrumCell}
              // Bass Props
              bassEnabled={bassEnabled}
              onBassEnabledChange={setBassEnabled}
              bassVolume={bassVolume}
              onBassVolumeChange={setBassVolume}
              bassPattern={bassPattern}
              onBassPatternChange={setBassPattern}
              bassInstrument={bassInstrument}
              onBassInstrumentChange={setBassInstrument}
            />
          </div>
        </div>
        <footer className="text-center text-gray-500 text-xs sm:text-sm mt-6 sm:mt-8 pb-4">
          <p>技術支持：React, Tailwind CSS, Tone.js</p>
          <p>&copy; {new Date().getFullYear()} by hsuchen</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
