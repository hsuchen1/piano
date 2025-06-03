
import React from 'react';
import { AccompanimentInstrument, AccompanimentRhythmPattern, ChordDefinition, BeatDuration } from '../types';
import { MIN_BPM, MAX_BPM, MIN_VOLUME, MAX_VOLUME, ACCOMPANIMENT_INSTRUMENT_OPTIONS, ACCOMPANIMENT_RHYTHM_PATTERN_OPTIONS } from '../constants';
import CustomRhythmEditor from './CustomRhythmEditor'; // Import the new component
import type { ChordWithIndex } from '../App'; // Import ChordWithIndex

interface AccompanimentControlsProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  volume: number;
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
  // Props for Custom Rhythm Editor
  chordProgressionForCustomEditor: ChordWithIndex[];
  customRhythmData: BeatDuration[][]; // Updated type
  onUpdateCustomBeat: (chordIndex: number, beatIndex: number, newDuration: BeatDuration) => void; // Updated type
}

const AccompanimentControls: React.FC<AccompanimentControlsProps> = ({
  bpm, onBpmChange, volume, onVolumeChange, instrument, onInstrumentChange,
  rhythmPattern, onRhythmPatternChange,
  isPlaying, onPlay, onStop, isAudioReady, chordProgressionEmpty,
  chordProgressionForCustomEditor, customRhythmData, onUpdateCustomBeat
}) => {
  const playButtonDisabled = !isAudioReady || chordProgressionEmpty;

  return (
    <div className="p-4 bg-gray-700 rounded-lg shadow-md space-y-4">
      <h3 className="text-lg font-semibold text-center text-gray-100">伴奏控制</h3>
      
      <div>
        <label htmlFor="bpm" className="block text-sm font-medium text-gray-300 mb-1">速度 (Tempo): {bpm} BPM</label>
        <input
          type="range"
          id="bpm"
          min={MIN_BPM}
          max={MAX_BPM}
          value={bpm}
          onChange={(e) => onBpmChange(parseInt(e.target.value))}
          className="w-full h-2.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="調整伴奏速度"
        />
      </div>

      <div>
        <label htmlFor="volume" className="block text-sm font-medium text-gray-300 mb-1">音量 (Volume): {volume.toFixed(0)} dB</label>
        <input
          type="range"
          id="volume"
          min={MIN_VOLUME}
          max={MAX_VOLUME}
          step="1"
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="w-full h-2.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="調整伴奏音量"
        />
      </div>

      <div>
        <label htmlFor="instrument" className="block text-sm font-medium text-gray-300 mb-1">樂器 (Instrument)</label>
        <select
          id="instrument"
          value={instrument}
          onChange={(e) => onInstrumentChange(e.target.value as AccompanimentInstrument)}
          className="w-full p-2.5 bg-gray-600 border border-gray-500 rounded-md text-gray-100 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          aria-label="選擇伴奏樂器"
        >
          {ACCOMPANIMENT_INSTRUMENT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="rhythmPattern" className="block text-sm font-medium text-gray-300 mb-1">節奏型態 (Rhythm Pattern)</label>
        <select
          id="rhythmPattern"
          value={rhythmPattern}
          onChange={(e) => onRhythmPatternChange(e.target.value as AccompanimentRhythmPattern)}
          className="w-full p-2.5 bg-gray-600 border border-gray-500 rounded-md text-gray-100 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          aria-label="選擇伴奏節奏型態"
        >
          {ACCOMPANIMENT_RHYTHM_PATTERN_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {rhythmPattern === AccompanimentRhythmPattern.Custom && (
        <CustomRhythmEditor
          chordProgression={chordProgressionForCustomEditor}
          customRhythmData={customRhythmData}
          onUpdateBeat={onUpdateCustomBeat}
        />
      )}

      <div className="flex space-x-3">
        {!isPlaying ? (
          <button
            onClick={onPlay}
            disabled={playButtonDisabled}
            className={`w-full px-4 py-2.5 rounded-md text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 ${playButtonDisabled ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 focus:ring-green-400'}`}
            aria-label="播放伴奏"
          >
            播放 (Play)
          </button>
        ) : (
          <button
            onClick={onStop}
            className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-700"
            aria-label="停止伴奏"
          >
            停止 (Stop)
          </button>
        )}
      </div>
      {(!isAudioReady) && <p className="text-xs text-yellow-400 text-center mt-1">點擊琴鍵或「播放」以初始化音訊引擎。</p>}
      {(isAudioReady && chordProgressionEmpty && !isPlaying) && <p className="text-xs text-yellow-400 text-center mt-1">請先新增和弦至和弦進行中才能播放伴奏。</p>}
    </div>
  );
};

export default AccompanimentControls;