import React from 'react';
import { AccompanimentInstrument, AccompanimentRhythmPattern, BeatDuration, DrumPattern, DrumInstrument, BassPattern, BassInstrument, CustomDrumProgressionData } from '../types';
import { MIN_BPM, MAX_BPM, MIN_VOLUME, MAX_VOLUME, ACCOMPANIMENT_INSTRUMENT_OPTIONS, ACCOMPANIMENT_RHYTHM_PATTERN_OPTIONS, DRUM_PATTERN_OPTIONS, BASS_INSTRUMENT_OPTIONS, BASS_PATTERN_OPTIONS, MAX_BASS_VOLUME } from '../constants';
import CustomRhythmEditor from './CustomRhythmEditor';
import CustomDrumEditor from './CustomDrumEditor'; // New import
import type { ChordWithIndex } from '../App';

interface AccompanimentControlsProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  volume: number; // Chord instrument volume
  onVolumeChange: (volume: number) => void;
  instrument: AccompanimentInstrument;
  onInstrumentChange: (instrument: AccompanimentInstrument) => void;
  rhythmPattern: AccompanimentRhythmPattern;
  onRhythmPatternChange: (pattern: AccompanimentRhythmPattern) => void;
  
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  isAudioReady: boolean;
  chordProgressionEmpty: boolean;
  
  chordProgressionForCustomEditor: ChordWithIndex[];
  customRhythmData: BeatDuration[][];
  onUpdateCustomBeat: (chordIndex: number, beatIndex: number, newDuration: BeatDuration) => void;

  // Drum Props
  drumsEnabled: boolean;
  onDrumsEnabledChange: (enabled: boolean) => void;
  drumVolume: number;
  onDrumVolumeChange: (volume: number) => void;
  drumPattern: DrumPattern;
  onDrumPatternChange: (pattern: DrumPattern) => void;
  customDrumData: CustomDrumProgressionData;
  onUpdateCustomDrumCell: (chordOriginalIndex: number, instrument: DrumInstrument, beatIndex: number, subdivisionIndex: number, isActive: boolean) => void;

  // Bass Props
  bassEnabled: boolean;
  onBassEnabledChange: (enabled: boolean) => void;
  bassVolume: number;
  onBassVolumeChange: (volume: number) => void;
  bassPattern: BassPattern;
  onBassPatternChange: (pattern: BassPattern) => void;
  bassInstrument: BassInstrument;
  onBassInstrumentChange: (instrument: BassInstrument) => void;
}

const AccompanimentControls: React.FC<AccompanimentControlsProps> = ({
  bpm, onBpmChange, volume, onVolumeChange, instrument, onInstrumentChange,
  rhythmPattern, onRhythmPatternChange,
  isPlaying, onPlay, onStop, isAudioReady, chordProgressionEmpty,
  chordProgressionForCustomEditor, customRhythmData, onUpdateCustomBeat,
  // Drum Props
  drumsEnabled, onDrumsEnabledChange, drumVolume, onDrumVolumeChange, drumPattern, onDrumPatternChange, customDrumData, onUpdateCustomDrumCell,
  // Bass Props
  bassEnabled, onBassEnabledChange, bassVolume, onBassVolumeChange, bassPattern, onBassPatternChange, bassInstrument, onBassInstrumentChange
}) => {
  const playButtonDisabled = !isAudioReady || chordProgressionEmpty;

  return (
    <div className="p-4 bg-gray-700 rounded-lg shadow-md space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-center text-gray-100">伴奏控制 (Accompaniment)</h3>
        <div className="flex space-x-3">
          {!isPlaying ? (
            <button
              onClick={onPlay}
              disabled={playButtonDisabled}
              className={`px-5 py-2.5 rounded-md text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 ${playButtonDisabled ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 focus:ring-green-400'}`}
              aria-label="播放伴奏"
            >
              播放 (Play)
            </button>
          ) : (
            <button
              onClick={onStop}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-700"
              aria-label="停止伴奏"
            >
              停止 (Stop)
            </button>
          )}
        </div>
      </div>
      
      <div>
        <label htmlFor="bpm" className="block text-sm font-medium text-gray-300 mb-1">總體速度 (Overall Tempo): {bpm} BPM</label>
        <input
          type="range" id="bpm" min={MIN_BPM} max={MAX_BPM} value={bpm}
          onChange={(e) => onBpmChange(parseInt(e.target.value))}
          className="w-full h-2.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
          aria-label="調整伴奏速度"
        />
      </div>

      {/* Section 1: Chord Accompaniment */}
      <details className="bg-gray-650 p-3 rounded-md group" open>
        <summary className="text-md font-semibold text-gray-200 cursor-pointer list-none flex justify-between items-center hover:text-purple-300 transition-colors">
          和弦樂器伴奏 (Chord Instrument)
          <span className="text-purple-400 group-hover:text-purple-300 text-xs transition-transform duration-200 group-open:rotate-90">&#9656;</span>
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="chordVolume" className="block text-sm font-medium text-gray-300 mb-1">音量 (Volume): {volume.toFixed(0)} dB</label>
            <input type="range" id="chordVolume" min={MIN_VOLUME} max={MAX_VOLUME} step="1" value={volume} onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full h-2.5 bg-gray-500 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label htmlFor="chordInstrument" className="block text-sm font-medium text-gray-300 mb-1">樂器 (Instrument)</label>
            <select id="chordInstrument" value={instrument} onChange={(e) => onInstrumentChange(e.target.value as AccompanimentInstrument)}
              className="w-full p-2 bg-gray-500 border border-gray-400 rounded-md text-gray-100 focus:ring-blue-500 focus:border-blue-500 transition-colors">
              {ACCOMPANIMENT_INSTRUMENT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="chordRhythmPattern" className="block text-sm font-medium text-gray-300 mb-1">節奏型態 (Rhythm Pattern)</label>
            <select id="chordRhythmPattern" value={rhythmPattern} onChange={(e) => onRhythmPatternChange(e.target.value as AccompanimentRhythmPattern)}
              className="w-full p-2 bg-gray-500 border border-gray-400 rounded-md text-gray-100 focus:ring-blue-500 focus:border-blue-500 transition-colors">
              {ACCOMPANIMENT_RHYTHM_PATTERN_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          {rhythmPattern === AccompanimentRhythmPattern.Custom && (
            <CustomRhythmEditor chordProgression={chordProgressionForCustomEditor} customRhythmData={customRhythmData} onUpdateBeat={onUpdateCustomBeat} />
          )}
        </div>
      </details>

      {/* Section 2: Drum Accompaniment */}
      <details className="bg-gray-650 p-3 rounded-md group">
        <summary className="text-md font-semibold text-gray-200 cursor-pointer list-none flex justify-between items-center hover:text-purple-300 transition-colors">
          鼓組伴奏 (Drum Kit)
          <span className="text-purple-400 group-hover:text-purple-300 text-xs transition-transform duration-200 group-open:rotate-90">&#9656;</span>
        </summary>
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="drumsEnabled" className="text-sm font-medium text-gray-300">啟用鼓組 (Enable Drums)</label>
            <button
              id="drumsEnabled"
              onClick={() => onDrumsEnabledChange(!drumsEnabled)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${drumsEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-400'}`}
              aria-pressed={drumsEnabled}
            >
              {drumsEnabled ? '已啟用 (ON)' : '已停用 (OFF)'}
            </button>
          </div>
          {drumsEnabled && (<>
            <div>
              <label htmlFor="drumVolume" className="block text-sm font-medium text-gray-300 mb-1">音量 (Volume): {drumVolume.toFixed(0)} dB</label>
              <input type="range" id="drumVolume" min={MIN_VOLUME} max={MAX_VOLUME} step="1" value={drumVolume} onChange={(e) => onDrumVolumeChange(parseFloat(e.target.value))}
                className="w-full h-2.5 bg-gray-500 rounded-lg appearance-none cursor-pointer accent-red-500 focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div>
              <label htmlFor="drumPattern" className="block text-sm font-medium text-gray-300 mb-1">鼓組風格 (Pattern)</label>
              <select id="drumPattern" value={drumPattern} onChange={(e) => onDrumPatternChange(e.target.value as DrumPattern)}
                className="w-full p-2 bg-gray-500 border border-gray-400 rounded-md text-gray-100 focus:ring-red-500 focus:border-red-500 transition-colors">
                {DRUM_PATTERN_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            {drumPattern === DrumPattern.Custom && (
              <CustomDrumEditor
                chordProgression={chordProgressionForCustomEditor}
                customDrumData={customDrumData}
                onUpdateCell={onUpdateCustomDrumCell}
              />
            )}
          </>)}
        </div>
      </details>

      {/* Section 3: Bass Accompaniment */}
      <details className="bg-gray-650 p-3 rounded-md group">
        <summary className="text-md font-semibold text-gray-200 cursor-pointer list-none flex justify-between items-center hover:text-purple-300 transition-colors">
          貝斯伴奏 (Bass Guitar)
          <span className="text-purple-400 group-hover:text-purple-300 text-xs transition-transform duration-200 group-open:rotate-90">&#9656;</span>
        </summary>
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="bassEnabled" className="text-sm font-medium text-gray-300">啟用貝斯 (Enable Bass)</label>
             <button
              id="bassEnabled"
              onClick={() => onBassEnabledChange(!bassEnabled)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${bassEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-400'}`}
              aria-pressed={bassEnabled}
            >
              {bassEnabled ? '已啟用 (ON)' : '已停用 (OFF)'}
            </button>
          </div>
          {bassEnabled && (<>
            <div>
              <label htmlFor="bassVolume" className="block text-sm font-medium text-gray-300 mb-1">音量 (Volume): {bassVolume.toFixed(0)} dB</label>
              <input type="range" id="bassVolume" min={MIN_VOLUME} max={MAX_BASS_VOLUME} step="1" value={bassVolume} onChange={(e) => onBassVolumeChange(parseFloat(e.target.value))}
                className="w-full h-2.5 bg-gray-500 rounded-lg appearance-none cursor-pointer accent-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div>
              <label htmlFor="bassInstrument" className="block text-sm font-medium text-gray-300 mb-1">貝斯音色 (Instrument)</label>
              <select id="bassInstrument" value={bassInstrument} onChange={(e) => onBassInstrumentChange(e.target.value as BassInstrument)}
                className="w-full p-2 bg-gray-500 border border-gray-400 rounded-md text-gray-100 focus:ring-yellow-500 focus:border-yellow-500 transition-colors">
                {BASS_INSTRUMENT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="bassPattern" className="block text-sm font-medium text-gray-300 mb-1">貝斯線風格 (Pattern)</label>
              <select id="bassPattern" value={bassPattern} onChange={(e) => onBassPatternChange(e.target.value as BassPattern)}
                className="w-full p-2 bg-gray-500 border border-gray-400 rounded-md text-gray-100 focus:ring-yellow-500 focus:border-yellow-500 transition-colors">
                {BASS_PATTERN_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </>)}
        </div>
      </details>
      
      {(!isAudioReady) && <p className="text-xs text-yellow-400 text-center mt-1">點擊琴鍵或「播放」以初始化音訊引擎。</p>}
      {(isAudioReady && chordProgressionEmpty && !isPlaying) && <p className="text-xs text-yellow-400 text-center mt-1">請先新增和弦至和弦進行中才能播放伴奏。</p>}
    </div>
  );
};

export default AccompanimentControls;