
import React, { useState, memo } from 'react';
import { AccompanimentInstrument, AccompanimentRhythmPattern, BeatDuration, DrumPattern, DrumInstrument, BassPattern, BassInstrument, CustomDrumProgressionData, AccompanimentLayer, CustomDrumChordPattern } from '../types';
import { MIN_BPM, MAX_BPM, MIN_VOLUME, MAX_VOLUME, ACCOMPANIMENT_INSTRUMENT_OPTIONS, ACCOMPANIMENT_RHYTHM_PATTERN_OPTIONS, DRUM_PATTERN_OPTIONS, BASS_INSTRUMENT_OPTIONS, BASS_PATTERN_OPTIONS, MAX_BASS_VOLUME } from '../constants';
import CustomRhythmEditor from './CustomRhythmEditor';
import CustomDrumEditor from './CustomDrumEditor';
import type { ChordWithIndex } from '../App';

type Tab = 'chords' | 'drums' | 'bass' | 'effects';

interface AccompanimentControlsProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  isBeat: boolean;
  
  accompanimentLayers: AccompanimentLayer[];
  onAddAccompanimentLayer: () => void;
  onRemoveAccompanimentLayer: (id: string) => void;
  onUpdateAccompanimentLayer: <K extends keyof AccompanimentLayer>(id: string, field: K, value: AccompanimentLayer[K]) => void;
  
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  isAudioReady: boolean;
  chordProgressionEmpty: boolean;
  
  chordProgressionForCustomEditor: ChordWithIndex[];
  customRhythms: Record<string, BeatDuration[][]>;
  onUpdateCustomBeat: (layerId: string, chordIndex: number, beatIndex: number, newDuration: BeatDuration) => void;

  reverbLevel: number;
  onReverbLevelChange: (level: number) => void;
  delayLevel: number;
  onDelayLevelChange: (level: number) => void;
  swing: number;
  onSwingChange: (amount: number) => void;

  drumsEnabled: boolean;
  onDrumsEnabledChange: (enabled: boolean) => void;
  drumVolume: number;
  onDrumVolumeChange: (volume: number) => void;
  drumPattern: DrumPattern;
  onDrumPatternChange: (pattern: DrumPattern) => void;
  customDrumData: CustomDrumProgressionData;
  onUpdateCustomDrumCell: (chordOriginalIndex: number, instrument: DrumInstrument, beatIndex: number, subdivisionIndex: number, isActive: boolean) => void;
  onGenerateDrumPattern: (prompt: string, chordOriginalIndex: number) => void;
  drumPatternClipboard: { pattern: CustomDrumChordPattern, sourceIndex: number } | null;
  onCopyDrumPattern: (chordOriginalIndex: number) => void;
  onPasteDrumPattern: (chordOriginalIndex: number) => void;
  generationState: { type: string | null; isLoading: boolean; error: string | null; drumChordIndex?: number; };
  isApiKeySet: boolean;

  bassEnabled: boolean;
  onBassEnabledChange: (enabled: boolean) => void;
  bassVolume: number;
  onBassVolumeChange: (volume: number) => void;
  bassPattern: BassPattern;
  onBassPatternChange: (pattern: BassPattern) => void;
  bassInstrument: BassInstrument;
  onBassInstrumentChange: (instrument: BassInstrument) => void;
}

// --- Memoized TabButton Component ---
// Moved outside and memoized to prevent re-renders on `isBeat` change.
const TabButton: React.FC<{ tabName: Tab; currentTab: Tab; onClick: (tab: Tab) => void; children: React.ReactNode }> = memo(({ tabName, currentTab, onClick, children }) => {
  const isActive = tabName === currentTab;
  return (
    <button
      onClick={() => onClick(tabName)}
      className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:z-10
        ${isActive ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}
      role="tab"
      aria-selected={isActive}
    >
      {children}
    </button>
  );
});
TabButton.displayName = 'TabButton';


// --- Panel Components for Tabs (Moved outside and memoized to prevent re-renders) ---

interface ChordInstrumentPanelProps {
  accompanimentLayers: AccompanimentLayer[];
  onRemoveAccompanimentLayer: (id: string) => void;
  onUpdateAccompanimentLayer: <K extends keyof AccompanimentLayer>(id: string, field: K, value: AccompanimentLayer[K]) => void;
  onAddAccompanimentLayer: () => void;
  chordProgressionForCustomEditor: ChordWithIndex[];
  customRhythms: Record<string, BeatDuration[][]>;
  onUpdateCustomBeat: (layerId: string, chordIndex: number, beatIndex: number, newDuration: BeatDuration) => void;
}

const ChordInstrumentPanel: React.FC<ChordInstrumentPanelProps> = memo(({ accompanimentLayers, onRemoveAccompanimentLayer, onUpdateAccompanimentLayer, onAddAccompanimentLayer, chordProgressionForCustomEditor, customRhythms, onUpdateCustomBeat }) => (
  <div className="space-y-4">
    {accompanimentLayers.map((layer, index) => (
      <div key={layer.id} className="bg-gray-500 p-3 rounded-lg space-y-3 relative border-l-2 border-blue-500">
        <span className="absolute -top-2 -left-2.5 w-5 h-5 bg-blue-500 text-white text-xs flex items-center justify-center rounded-full font-bold">{index + 1}</span>
        {accompanimentLayers.length > 1 && (
          <button onClick={() => onRemoveAccompanimentLayer(layer.id)} className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors focus:outline-none focus:ring-1 focus:ring-red-400" aria-label={`移除伴奏層 ${index + 1}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
        <div>
          <label htmlFor={`chordVolume-${layer.id}`} className="block text-sm font-medium text-gray-300 mb-1">音量: {layer.volume.toFixed(0)} dB</label>
          <input type="range" id={`chordVolume-${layer.id}`} min={MIN_VOLUME} max={MAX_VOLUME} step="1" value={layer.volume} onChange={(e) => onUpdateAccompanimentLayer(layer.id, 'volume', parseFloat(e.target.value))} className="w-full h-2.5 bg-gray-400 rounded-lg appearance-none cursor-pointer accent-blue-500" />
        </div>
        <div>
          <label htmlFor={`chordInstrument-${layer.id}`} className="block text-sm font-medium text-gray-300 mb-1">樂器</label>
          <select id={`chordInstrument-${layer.id}`} value={layer.instrument} onChange={(e) => onUpdateAccompanimentLayer(layer.id, 'instrument', e.target.value as AccompanimentInstrument)} className="w-full p-2 bg-gray-400 border border-gray-500 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500">
            {ACCOMPANIMENT_INSTRUMENT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`chordRhythmPattern-${layer.id}`} className="block text-sm font-medium text-gray-300 mb-1">節奏型態</label>
          <select id={`chordRhythmPattern-${layer.id}`} value={layer.rhythmPattern} onChange={(e) => onUpdateAccompanimentLayer(layer.id, 'rhythmPattern', e.target.value as AccompanimentRhythmPattern)} className="w-full p-2 bg-gray-400 border border-gray-500 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500">
            {ACCOMPANIMENT_RHYTHM_PATTERN_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        {layer.rhythmPattern === AccompanimentRhythmPattern.Custom && (
          <CustomRhythmEditor chordProgression={chordProgressionForCustomEditor} customRhythmDataForLayer={customRhythms[layer.id] || []} onUpdateBeat={(chordIndex, beatIndex, newDuration) => onUpdateCustomBeat(layer.id, chordIndex, beatIndex, newDuration)} />
        )}
      </div>
    ))}
    <button onClick={onAddAccompanimentLayer} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400">
      + 新增伴奏層
    </button>
  </div>
));
ChordInstrumentPanel.displayName = 'ChordInstrumentPanel';

interface DrumKitPanelProps {
    drumsEnabled: boolean;
    onDrumsEnabledChange: (enabled: boolean) => void;
    drumVolume: number;
    onDrumVolumeChange: (volume: number) => void;
    drumPattern: DrumPattern;
    onDrumPatternChange: (pattern: DrumPattern) => void;
    chordProgressionForCustomEditor: ChordWithIndex[];
    customDrumData: CustomDrumProgressionData;
    onUpdateCustomDrumCell: (chordOriginalIndex: number, instrument: DrumInstrument, beatIndex: number, subdivisionIndex: number, isActive: boolean) => void;
    onGenerateDrumPattern: (prompt: string, chordOriginalIndex: number) => void;
    drumPatternClipboard: { pattern: CustomDrumChordPattern, sourceIndex: number } | null;
    onCopyDrumPattern: (chordOriginalIndex: number) => void;
    onPasteDrumPattern: (chordOriginalIndex: number) => void;
    generationState: { type: string | null; isLoading: boolean; error: string | null; drumChordIndex?: number; };
    isApiKeySet: boolean;
}

const DrumKitPanel: React.FC<DrumKitPanelProps> = memo(({ drumsEnabled, onDrumsEnabledChange, drumVolume, onDrumVolumeChange, drumPattern, onDrumPatternChange, chordProgressionForCustomEditor, customDrumData, onUpdateCustomDrumCell, onGenerateDrumPattern, drumPatternClipboard, onCopyDrumPattern, onPasteDrumPattern, generationState, isApiKeySet }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <label htmlFor="drumsEnabled" className="text-sm font-medium text-gray-300">啟用鼓組 (Enable Drums)</label>
      <button id="drumsEnabled" onClick={() => onDrumsEnabledChange(!drumsEnabled)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${drumsEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-400'}`} aria-pressed={drumsEnabled}>
        {drumsEnabled ? '已啟用 (ON)' : '已停用 (OFF)'}
      </button>
    </div>
    {drumsEnabled && (<>
      <div>
        <label htmlFor="drumVolume" className="block text-sm font-medium text-gray-300 mb-1">音量: {drumVolume.toFixed(0)} dB</label>
        <input type="range" id="drumVolume" min={MIN_VOLUME} max={MAX_VOLUME} step="1" value={drumVolume} onChange={(e) => onDrumVolumeChange(parseFloat(e.target.value))} className="w-full h-2.5 bg-gray-400 rounded-lg appearance-none cursor-pointer accent-red-500" />
      </div>
      <div>
        <label htmlFor="drumPattern" className="block text-sm font-medium text-gray-300 mb-1">鼓組風格 (Pattern)</label>
        <select id="drumPattern" value={drumPattern} onChange={(e) => onDrumPatternChange(e.target.value as DrumPattern)} className="w-full p-2 bg-gray-400 border border-gray-500 rounded-md text-gray-900 focus:ring-red-500 focus:border-red-500">
          {DRUM_PATTERN_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      {drumPattern === DrumPattern.Custom && (
        <CustomDrumEditor
            chordProgression={chordProgressionForCustomEditor}
            customDrumData={customDrumData}
            onUpdateCell={onUpdateCustomDrumCell}
            onGenerateDrumPattern={onGenerateDrumPattern}
            drumPatternClipboard={drumPatternClipboard}
            onCopy={onCopyDrumPattern}
            onPaste={onPasteDrumPattern}
            generationState={generationState}
            isApiKeySet={isApiKeySet}
        />
      )}
    </>)}
  </div>
));
DrumKitPanel.displayName = 'DrumKitPanel';

interface BassGuitarPanelProps {
    bassEnabled: boolean;
    onBassEnabledChange: (enabled: boolean) => void;
    bassVolume: number;
    onBassVolumeChange: (volume: number) => void;
    bassInstrument: BassInstrument;
    onBassInstrumentChange: (instrument: BassInstrument) => void;
    bassPattern: BassPattern;
    onBassPatternChange: (pattern: BassPattern) => void;
}

const BassGuitarPanel: React.FC<BassGuitarPanelProps> = memo(({ bassEnabled, onBassEnabledChange, bassVolume, onBassVolumeChange, bassInstrument, onBassInstrumentChange, bassPattern, onBassPatternChange }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <label htmlFor="bassEnabled" className="text-sm font-medium text-gray-300">啟用貝斯 (Enable Bass)</label>
       <button id="bassEnabled" onClick={() => onBassEnabledChange(!bassEnabled)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${bassEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-400'}`} aria-pressed={bassEnabled}>
        {bassEnabled ? '已啟用 (ON)' : '已停用 (OFF)'}
      </button>
    </div>
    {bassEnabled && (<>
      <div>
        <label htmlFor="bassVolume" className="block text-sm font-medium text-gray-300 mb-1">音量: {bassVolume.toFixed(0)} dB</label>
        <input type="range" id="bassVolume" min={MIN_VOLUME} max={MAX_BASS_VOLUME} step="1" value={bassVolume} onChange={(e) => onBassVolumeChange(parseFloat(e.target.value))} className="w-full h-2.5 bg-gray-400 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
      </div>
      <div>
        <label htmlFor="bassInstrument" className="block text-sm font-medium text-gray-300 mb-1">貝斯音色 (Instrument)</label>
        <select id="bassInstrument" value={bassInstrument} onChange={(e) => onBassInstrumentChange(e.target.value as BassInstrument)} className="w-full p-2 bg-gray-400 border border-gray-500 rounded-md text-gray-900 focus:ring-yellow-500 focus:border-yellow-500">
          {BASS_INSTRUMENT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="bassPattern" className="block text-sm font-medium text-gray-300 mb-1">貝斯線風格 (Pattern)</label>
        <select id="bassPattern" value={bassPattern} onChange={(e) => onBassPatternChange(e.target.value as BassPattern)} className="w-full p-2 bg-gray-400 border border-gray-500 rounded-md text-gray-900 focus:ring-yellow-500 focus:border-yellow-500">
          {BASS_PATTERN_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
    </>)}
  </div>
));
BassGuitarPanel.displayName = 'BassGuitarPanel';

interface EffectsPanelProps {
    reverbLevel: number;
    onReverbLevelChange: (level: number) => void;
    delayLevel: number;
    onDelayLevelChange: (level: number) => void;
    swing: number;
    onSwingChange: (amount: number) => void;
}

const EffectsPanel: React.FC<EffectsPanelProps> = memo(({ reverbLevel, onReverbLevelChange, delayLevel, onDelayLevelChange, swing, onSwingChange }) => (
  <div className="space-y-3">
    <h4 className="text-md font-semibold text-gray-200">全域效果與律動</h4>
    <div>
      <label htmlFor="reverb" className="block text-sm font-medium text-gray-300 mb-1">殘響 (Reverb): {(reverbLevel * 100).toFixed(0)}%</label>
      <input type="range" id="reverb" min="0" max="1" step="0.01" value={reverbLevel} onChange={(e) => onReverbLevelChange(parseFloat(e.target.value))} className="w-full h-2.5 bg-gray-400 rounded-lg appearance-none cursor-pointer accent-teal-500" />
    </div>
     <div>
      <label htmlFor="delay" className="block text-sm font-medium text-gray-300 mb-1">延遲 (Delay): {(delayLevel * 100).toFixed(0)}%</label>
      <input type="range" id="delay" min="0" max="1" step="0.01" value={delayLevel} onChange={(e) => onDelayLevelChange(parseFloat(e.target.value))} className="w-full h-2.5 bg-gray-400 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
    </div>
    <div>
      <label htmlFor="swing" className="block text-sm font-medium text-gray-300 mb-1">搖擺律動 (Swing): {(swing * 100).toFixed(0)}%</label>
      <input type="range" id="swing" min="0" max="1" step="0.01" value={swing} onChange={(e) => onSwingChange(parseFloat(e.target.value))} className="w-full h-2.5 bg-gray-400 rounded-lg appearance-none cursor-pointer accent-pink-500" />
    </div>
  </div>
));
EffectsPanel.displayName = 'EffectsPanel';

const AccompanimentControls: React.FC<AccompanimentControlsProps> = (props) => {
  const {
    bpm, onBpmChange, isBeat,
    isPlaying, onPlay, onStop, isAudioReady, chordProgressionEmpty,
    // Destructure all props needed for panels
    accompanimentLayers, onAddAccompanimentLayer, onRemoveAccompanimentLayer, onUpdateAccompanimentLayer,
    chordProgressionForCustomEditor, customRhythms, onUpdateCustomBeat,
    reverbLevel, onReverbLevelChange, delayLevel, onDelayLevelChange, swing, onSwingChange,
    drumsEnabled, onDrumsEnabledChange, drumVolume, onDrumVolumeChange, drumPattern, onDrumPatternChange,
    customDrumData, onUpdateCustomDrumCell, onGenerateDrumPattern, drumPatternClipboard, onCopyDrumPattern, onPasteDrumPattern, generationState, isApiKeySet,
    bassEnabled, onBassEnabledChange, bassVolume, onBassVolumeChange, bassPattern, onBassPatternChange,
    bassInstrument, onBassInstrumentChange
  } = props;
  
  const [activeTab, setActiveTab] = useState<Tab>('chords');
  const playButtonDisabled = !isAudioReady || chordProgressionEmpty;

  return (
    <div className="p-4 bg-gray-700 rounded-lg shadow-md space-y-4">
      {/* --- Main Controls --- */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-100">伴奏 (Accompaniment)</h3>
          <div className="flex space-x-3">
            {!isPlaying ? (
              <button onClick={onPlay} disabled={playButtonDisabled} className={`px-5 py-2.5 rounded-md text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 ${playButtonDisabled ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 focus:ring-green-400'}`}>
                播放
              </button>
            ) : (
              <button onClick={onStop} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-700">
                停止
              </button>
            )}
          </div>
        </div>
        
        <div>
          <label htmlFor="bpm" className="flex items-center text-sm font-medium text-gray-300 mb-1">
            <span
              className={`w-2.5 h-2.5 mr-2 rounded-full bg-purple-500 transition-all duration-75 ${isBeat ? 'scale-150 opacity-100' : 'scale-100 opacity-50'}`}
              aria-hidden="true"
            ></span>
            速度 (Tempo): {bpm} BPM
          </label>
          <input type="range" id="bpm" min={MIN_BPM} max={MAX_BPM} value={bpm} onChange={(e) => onBpmChange(parseInt(e.target.value))}
            className="w-full h-2.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400" />
        </div>
      </div>

      {/* --- Tabs --- */}
      <div className="border-b border-gray-600 flex space-x-1" role="tablist">
        <TabButton tabName="chords" currentTab={activeTab} onClick={setActiveTab}>和弦</TabButton>
        <TabButton tabName="drums" currentTab={activeTab} onClick={setActiveTab}>鼓組</TabButton>
        <TabButton tabName="bass" currentTab={activeTab} onClick={setActiveTab}>貝斯</TabButton>
        <TabButton tabName="effects" currentTab={activeTab} onClick={setActiveTab}>效果</TabButton>
      </div>

      {/* --- Tab Content --- */}
      <div className="bg-gray-600 p-3 rounded-b-md rounded-r-md min-h-[200px]">
        {activeTab === 'chords' && <ChordInstrumentPanel 
            accompanimentLayers={accompanimentLayers}
            onAddAccompanimentLayer={onAddAccompanimentLayer}
            onRemoveAccompanimentLayer={onRemoveAccompanimentLayer}
            onUpdateAccompanimentLayer={onUpdateAccompanimentLayer}
            chordProgressionForCustomEditor={chordProgressionForCustomEditor}
            customRhythms={customRhythms}
            onUpdateCustomBeat={onUpdateCustomBeat}
        />}
        {activeTab === 'drums' && <DrumKitPanel 
            drumsEnabled={drumsEnabled}
            onDrumsEnabledChange={onDrumsEnabledChange}
            drumVolume={drumVolume}
            onDrumVolumeChange={onDrumVolumeChange}
            drumPattern={drumPattern}
            onDrumPatternChange={onDrumPatternChange}
            chordProgressionForCustomEditor={chordProgressionForCustomEditor}
            customDrumData={customDrumData}
            onUpdateCustomDrumCell={onUpdateCustomDrumCell}
            onGenerateDrumPattern={onGenerateDrumPattern}
            drumPatternClipboard={drumPatternClipboard}
            onCopyDrumPattern={onCopyDrumPattern}
            onPasteDrumPattern={onPasteDrumPattern}
            generationState={generationState}
            isApiKeySet={isApiKeySet}
        />}
        {activeTab === 'bass' && <BassGuitarPanel 
            bassEnabled={bassEnabled}
            onBassEnabledChange={onBassEnabledChange}
            bassVolume={bassVolume}
            onBassVolumeChange={onBassVolumeChange}
            bassPattern={bassPattern}
            onBassPatternChange={onBassPatternChange}
            bassInstrument={bassInstrument}
            onBassInstrumentChange={onBassInstrumentChange}
        />}
        {activeTab === 'effects' && <EffectsPanel
            reverbLevel={reverbLevel}
            onReverbLevelChange={onReverbLevelChange}
            delayLevel={delayLevel}
            onDelayLevelChange={onDelayLevelChange}
            swing={swing}
            onSwingChange={onSwingChange}
        />}
      </div>
      
      {(!isAudioReady) && <p className="text-xs text-yellow-400 text-center mt-1">點擊琴鍵或「播放」以初始化音訊引擎。</p>}
      {(isAudioReady && chordProgressionEmpty && !isPlaying) && <p className="text-xs text-yellow-400 text-center mt-1">請先新增和弦至和弦進行中才能播放伴奏。</p>}
    </div>
  );
};

export default AccompanimentControls;