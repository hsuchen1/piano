
import React from 'react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import PianoKeyboard from './components/PianoKeyboard';
import TranspositionControl from './components/TranspositionControl';
import ChordSelector from './components/ChordSelector';
import ChordProgressionEditor from './components/ChordProgressionEditor';
import AccompanimentControls from './components/AccompanimentControls';
import SavedProgressions from './components/SavedProgressions'; // New component
import { useAudio } from './hooks/useAudio';
import { ChordDefinition, NoteName, UserPianoInstrument, AccompanimentRhythmPattern, BeatDuration } from './types';
import { KEY_MAPPING, USER_PIANO_INSTRUMENT_OPTIONS, DEFAULT_CUSTOM_BEAT_DURATION, SAVED_PROGRESSIONS_LOCAL_STORAGE_KEY } from './constants';

// Represents a chord with its original index in the progression for custom rhythm mapping
export interface ChordWithIndex extends ChordDefinition {
  originalIndex: number;
}

const App: React.FC = () => {
  const [chordProgression, setChordProgression] = useState<ChordDefinition[]>([]);
  const [pressedComputerKeys, setPressedComputerKeys] = useState<Set<string>>(new Set());
  const [customRhythmData, setCustomRhythmData] = useState<BeatDuration[][]>([]);

  const [savedProgressions, setSavedProgressions] = useState<Record<string, ChordDefinition[]>>(() => {
    console.log('[App.tsx] Initializing savedProgressions state function called.');
    let loadedProgressions: Record<string, ChordDefinition[]> = {};
    try {
      const item = window.localStorage.getItem(SAVED_PROGRESSIONS_LOCAL_STORAGE_KEY);
      console.log(`[App.tsx] localStorage.getItem('${SAVED_PROGRESSIONS_LOCAL_STORAGE_KEY}') returned:`, item === null ? 'null' : `"${item}"`);
      if (item !== null && item !== undefined) { // Ensure item is not null or undefined before parsing
        if (item.trim() === "") { // Handle case where item is an empty string
          console.log('[App.tsx] localStorage item is an empty string, defaulting to empty progressions.');
          loadedProgressions = {};
        } else {
          loadedProgressions = JSON.parse(item);
          console.log('[App.tsx] Successfully parsed progressions from localStorage:', loadedProgressions);
        }
      } else {
        console.log('[App.tsx] No saved progressions found in localStorage (item is null or undefined). Defaulting to empty object.');
        loadedProgressions = {};
      }
    } catch (error) {
      console.error("[App.tsx] CRITICAL ERROR reading/parsing saved progressions from localStorage during init:", error);
      // Ensure it still returns a valid default if parsing fails catastrophically
      loadedProgressions = {};
       // Potentially alert user or send error report
       alert(`讀取已儲存的和弦進行時發生錯誤。應用程式將以預設狀態啟動。\n錯誤詳情請見瀏覽器控制台。\n\nError loading saved progressions. Starting with defaults. Check console for details.\n\n${(error as Error).message}`);
    }
    console.log('[App.tsx] Returning from savedProgressions initializer with:', loadedProgressions);
    return loadedProgressions;
  });

  useEffect(() => {
    console.log('[App.tsx] useEffect for saving progressions to localStorage triggered. Current savedProgressions:', savedProgressions);
    try {
      const stringifiedData = JSON.stringify(savedProgressions);
      window.localStorage.setItem(SAVED_PROGRESSIONS_LOCAL_STORAGE_KEY, stringifiedData);
      console.log('[App.tsx] Successfully saved progressions to localStorage. Data length:', stringifiedData.length);
    } catch (error) {
      console.error("[App.tsx] Error saving progressions to localStorage (in useEffect):", error);
      alert(`儲存和弦進行到瀏覽器時發生錯誤。\n錯誤詳情請見瀏覽器控制台。\n\nError saving progressions to localStorage. Check console for details.\n\n${(error as Error).message}`);
    }
  }, [savedProgressions]);

  // Memoize progressionWithIndices to avoid unnecessary re-renders/recalculations
  const progressionWithIndices: ChordWithIndex[] = useMemo(() => {
    return chordProgression.map((chord, index) => ({ ...chord, originalIndex: index }));
  }, [chordProgression]);

  const audio = useAudio(progressionWithIndices, customRhythmData);

  const handleAddChord = useCallback((chord: ChordDefinition) => {
    setChordProgression(prev => [...prev, chord]);
    setCustomRhythmData(prev => [...prev, Array(4).fill(DEFAULT_CUSTOM_BEAT_DURATION)]);
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

  const handleSaveCurrentProgression = useCallback(() => {
    console.log('[App.tsx] handleSaveCurrentProgression called.');
    console.log('[App.tsx] Current chordProgression length:', chordProgression.length);
    // console.log('[App.tsx] Current chordProgression value:', JSON.stringify(chordProgression)); // Can be verbose for long progressions

    if (chordProgression.length === 0) {
      console.log('[App.tsx] chordProgression is empty, alerting user.');
      alert("和弦進行是空的，無法儲存。");
      return;
    }

    console.log('[App.tsx] Attempting to show window.prompt.');
    let name: string | null = null;
    try {
      name = window.prompt("請輸入此和弦進行的名稱：");
      console.log('[App.tsx] window.prompt returned:', name);

      if (name === null) {
        console.log("[App.tsx] Save operation cancelled by user (prompt returned null).");
        return; 
      }

      const trimmedName = name.trim();
      if (trimmedName === "") {
        console.log('[App.tsx] Name is empty after trim, alerting user.');
        alert("名稱不能為空。");
        return;
      }

      console.log(`[App.tsx] Attempting to save progression as "${trimmedName}".`);
      setSavedProgressions(prev => {
        const newProgressions = { ...prev, [trimmedName]: chordProgression };
        console.log('[App.tsx] setSavedProgressions called. New targeted savedProgressions state will be:', newProgressions);
        return newProgressions;
      });
      alert(`和弦進行 "${trimmedName}" 已儲存！`);

    } catch (error) {
      console.error("[App.tsx] Error during save progression (inside try...catch for prompt/setSavedProgressions):", error);
      alert("儲存和弦進行時發生錯誤。請檢查瀏覽器控制台以獲取更多資訊。");
    }
  }, [chordProgression, setSavedProgressions]);

  const handleLoadProgression = useCallback((name: string) => {
    console.log(`[App.tsx] handleLoadProgression called for "${name}".`);
    const progressionToLoad = savedProgressions[name];
    if (progressionToLoad) {
      if (audio.isAccompanimentPlaying) {
        audio.stopAccompaniment();
      }
      setChordProgression(progressionToLoad);
      setCustomRhythmData(
        Array(progressionToLoad.length)
          .fill(null)
          .map(() => Array(4).fill(DEFAULT_CUSTOM_BEAT_DURATION))
      );
      alert(`和弦進行 "${name}" 已載入！`);
      console.log(`[App.tsx] Progression "${name}" loaded.`);
    } else {
      console.warn(`[App.tsx] Progression "${name}" not found in savedProgressions. Current saved:`, Object.keys(savedProgressions));
      alert(`無法載入和弦進行 "${name}"，因為它不存在於已儲存的列表中。`);
    }
  }, [savedProgressions, audio, setChordProgression, setCustomRhythmData]);

  const handleDeleteProgression = useCallback((name: string) => {
    console.log(`[App.tsx] handleDeleteProgression called for "${name}".`);
    if (window.confirm(`確定要刪除和弦進行 "${name}" 嗎？`)) {
        setSavedProgressions(prev => {
        const newState = { ...prev };
        delete newState[name];
        console.log('[App.tsx] setSavedProgressions called for deletion. New targeted savedProgressions state will be:', newState);
        return newState;
        });
        alert(`和弦進行 "${name}" 已刪除！`);
        console.log(`[App.tsx] Progression "${name}" deleted.`);
    } else {
      console.log(`[App.tsx] Deletion of progression "${name}" cancelled by user.`);
    }
  }, [setSavedProgressions]);
  
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
          <p className="text-gray-300 mt-2 text-xs sm:text-base">自由彈奏、移調，並創造您的和弦伴奏。</p>
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
            <div className="p-4 bg-gray-700 rounded-lg shadow-md">
                 <h3 className="text-lg font-semibold mb-2 text-gray-100">選擇鋼琴音色</h3>
                 <select
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
