
import React from 'react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import PianoKeyboard from './components/PianoKeyboard';
import TranspositionControl from './components/TranspositionControl';
import ChordSelector from './components/ChordSelector';
import ChordProgressionEditor from './components/ChordProgressionEditor';
import AccompanimentControls from './components/AccompanimentControls';
import SavedProgressions from './components/SavedProgressions';
import TutorialModal from './components/TutorialModal'; // Import the new component
import { useAudio, UseAudioReturn } from './hooks/useAudio';
import {
  ChordDefinition, NoteName, UserPianoInstrument, AccompanimentRhythmPattern, BeatDuration,
  SavedProgressionEntry, DrumPattern, DrumInstrument, BassPattern, BassInstrument, CustomDrumProgressionData, AccompanimentLayer
} from './types';
import {
  KEY_MAPPING, USER_PIANO_INSTRUMENT_OPTIONS, DEFAULT_CUSTOM_BEAT_DURATION, SAVED_PROGRESSIONS_LOCAL_STORAGE_KEY,
  DEFAULT_DRUMS_ENABLED, DEFAULT_DRUM_VOLUME, DEFAULT_DRUM_PATTERN,
  DEFAULT_BASS_ENABLED, DEFAULT_BASS_VOLUME, DEFAULT_BASS_PATTERN, DEFAULT_BASS_INSTRUMENT,
  createDefaultCustomDrumChordPattern, DEFAULT_USER_PIANO_VOLUME, MIN_USER_PIANO_VOLUME, MAX_USER_PIANO_VOLUME, DEFAULT_ACCOMPANIMENT_LAYER
} from './constants';

export interface ChordWithIndex extends ChordDefinition {
  originalIndex: number;
}

const App: React.FC = () => {
  const [chordProgression, setChordProgression] = useState<ChordDefinition[]>([]);
  const [pressedComputerKeys, setPressedComputerKeys] = useState<Set<string>>(new Set());
  
  // State for custom rhythms per layer
  const [customRhythms, setCustomRhythms] = useState<Record<string, BeatDuration[][]>>({});

  // Accompaniment Layers State
  const [accompanimentLayers, setAccompanimentLayers] = useState<AccompanimentLayer[]>([
      { id: `layer-${Date.now()}`, ...DEFAULT_ACCOMPANIMENT_LAYER }
  ]);

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

  // New state for playback highlighting and effects
  const [currentlyPlayingChordIndex, setCurrentlyPlayingChordIndex] = useState<number | null>(null);
  const [reverbLevel, setReverbLevel] = useState(0.1);
  const [delayLevel, setDelayLevel] = useState(0.1);
  const [swing, setSwing] = useState(0);

  // New state for UI interactivity
  const [isBeat, setIsBeat] = useState(false);
  const [showAccompanimentNotes, setShowAccompanimentNotes] = useState(true);
  const [accompanimentActiveNotes, setAccompanimentActiveNotes] = useState<Set<string>>(new Set());
  const [isTutorialOpen, setIsTutorialOpen] = useState(false); // State for the tutorial modal

  const [savedProgressions, setSavedProgressions] = useState<Record<string, SavedProgressionEntry>>(() => {
    let loadedProgressions: Record<string, SavedProgressionEntry> = {};
    try {
      const item = window.localStorage.getItem(SAVED_PROGRESSIONS_LOCAL_STORAGE_KEY);
      if (item) {
        const parsedItem = JSON.parse(item);
        Object.keys(parsedItem).forEach(key => {
          const entry = parsedItem[key];
          if (entry && entry.progression) {
            // Migration logic for inversions
            const migratedProgression = entry.progression.map((chord: any) => ({
              ...chord,
              inversion: chord.inversion === undefined ? 0 : chord.inversion,
            }));

            if (!entry.accompanimentLayers) {
                entry.accompanimentLayers = [{
                    id: `layer-${Date.now()}`,
                    instrument: entry.instrument || DEFAULT_ACCOMPANIMENT_LAYER.instrument,
                    volume: entry.volume || DEFAULT_ACCOMPANIMENT_LAYER.volume,
                    rhythmPattern: entry.rhythmPattern || DEFAULT_ACCOMPANIMENT_LAYER.rhythmPattern,
                }];
            }
            loadedProgressions[key] = {
              progression: migratedProgression,
              accompanimentLayers: entry.accompanimentLayers,
              customRhythms: entry.customRhythms, // New field
              customRhythm: entry.customRhythm, // Legacy field for migration
              drumsEnabled: entry.drumsEnabled === undefined ? DEFAULT_DRUMS_ENABLED : entry.drumsEnabled,
              drumVolume: entry.drumVolume === undefined ? DEFAULT_DRUM_VOLUME : entry.drumVolume,
              drumPattern: entry.drumPattern === undefined ? DEFAULT_DRUM_PATTERN : entry.drumPattern,
              customDrumData: entry.customDrumData || Array(entry.progression.length).fill(null).map(() => createDefaultCustomDrumChordPattern()),
              bassEnabled: entry.bassEnabled === undefined ? DEFAULT_BASS_ENABLED : entry.bassEnabled,
              bassVolume: entry.bassVolume === undefined ? DEFAULT_BASS_VOLUME : entry.bassVolume,
              bassPattern: entry.bassPattern === undefined ? DEFAULT_BASS_PATTERN : entry.bassPattern,
              bassInstrument: entry.bassInstrument === undefined ? DEFAULT_BASS_INSTRUMENT : entry.bassInstrument,
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
      const stateToSave = { ...savedProgressions };
      Object.keys(stateToSave).forEach(key => {
        if (stateToSave[key].customRhythm) {
          delete stateToSave[key].customRhythm;
        }
      });
      window.localStorage.setItem(SAVED_PROGRESSIONS_LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error("[App.tsx] Error saving progressions to localStorage (in useEffect):", error);
    }
  }, [savedProgressions]);

  const progressionWithIndices: ChordWithIndex[] = useMemo(() => {
    return chordProgression.map((chord, index) => ({ ...chord, originalIndex: index }));
  }, [chordProgression]);

  const audio: UseAudioReturn = useAudio(
    progressionWithIndices,
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
    userPianoVolume,
    setCurrentlyPlayingChordIndex,
    setIsBeat,
    setAccompanimentActiveNotes,
    showAccompanimentNotes
  );
  
  const handleStopAccompaniment = useCallback(() => {
      audio.stopAccompaniment();
      setCurrentlyPlayingChordIndex(null);
  }, [audio]);

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

  const handleAddChord = useCallback((chord: ChordDefinition) => {
    setChordProgression(prev => [...prev, chord]);
    setCustomRhythms(prevRhythms => {
      const newRhythms = { ...prevRhythms };
      for (const layerId in newRhythms) {
        newRhythms[layerId] = [...newRhythms[layerId], Array(4).fill(DEFAULT_CUSTOM_BEAT_DURATION)];
      }
      return newRhythms;
    });
    setCustomDrumData(prev => [...prev, createDefaultCustomDrumChordPattern()]);
  }, []);

  const handleRemoveChord = useCallback((idToRemove: string) => {
    const indexToRemove = chordProgression.findIndex(chord => chord.id === idToRemove);
    if (indexToRemove === -1) return;

    setChordProgression(prev => prev.filter(c => c.id !== idToRemove));
    
    setCustomRhythms(prevRhythms => {
      const newRhythms = { ...prevRhythms };
      for (const layerId in newRhythms) {
        const newLayerRhythm = [...newRhythms[layerId]];
        newLayerRhythm.splice(indexToRemove, 1);
        newRhythms[layerId] = newLayerRhythm;
      }
      return newRhythms;
    });
    
    setCustomDrumData(prev => {
      const newData = [...prev];
      newData.splice(indexToRemove, 1);
      return newData;
    });
  }, [chordProgression]);

  const handleClearProgression = useCallback(() => {
    if (audio.isAccompanimentPlaying) {
      handleStopAccompaniment();
    }
    setChordProgression([]);
    setCustomRhythms({});
    setCustomDrumData([]);
  }, [audio, handleStopAccompaniment]);

  const handleUpdateChordInversion = useCallback((idToUpdate: string, inversion: number) => {
    setChordProgression(prev => prev.map(chord =>
      chord.id === idToUpdate ? { ...chord, inversion } : chord
    ));
  }, []);

  const handleUpdateCustomRhythmBeat = useCallback((layerId: string, chordIndex: number, beatIndex: number, newDuration: BeatDuration) => {
    setCustomRhythms(prevRhythms => {
      const newRhythms = { ...prevRhythms };
      const layerRhythm = newRhythms[layerId];
      if (layerRhythm) {
        const newLayerRhythm = layerRhythm.map((chordBeats, cIndex) => {
          if (cIndex === chordIndex) {
            const newBeats = [...chordBeats];
            newBeats[beatIndex] = newDuration;
            return newBeats;
          }
          return chordBeats;
        });
        newRhythms[layerId] = newLayerRhythm;
      }
      return newRhythms;
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

  // --- Accompaniment Layer Handlers ---
  const handleAddAccompanimentLayer = useCallback(() => {
      setAccompanimentLayers(prev => [
          ...prev,
          { id: `layer-${Date.now()}-${Math.random()}`, ...DEFAULT_ACCOMPANIMENT_LAYER }
      ]);
  }, []);

  const handleRemoveAccompanimentLayer = useCallback((idToRemove: string) => {
      setAccompanimentLayers(prev => prev.filter(layer => layer.id !== idToRemove));
      setCustomRhythms(prev => {
        if (prev[idToRemove]) {
          const newRhythms = { ...prev };
          delete newRhythms[idToRemove];
          return newRhythms;
        }
        return prev;
      });
  }, []);

  const handleUpdateAccompanimentLayer = useCallback(<K extends keyof AccompanimentLayer>(
      idToUpdate: string,
      field: K,
      value: AccompanimentLayer[K]
  ) => {
      setAccompanimentLayers(prev => prev.map(layer =>
          layer.id === idToUpdate ? { ...layer, [field]: value } : layer
      ));

      if (field === 'rhythmPattern') {
        if (value === AccompanimentRhythmPattern.Custom) {
          setCustomRhythms(prev => {
            if (!prev[idToUpdate]) {
              const newProgressionData = Array(chordProgression.length).fill(null).map(() => Array(4).fill(DEFAULT_CUSTOM_BEAT_DURATION));
              return { ...prev, [idToUpdate]: newProgressionData };
            }
            return prev;
          });
        } else {
          setCustomRhythms(prev => {
            if (prev[idToUpdate]) {
              const newRhythms = { ...prev };
              delete newRhythms[idToUpdate];
              return newRhythms;
            }
            return prev;
          });
        }
      }
  }, [chordProgression.length]);


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
      }
    }));
    alert(`和弦進行 "${trimmedName}" 已儲存！`);
  }, [chordProgression, customRhythms, accompanimentLayers, drumsEnabled, drumVolume, drumPattern, customDrumData, bassEnabled, bassVolume, bassPattern, bassInstrument]);

  const handleLoadProgression = useCallback((name: string) => {
    const savedEntry = savedProgressions[name];
    if (savedEntry) {
      if (audio.isAccompanimentPlaying) {
        handleStopAccompaniment();
      }
      // Migration for old saves without inversion property
      const migratedProgression = savedEntry.progression.map(chord => ({
        ...chord,
        inversion: chord.inversion === undefined ? 0 : chord.inversion,
      }));
      setChordProgression(migratedProgression);
      
      if (savedEntry.accompanimentLayers && savedEntry.accompanimentLayers.length > 0) {
          setAccompanimentLayers(savedEntry.accompanimentLayers);
      } else {
          // Legacy migration for layers
          const legacyLayer = {
              id: `layer-${Date.now()}`,
              instrument: savedEntry.instrument || DEFAULT_ACCOMPANIMENT_LAYER.instrument,
              volume: savedEntry.volume || DEFAULT_ACCOMPANIMENT_LAYER.volume,
              rhythmPattern: savedEntry.rhythmPattern || DEFAULT_ACCOMPANIMENT_LAYER.rhythmPattern,
          };
          setAccompanimentLayers([legacyLayer]);
      }

      const loadedRhythms: Record<string, BeatDuration[][]> = {};
      if (savedEntry.customRhythms) {
          setCustomRhythms(savedEntry.customRhythms);
      } else { 
          if (savedEntry.customRhythm) {
              const layersForMigration = savedEntry.accompanimentLayers || [];
              layersForMigration.forEach(layer => {
                  if (layer.rhythmPattern === AccompanimentRhythmPattern.Custom) {
                      loadedRhythms[layer.id] = savedEntry.customRhythm!;
                  }
              });
          }
          setCustomRhythms(loadedRhythms);
      }
      
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
  }, [savedProgressions, audio, handleStopAccompaniment]);

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

  const handleReorderProgression = useCallback((sourceIndex: number, destinationIndex: number) => {
    setChordProgression(prevProgression => {
      const newProgression = Array.from(prevProgression);
      const [movedItem] = newProgression.splice(sourceIndex, 1);
      newProgression.splice(destinationIndex, 0, movedItem);
      return newProgression;
    });
    setCustomRhythms(prevRhythms => {
      const newRhythms = { ...prevRhythms };
      for (const layerId in newRhythms) {
        const layerData = Array.from(newRhythms[layerId]);
        const [movedItem] = layerData.splice(sourceIndex, 1);
        layerData.splice(destinationIndex, 0, movedItem);
        newRhythms[layerId] = layerData;
      }
      return newRhythms;
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
    <>
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
      <div className="min-h-screen bg-gray-800 text-gray-100 selection:bg-purple-500 selection:text-white">
        <div className="container mx-auto p-2 sm:p-4 flex flex-col items-center space-y-4 sm:space-y-6">
          <header className="text-center my-3 sm:my-5">
            <h1 className="text-3xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
              互動鋼琴工作室
            </h1>
            <p className="text-gray-300 mt-2 text-xs sm:text-base">自由彈奏、編曲，並透過多樣樂器與效果，打造您的專屬伴奏。</p>
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
              />
              <AccompanimentControls
                bpm={audio.currentBPM}
                onBpmChange={audio.setAccompanimentBPM}
                isBeat={isBeat}
                accompanimentLayers={accompanimentLayers}
                onAddAccompanimentLayer={handleAddAccompanimentLayer}
                onRemoveAccompanimentLayer={handleRemoveAccompanimentLayer}
                onUpdateAccompanimentLayer={handleUpdateAccompanimentLayer}
                isPlaying={audio.isAccompanimentPlaying}
                onPlay={audio.startAccompaniment}
                onStop={handleStopAccompaniment}
                isAudioReady={audio.isAudioReady}
                chordProgressionEmpty={chordProgression.length === 0}
                chordProgressionForCustomEditor={progressionWithIndices}
                customRhythms={customRhythms}
                onUpdateCustomBeat={handleUpdateCustomRhythmBeat}
                // Effects and Groove
                reverbLevel={reverbLevel}
                onReverbLevelChange={handleReverbChange}
                delayLevel={delayLevel}
                onDelayLevelChange={handleDelayChange}
                swing={swing}
                onSwingChange={handleSwingChange}
                // Drum Props
                drumsEnabled={drumsEnabled}
                onDrumsEnabledChange={setDrumsEnabled}
                drumVolume={drumVolume}
                onDrumVolumeChange={handleDrumVolumeChange}
                drumPattern={drumPattern}
                onDrumPatternChange={setDrumPattern}
                customDrumData={customDrumData}
                onUpdateCustomDrumCell={handleUpdateCustomDrumCell}
                // Bass Props
                bassEnabled={bassEnabled}
                onBassEnabledChange={setBassEnabled}
                bassVolume={bassVolume}
                onBassVolumeChange={handleBassVolumeChange}
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
    </>
  );
};

export default App;
