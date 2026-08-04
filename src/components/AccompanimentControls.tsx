

import React, { useState, memo } from 'react';
import { AccompanimentInstrument, AccompanimentRhythmPattern, BeatDuration, DrumPattern, DrumInstrument, BassPattern, BassInstrument, CustomDrumProgressionData, AccompanimentLayer, CustomDrumChordPattern, GenerationState } from '../types';
import { MIN_BPM, MAX_BPM, MIN_VOLUME, MAX_VOLUME, ACCOMPANIMENT_INSTRUMENT_OPTIONS, ACCOMPANIMENT_RHYTHM_PATTERN_OPTIONS, DRUM_PATTERN_OPTIONS, BASS_INSTRUMENT_OPTIONS, BASS_PATTERN_OPTIONS, MAX_BASS_VOLUME } from '../constants';
import CustomRhythmEditor from './CustomRhythmEditor';
import CustomDrumEditor from './CustomDrumEditor';
import RangeSlider from './RangeSlider';
import AiPromptDialog from '../ui/AiPromptDialog';
import type { ChordWithIndex } from '../types';

type Tab = 'chords' | 'drums' | 'bass' | 'effects';

/**
 * This component used to take 47 flat props, which made every call site a wall of
 * bindings and gave no hint about which values belonged together. The props are now
 * grouped to mirror the four tabs plus the transport bar.
 *
 * Each group is spread into its panel rather than passed as an object, so the
 * memoised panels keep comparing individual primitives and do not re-render just
 * because a wrapper object was recreated.
 */

/** Playback and tempo, shown above the tabs. */
export interface TransportControlsProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  /** Pulses in time with the beat. */
  isBeat: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  isAudioReady: boolean;
}

/** The "chords" tab: one entry per accompaniment layer. */
export interface ChordLayerControlsProps {
  accompanimentLayers: AccompanimentLayer[];
  onAddAccompanimentLayer: () => void;
  onRemoveAccompanimentLayer: (id: string) => void;
  onUpdateAccompanimentLayer: <K extends keyof AccompanimentLayer>(id: string, field: K, value: AccompanimentLayer[K]) => void;
  customRhythms: Record<string, BeatDuration[][]>;
  onUpdateCustomBeat: (layerId: string, chordIndex: number, beatIndex: number, newDuration: BeatDuration) => void;
}

/** The "drums" tab. */
export interface DrumControlsProps {
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
}

/** The "bass" tab. */
export interface BassControlsProps {
  bassEnabled: boolean;
  onBassEnabledChange: (enabled: boolean) => void;
  bassVolume: number;
  onBassVolumeChange: (volume: number) => void;
  bassPattern: BassPattern;
  onBassPatternChange: (pattern: BassPattern) => void;
  bassInstrument: BassInstrument;
  onBassInstrumentChange: (instrument: BassInstrument) => void;
  onGenerateAIBassline: (prompt: string) => void;
}

/** The "effects" tab. These apply to every voice, including manual playing. */
export interface EffectControlsProps {
  reverbLevel: number;
  onReverbLevelChange: (level: number) => void;
  delayLevel: number;
  onDelayLevelChange: (level: number) => void;
  swing: number;
  onSwingChange: (amount: number) => void;
}

interface AccompanimentControlsProps {
  /**
   * Attached to the transport row so the caller can tell when it scrolls out of
   * view and show a floating transport instead.
   */
  transportRef?: (node: HTMLDivElement | null) => void;
  transport: TransportControlsProps;
  layers: ChordLayerControlsProps;
  drums: DrumControlsProps;
  bass: BassControlsProps;
  effects: EffectControlsProps;
  /** Shared by the chord and drum tabs, which both edit per-chord grids. */
  progression: ChordWithIndex[];
  generationState: GenerationState;
  isApiKeySet: boolean;
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
      <div key={layer.id} className="bg-surface-1 p-3 rounded-lg space-y-3 relative border-l-2 border-blue-500">
        <span className="absolute -top-2 -left-2.5 w-5 h-5 bg-blue-500 text-white text-xs flex items-center justify-center rounded-full font-bold">{index + 1}</span>
        {accompanimentLayers.length > 1 && (
          <button onClick={() => onRemoveAccompanimentLayer(layer.id)} className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors focus:outline-none focus:ring-1 focus:ring-red-400" aria-label={`移除伴奏層 ${index + 1}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
        <div>
          <label htmlFor={`chordVolume-${layer.id}`} className="block text-sm font-medium text-gray-300 mb-1">音量: {layer.volume.toFixed(0)} dB</label>
          <RangeSlider
            id={`chordVolume-${layer.id}`}
            min={MIN_VOLUME}
            max={MAX_VOLUME}
            step={1}
            value={layer.volume}
            onChange={(val) => onUpdateAccompanimentLayer(layer.id, 'volume', val)}
            color="blue"
            ariaLabel={`伴奏層 ${index + 1} 音量`}
          />
        </div>
        <div>
          <label htmlFor={`chordInstrument-${layer.id}`} className="block text-sm font-medium text-gray-300 mb-1">樂器</label>
          <select id={`chordInstrument-${layer.id}`} value={layer.instrument} onChange={(e) => onUpdateAccompanimentLayer(layer.id, 'instrument', e.target.value as AccompanimentInstrument)} className="w-full p-2 bg-surface-2 border border-surface-line rounded-md text-gray-100 focus:ring-blue-500 focus:border-blue-500">
            {ACCOMPANIMENT_INSTRUMENT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`chordRhythmPattern-${layer.id}`} className="block text-sm font-medium text-gray-300 mb-1">節奏型態</label>
          <select id={`chordRhythmPattern-${layer.id}`} value={layer.rhythmPattern} onChange={(e) => onUpdateAccompanimentLayer(layer.id, 'rhythmPattern', e.target.value as AccompanimentRhythmPattern)} className="w-full p-2 bg-surface-2 border border-surface-line rounded-md text-gray-100 focus:ring-blue-500 focus:border-blue-500">
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
    generationState: GenerationState;
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
        <RangeSlider
          id="drumVolume"
          min={MIN_VOLUME}
          max={MAX_VOLUME}
          step={1}
          value={drumVolume}
          onChange={onDrumVolumeChange}
          color="red"
          ariaLabel="鼓組音量"
        />
      </div>
      <div>
        <label htmlFor="drumPattern" className="block text-sm font-medium text-gray-300 mb-1">鼓組風格 (Pattern)</label>
        <select id="drumPattern" value={drumPattern} onChange={(e) => onDrumPatternChange(e.target.value as DrumPattern)} className="w-full p-2 bg-surface-2 border border-surface-line rounded-md text-gray-100 focus:ring-red-500 focus:border-red-500">
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
    onGenerateAIBassline: (prompt: string) => void;
    chordProgressionEmpty: boolean;
    isApiKeySet: boolean;
    generationState: GenerationState;
}

const BassGuitarPanel: React.FC<BassGuitarPanelProps> = memo(({ bassEnabled, onBassEnabledChange, bassVolume, onBassVolumeChange, bassInstrument, onBassInstrumentChange, bassPattern, onBassPatternChange, onGenerateAIBassline, chordProgressionEmpty, isApiKeySet, generationState }) => {
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const isGeneratingBass = generationState.isLoading && generationState.type === 'bass';
  const canPerformAiAction = isApiKeySet && !chordProgressionEmpty;

  return (
    <>
      {isAiModalOpen && (
        <AiPromptDialog
          title="AI 貝斯線生成"
          description="輸入您想要的貝斯線風格，AI 將會為您目前的和弦進行創作一段貝斯線。"
          placeholder="例如：a funky slap bassline, a simple melodic walking bass, a driving rock bass..."
          onSubmit={prompt => {
            onGenerateAIBassline(prompt);
            setIsAiModalOpen(false);
          }}
          onCancel={() => setIsAiModalOpen(false)}
        />
      )}
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
            <RangeSlider
              id="bassVolume"
              min={MIN_VOLUME}
              max={MAX_BASS_VOLUME}
              step={1}
              value={bassVolume}
              onChange={onBassVolumeChange}
              color="yellow"
              ariaLabel="貝斯音量"
            />
          </div>
          <div>
            <label htmlFor="bassInstrument" className="block text-sm font-medium text-gray-300 mb-1">貝斯音色 (Instrument)</label>
            <select id="bassInstrument" value={bassInstrument} onChange={(e) => onBassInstrumentChange(e.target.value as BassInstrument)} className="w-full p-2 bg-surface-2 border border-surface-line rounded-md text-gray-100 focus:ring-yellow-500 focus:border-yellow-500">
              {BASS_INSTRUMENT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="bassPattern" className="block text-sm font-medium text-gray-300 mb-1">貝斯線風格 (Pattern)</label>
            <select id="bassPattern" value={bassPattern} onChange={(e) => onBassPatternChange(e.target.value as BassPattern)} className="w-full p-2 bg-surface-2 border border-surface-line rounded-md text-gray-100 focus:ring-yellow-500 focus:border-yellow-500">
              {BASS_PATTERN_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          {bassPattern === BassPattern.AiGenerated && (
              <div className="p-3 bg-gray-500 rounded-md mt-2">
                <button
                  onClick={() => setIsAiModalOpen(true)}
                  disabled={!canPerformAiAction || isGeneratingBass}
                  className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-md transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                  title={!isApiKeySet ? "請先設定 API 金鑰" : (chordProgressionEmpty ? "請先新增和弦" : "")}
                >
                  {isGeneratingBass ? '生成中...' : '✨ 生成 AI 貝斯線'}
                </button>
                {generationState.type === 'bass' && generationState.error && (
                  <p className="text-xs text-red-300 text-center mt-2">{generationState.error}</p>
                )}
              </div>
            )}
        </>)}
      </div>
    </>
  );
});
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
      <RangeSlider id="reverb" min={0} max={1} step={0.01} value={reverbLevel} onChange={onReverbLevelChange} color="teal" ariaLabel="殘響程度" />
    </div>
     <div>
      <label htmlFor="delay" className="block text-sm font-medium text-gray-300 mb-1">延遲 (Delay): {(delayLevel * 100).toFixed(0)}%</label>
      <RangeSlider id="delay" min={0} max={1} step={0.01} value={delayLevel} onChange={onDelayLevelChange} color="cyan" ariaLabel="延遲程度" />
    </div>
    <div>
      <label htmlFor="swing" className="block text-sm font-medium text-gray-300 mb-1">搖擺律動 (Swing): {(swing * 100).toFixed(0)}%</label>
      <RangeSlider id="swing" min={0} max={1} step={0.01} value={swing} onChange={onSwingChange} color="pink" ariaLabel="搖擺律動程度" />
    </div>
  </div>
));
EffectsPanel.displayName = 'EffectsPanel';

const AccompanimentControls: React.FC<AccompanimentControlsProps> = ({
  transportRef,
  transport,
  layers,
  drums,
  bass,
  effects,
  progression,
  generationState,
  isApiKeySet,
}) => {
  const { bpm, onBpmChange, isBeat, isPlaying, onPlay, onStop, isAudioReady } = transport;

  const [activeTab, setActiveTab] = useState<Tab>('chords');

  // Derived rather than passed in: the caller already gives us the progression, so
  // a separate `chordProgressionEmpty` prop was a second source of truth for the
  // same fact.
  const chordProgressionEmpty = progression.length === 0;
  const playButtonDisabled = !isAudioReady || chordProgressionEmpty;

  return (
    <div className="p-4 bg-surface-1 border border-surface-line rounded-lg shadow-md space-y-4">
      {/* --- Main Controls --- */}
      <div className="space-y-4" ref={transportRef}>
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
          <RangeSlider
            id="bpm"
            min={MIN_BPM}
            max={MAX_BPM}
            step={1}
            value={bpm}
            onChange={onBpmChange}
            color="purple"
            ariaLabel="伴奏速度"
          />
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
      <div className="bg-surface-2 p-3 rounded-b-md rounded-r-md min-h-[200px]">
        {/* Groups are spread, not passed as objects, so each memoised panel still
            compares individual values instead of a fresh wrapper reference. */}
        {activeTab === 'chords' && <ChordInstrumentPanel
            {...layers}
            chordProgressionForCustomEditor={progression}
        />}
        {activeTab === 'drums' && <DrumKitPanel
            {...drums}
            chordProgressionForCustomEditor={progression}
            generationState={generationState}
            isApiKeySet={isApiKeySet}
        />}
        {activeTab === 'bass' && <BassGuitarPanel
            {...bass}
            chordProgressionEmpty={chordProgressionEmpty}
            isApiKeySet={isApiKeySet}
            generationState={generationState}
        />}
        {activeTab === 'effects' && <EffectsPanel {...effects} />}
      </div>
      
      {(!isAudioReady) && <p className="text-xs text-yellow-400 text-center mt-1">點擊琴鍵或「播放」以初始化音訊引擎。</p>}
      {(isAudioReady && chordProgressionEmpty && !isPlaying) && <p className="text-xs text-yellow-400 text-center mt-1">請先新增和弦至和弦進行中才能播放伴奏。</p>}
    </div>
  );
};

export default AccompanimentControls;