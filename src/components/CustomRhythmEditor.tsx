import React from 'react';
import type { ChordWithIndex } from '../App'; // Using ChordWithIndex for consistent typing
import { BeatDuration } from '../types';
import { BEAT_DURATION_OPTIONS, DEFAULT_CUSTOM_BEAT_DURATION } from '../constants';

interface CustomRhythmEditorProps {
  chordProgression: ChordWithIndex[]; // Use ChordWithIndex for consistency
  customRhythmData: BeatDuration[][];
  onUpdateBeat: (chordIndex: number, beatIndex: number, newDuration: BeatDuration) => void;
}

const CustomRhythmEditor: React.FC<CustomRhythmEditorProps> = ({
  chordProgression,
  customRhythmData,
  onUpdateBeat,
}) => {
  if (!chordProgression || chordProgression.length === 0) {
    return (
      <div className="p-3 my-2 text-sm text-center text-gray-400 bg-gray-600 rounded-md">
        請先在「和弦進行」中加入和弦以編輯自訂節奏。
      </div>
    );
  }

  return (
    <div className="p-3 my-2 bg-gray-600 rounded-md space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700">
      <h4 className="text-sm font-semibold text-gray-200 mb-2">自訂節奏編輯器 (每拍音符時值)</h4>
      {chordProgression.map((chordItem, chordIdx) => {
        // Ensure chordBeats is an array of 4 BeatDuration values
        const chordBeats = customRhythmData[chordItem.originalIndex] || 
                           Array(4).fill(DEFAULT_CUSTOM_BEAT_DURATION);
        
        return (
          <div key={chordItem.id} className="grid grid-cols-5 items-center gap-x-2 p-2 bg-gray-500 rounded hover:bg-gray-450 transition-colors">
            <span className="col-span-1 text-xs font-mono text-gray-200 truncate" title={`${chordItem.root}${chordItem.type}`}>
              {chordIdx + 1}. {chordItem.root}{chordItem.type}
            </span>
            {chordBeats.map((currentDuration, beatIdx) => (
              <div key={beatIdx} className="col-span-1">
                <label htmlFor={`beat-${chordItem.id}-${beatIdx}`} className="sr-only">
                  和弦 {chordIdx + 1} 第 {beatIdx + 1} 拍時值
                </label>
                <select
                  id={`beat-${chordItem.id}-${beatIdx}`}
                  value={currentDuration}
                  onChange={(e) => onUpdateBeat(chordItem.originalIndex, beatIdx, e.target.value as BeatDuration)}
                  className="w-full p-1.5 text-xs bg-gray-400 border border-gray-500 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  aria-label={`和弦 ${chordIdx + 1} 第 ${beatIdx + 1} 拍時值`}
                >
                  {BEAT_DURATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label.split(' ')[0]}</option> // Show only "全音符" etc. for brevity
                  ))}
                </select>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default CustomRhythmEditor;