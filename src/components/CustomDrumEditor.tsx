
import React, {useState} from 'react';
import type { ChordWithIndex } from '../App';
import { DrumInstrument, CustomDrumProgressionData, CustomDrumChordPattern } from '../types';
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
  onGenerateDrumPattern: (prompt: string, chordOriginalIndex: number) => void;
  generationState: { type: string | null; isLoading: boolean; error: string | null; drumChordIndex?: number; };
  isApiKeySet: boolean;
}

const CustomDrumEditor: React.FC<CustomDrumEditorProps> = ({
  chordProgression,
  customDrumData,
  onUpdateCell,
  onGenerateDrumPattern,
  generationState,
  isApiKeySet,
}) => {
  const [editingAiForChordIndex, setEditingAiForChordIndex] = useState<number | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');

  if (!chordProgression || chordProgression.length === 0) {
    return (
      <div className="p-3 my-2 text-sm text-center text-gray-400 bg-gray-500 rounded-md">
        請先在「和弦進行」中加入和弦以編輯自訂鼓組。
      </div>
    );
  }

  const handleGenerateClick = () => {
    if (aiPrompt.trim() && editingAiForChordIndex !== null) {
      onGenerateDrumPattern(aiPrompt, editingAiForChordIndex);
    }
  };
  
  const isGeneratingDrums = generationState.isLoading && generationState.type === 'drums';
  const canPerformAiAction = isApiKeySet;

  return (
    <>
      {editingAiForChordIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={() => setEditingAiForChordIndex(null)}>
          <div className="bg-gray-800 rounded-lg shadow-2xl p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h4 className="text-lg font-bold text-red-400 mb-2">AI 鼓組生成</h4>
            <p className="text-sm text-gray-400 mb-4">為 <span className="font-bold text-white">{chordProgression.find(c => c.originalIndex === editingAiForChordIndex)?.root}{chordProgression.find(c => c.originalIndex === editingAiForChordIndex)?.type}</span> 和弦描述您想要的鼓點。</p>
            <textarea
              rows={3}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:ring-red-500 focus:border-red-500 transition-colors placeholder-gray-500"
              placeholder="例如：a simple rock beat, a fast complex breakbeat, a sparse hip-hop groove..."
              aria-label="Drum pattern prompt"
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button onClick={() => {setEditingAiForChordIndex(null); setAiPrompt('');}} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-md transition-colors">取消</button>
              <button onClick={handleGenerateClick} disabled={!aiPrompt.trim()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">生成</button>
            </div>
          </div>
        </div>
      )}

      <div className="p-3 my-2 bg-gray-550 rounded-md space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700">
        <h4 className="text-sm font-semibold text-gray-200 mb-1">自訂鼓組編輯器 (Custom Drum Editor)</h4>
        {chordProgression.map((chordItem, chordIdx) => {
          const currentChordDrumPattern = customDrumData[chordItem.originalIndex] || createDefaultCustomDrumChordPattern();
          const isCurrentlyGenerating = isGeneratingDrums && generationState.drumChordIndex === chordItem.originalIndex;

          return (
            <div key={chordItem.id} className="p-2.5 bg-gray-500 rounded shadow-sm space-y-1.5 relative">
              {isCurrentlyGenerating && (
                <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center rounded z-20">
                    <span className="text-red-400 animate-pulse">AI 生成中...</span>
                </div>
              )}
              <div className="flex justify-between items-center mb-1">
                <h5 className="text-xs font-mono text-gray-200">
                  <span className="font-semibold">{chordIdx + 1}. {chordItem.root}{chordItem.type}</span>
                </h5>
                <button
                  onClick={() => { setAiPrompt(''); setEditingAiForChordIndex(chordItem.originalIndex); }}
                  disabled={!canPerformAiAction || isGeneratingDrums}
                  className="px-2 py-0.5 text-xs bg-red-600 hover:bg-red-700 rounded text-white transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                  title={!isApiKeySet ? "請先設定 API 金鑰" : "使用 AI 生成此鼓點"}
                >
                  AI
                </button>
              </div>
              
              {DRUM_INSTRUMENT_OPTIONS.map(drumOpt => {
                const instrumentPattern = currentChordDrumPattern[drumOpt.value] || 
                                          Array(NUM_BEATS_PER_DRUM_MEASURE).fill(null).map(() => Array(NUM_SUBDIVISIONS_PER_DRUM_BEAT).fill(false));
                
                return (
                  <div key={drumOpt.value} className="flex items-center space-x-1 sm:space-x-2">
                    <span className="w-[60px] sm:w-[70px] text-xs text-gray-300 truncate text-right pr-1" title={drumOpt.label}>
                      {drumOpt.label.split(' (')[0]}
                    </span>
                    <div className="flex-grow grid grid-cols-4 gap-x-0">
                      {[0, 1, 2, 3].map(beatIndex => (
                        <div 
                          key={beatIndex} 
                          className={`
                            flex flex-col items-center py-1 
                            px-1 sm:px-2
                            ${beatIndex < NUM_BEATS_PER_DRUM_MEASURE - 1 ? 'border-r border-gray-400' : ''}
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
    </>
  );
};

export default CustomDrumEditor;