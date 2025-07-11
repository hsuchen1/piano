import React from 'react';
import type { ChordWithIndex } from '../App';
import { BeatDuration } from '../types';
import { BEAT_DURATION_OPTIONS, DEFAULT_CUSTOM_BEAT_DURATION } from '../constants';

interface CustomRhythmEditorProps {
  chordProgression: ChordWithIndex[];
  customRhythmDataForLayer: BeatDuration[][];
  onUpdateBeat: (chordIndex: number, beatIndex: number, newDuration: BeatDuration) => void;
}

const BeatButton: React.FC<{
  option: typeof BEAT_DURATION_OPTIONS[0],
  isSelected: boolean,
  onClick: () => void
}> = ({ option, isSelected, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex-1 px-1 py-1 text-[11px] font-mono font-semibold transition-colors duration-150
        border-t border-b border-gray-600
        first:border-l first:rounded-l-md
        last:border-r last:rounded-r-md
        focus:outline-none focus:ring-1 focus:ring-blue-400 focus:z-10
        ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
      `}
      title={option.label}
    >
      {option.shortLabel}
    </button>
  );
};

const CustomRhythmEditor: React.FC<CustomRhythmEditorProps> = ({
  chordProgression,
  customRhythmDataForLayer,
  onUpdateBeat,
}) => {
  if (!chordProgression || chordProgression.length === 0) {
    return (
      <div className="p-3 my-2 text-sm text-center text-gray-400 bg-gray-500 rounded-md">
        請先在「和弦進行」中加入和弦以編輯自訂節奏。
      </div>
    );
  }

  return (
    <div className="p-3 my-2 bg-gray-600 rounded-md space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700">
      <h4 className="text-sm font-semibold text-gray-200 mb-2">自訂節奏編輯器 (每拍音符時值)</h4>
      {chordProgression.map((chordItem, chordIdx) => {
        const chordBeats = customRhythmDataForLayer[chordItem.originalIndex] || 
                           Array(4).fill(DEFAULT_CUSTOM_BEAT_DURATION);
        
        return (
          <div key={chordItem.id} className="p-2 bg-gray-500 rounded hover:bg-gray-450 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono text-gray-200 truncate" title={`${chordItem.root}${chordItem.type}`}>
                {chordIdx + 1}. {chordItem.root}{chordItem.type}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {chordBeats.map((currentDuration, beatIdx) => (
                <div key={beatIdx} className="flex flex-col items-center">
                  <label htmlFor={`beat-${chordItem.id}-${beatIdx}`} className="text-xs text-gray-300 mb-1">
                    第 {beatIdx + 1} 拍
                  </label>
                  <div id={`beat-${chordItem.id}-${beatIdx}`} className="inline-flex w-full" role="group">
                    {BEAT_DURATION_OPTIONS.map(opt => (
                       <BeatButton
                          key={opt.value}
                          option={opt}
                          isSelected={currentDuration === opt.value}
                          onClick={() => onUpdateBeat(chordItem.originalIndex, beatIdx, opt.value)}
                       />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CustomRhythmEditor;
