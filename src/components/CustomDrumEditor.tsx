
import React from 'react';
import type { ChordWithIndex } from '../App';
import { DrumInstrument, CustomDrumProgressionData } from '../types';
import { DRUM_INSTRUMENT_OPTIONS, NUM_BEATS_PER_DRUM_MEASURE, NUM_SUBDIVISIONS_PER_DRUM_BEAT, createDefaultCustomDrumChordPattern } from '../constants';

interface CustomDrumEditorProps {
  chordProgression: ChordWithIndex[];
  customDrumData: CustomDrumProgressionData;
  onUpdateCell: (
    chordOriginalIndex: number,
    instrument: DrumInstrument,
    beatIndex: number,
    subdivisionIndex: number,
    isActive: boolean
  ) => void;
}

const CustomDrumEditor: React.FC<CustomDrumEditorProps> = ({
  chordProgression,
  customDrumData,
  onUpdateCell,
}) => {
  if (!chordProgression || chordProgression.length === 0) {
    return (
      <div className="p-3 my-2 text-sm text-center text-gray-400 bg-gray-500 rounded-md">
        請先在「和弦進行」中加入和弦以編輯自訂鼓組。
      </div>
    );
  }

  return (
    <div className="p-3 my-2 bg-gray-550 rounded-md space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700">
      <h4 className="text-sm font-semibold text-gray-200 mb-1">自訂鼓組編輯器 (Custom Drum Editor)</h4>
      {chordProgression.map((chordItem, chordIdx) => {
        const currentChordDrumPattern = customDrumData[chordItem.originalIndex] || createDefaultCustomDrumChordPattern();
        
        return (
          <div key={chordItem.id} className="p-2.5 bg-gray-500 rounded shadow-sm space-y-1.5">
            <h5 className="text-xs font-mono text-gray-200 mb-1">
              <span className="font-semibold">{chordIdx + 1}. {chordItem.root}{chordItem.type}</span>
            </h5>
            
            {DRUM_INSTRUMENT_OPTIONS.map(drumOpt => {
              const instrumentPattern = currentChordDrumPattern[drumOpt.value] || 
                                        Array(NUM_BEATS_PER_DRUM_MEASURE).fill(null).map(() => Array(NUM_SUBDIVISIONS_PER_DRUM_BEAT).fill(false));
              
              return (
                <div key={drumOpt.value} className="flex items-center space-x-1 sm:space-x-2">
                  <span className="w-[60px] sm:w-[70px] text-xs text-gray-300 truncate text-right pr-1" title={drumOpt.label}>
                    {drumOpt.label.split(' (')[0]}
                  </span>
                  <div className="flex-grow grid grid-cols-4 gap-x-0"> {/* Changed: gap-x set to 0 */}
                    {[0, 1, 2, 3].map(beatIndex => (
                      <div 
                        key={beatIndex} 
                        className={`
                          flex flex-col items-center py-1 
                          px-1 sm:px-2 // Added internal padding
                          ${beatIndex < NUM_BEATS_PER_DRUM_MEASURE - 1 ? 'border-r border-gray-400' : ''} // Added border
                        `}
                      >
                        <span className="text-[0.625rem] text-gray-400 leading-tight mb-0.5">{beatIndex + 1}</span>
                        <div className="flex space-x-px bg-gray-600 p-px rounded-sm shadow-inner">
                          {[0, 1, 2, 3].map(subdivisionIndex => {
                            const globalSubdivIdx = beatIndex * NUM_SUBDIVISIONS_PER_DRUM_BEAT + subdivisionIndex;
                            const isActive = instrumentPattern[beatIndex]?.[subdivisionIndex] || false;
                            
                            return (
                              <button
                                key={globalSubdivIdx}
                                type="button"
                                title={`${drumOpt.label} - 第 ${beatIndex + 1} 拍, 第 ${subdivisionIndex + 1} 分拍`}
                                aria-label={`${drumOpt.label} 第 ${beatIndex + 1} 拍 第 ${subdivisionIndex + 1} 分拍 ${isActive ? '啟用' : '停用'}`}
                                aria-pressed={isActive}
                                onClick={() => onUpdateCell(chordItem.originalIndex, drumOpt.value, beatIndex, subdivisionIndex, !isActive)}
                                className={`
                                  w-4 h-4 sm:w-5 sm:h-5 rounded-[2px] transition-colors duration-100
                                  focus:outline-none focus:ring-1 focus:ring-purple-400 focus:z-10
                                  ${isActive ? 'bg-red-500 hover:bg-red-400 shadow-sm' : 'bg-slate-500 hover:bg-slate-400'}
                                `}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default CustomDrumEditor;
