
import React, {useState} from 'react';
import type { ChordWithIndex } from '../types';
import { DrumInstrument, CustomDrumProgressionData, CustomDrumChordPattern, GenerationState } from '../types';
import { DRUM_INSTRUMENT_OPTIONS, NUM_BEATS_PER_DRUM_MEASURE, NUM_SUBDIVISIONS_PER_DRUM_BEAT, createDefaultCustomDrumChordPattern } from '../constants';
import AiPromptDialog from '../ui/AiPromptDialog';

/**
 * Shared by the pinned instrument label and the spacer above it in the beat-number
 * header, so the two stay in step. Wide enough for the longest shortened
 * instrument name without truncating on a phone.
 */
const LANE_LABEL_WIDTH = 'w-[64px] sm:w-[76px]';

/** Small action buttons in the per-chord header, sized to the 28px touch floor. */
const CHORD_ACTION_BUTTON =
  'px-2.5 min-h-touch inline-flex items-center text-xs rounded text-white transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-1 ' +
  'disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed';

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
  drumPatternClipboard: { pattern: CustomDrumChordPattern, sourceIndex: number } | null;
  onCopy: (chordOriginalIndex: number) => void;
  onPaste: (chordOriginalIndex: number) => void;
  generationState: GenerationState;
  isApiKeySet: boolean;
}

const CustomDrumEditor: React.FC<CustomDrumEditorProps> = ({
  chordProgression,
  customDrumData,
  onUpdateCell,
  onGenerateDrumPattern,
  drumPatternClipboard,
  onCopy,
  onPaste,
  generationState,
  isApiKeySet,
}) => {
  const [editingAiForChordIndex, setEditingAiForChordIndex] = useState<number | null>(null);

  if (!chordProgression || chordProgression.length === 0) {
    return (
      <div className="p-3 my-2 text-sm text-center text-gray-400 bg-surface-2 border border-surface-line rounded-md">
        請先在「和弦進行」中加入和弦以編輯自訂鼓組。
      </div>
    );
  }

  // Named chord being edited, resolved once instead of searching the progression
  // twice inside the dialog's own markup as before.
  const editingChord = chordProgression.find(c => c.originalIndex === editingAiForChordIndex);
  const editingChordLabel = editingChord ? `${editingChord.root}${editingChord.type}` : '';

  const isGeneratingDrums = generationState.isLoading && generationState.type === 'drums';
  const canPerformAiAction = isApiKeySet;

  return (
    <>
      {editingAiForChordIndex !== null && (
        <AiPromptDialog
          title="AI 鼓組生成"
          description={`為 ${editingChordLabel} 和弦描述您想要的鼓點。`}
          placeholder="例如：a simple rock beat, a fast complex breakbeat, a sparse hip-hop groove..."
          onSubmit={prompt => {
            onGenerateDrumPattern(prompt, editingAiForChordIndex);
            setEditingAiForChordIndex(null);
          }}
          onCancel={() => setEditingAiForChordIndex(null)}
        />
      )}

      <div className="p-3 my-2 bg-surface-1 border border-surface-line rounded-md space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
        <h4 className="text-sm font-semibold text-gray-200 mb-1">自訂鼓組編輯器 (Custom Drum Editor)</h4>
        {chordProgression.map((chordItem, chordIdx) => {
          const currentChordDrumPattern = customDrumData[chordItem.originalIndex] || createDefaultCustomDrumChordPattern();
          const isCurrentlyGenerating = isGeneratingDrums && generationState.drumChordIndex === chordItem.originalIndex;
          const isCopied = drumPatternClipboard?.sourceIndex === chordItem.originalIndex;
          const canPaste = drumPatternClipboard !== null && !isCopied;

          return (
            <div key={chordItem.id} className="p-2.5 bg-surface-1 border border-surface-line rounded shadow-sm space-y-1.5 relative">
              {isCurrentlyGenerating && (
                <div className="absolute inset-0 bg-surface-0 bg-opacity-80 flex items-center justify-center rounded z-20">
                    <span className="text-accent-drums animate-pulse">AI 生成中...</span>
                </div>
              )}
              <div className="flex justify-between items-center gap-2 mb-1">
                <h5 className="text-xs font-mono text-gray-200 truncate">
                  <span className="font-semibold">{chordIdx + 1}. {chordItem.root}{chordItem.type}</span>
                </h5>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onCopy(chordItem.originalIndex)}
                    className={`${CHORD_ACTION_BUTTON} ${isCopied ? 'bg-accent-chord hover:bg-blue-700 focus-visible:ring-accent-chord' : 'bg-gray-600 hover:bg-gray-500 focus-visible:ring-gray-400'}`}
                    title={isCopied ? "取消複製" : "複製此鼓點"}
                  >
                    {isCopied ? '已複製' : '複製'}
                  </button>
                  {canPaste && (
                     <button
                      type="button"
                      onClick={() => onPaste(chordItem.originalIndex)}
                      className={`${CHORD_ACTION_BUTTON} bg-green-600 hover:bg-green-700 focus-visible:ring-green-400`}
                      title="貼上已複製的鼓點"
                    >
                      貼上
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingAiForChordIndex(chordItem.originalIndex)}
                    disabled={!canPerformAiAction || isGeneratingDrums}
                    className={`${CHORD_ACTION_BUTTON} bg-accent-drums hover:bg-red-700 focus-visible:ring-accent-drums`}
                    title={!isApiKeySet ? "請先設定 API 金鑰" : "使用 AI 生成此鼓點"}
                  >
                    AI
                  </button>
                </div>
              </div>
              
              {/*
                One horizontal scroller wraps every lane so the columns stay
                aligned; if each row scrolled on its own they would drift apart.
                The instrument name is pinned left so you can still tell which lane
                you are editing after scrolling.

                Cells are 24px, 28px from sm up, to meet the WCAG 2.5.8 minimum.
                Sixteen 24px cells cannot fit a 375px screen, so the horizontal
                scroll is a deliberate trade: a step sequencer is useless if you
                cannot reliably hit the step you aimed at.
              */}
              <div className="overflow-x-auto pb-1 scrollbar-thin [--sb-track:theme(colors.surface.2)]">
                <div className="min-w-max space-y-1">
                  {/* Beat numbers once for the whole grid instead of repeated inside
                      each of the five instrument lanes. */}
                  <div className="flex items-end gap-1 sm:gap-2" aria-hidden="true">
                    <span className={`${LANE_LABEL_WIDTH} shrink-0`} />
                    <div className="flex">
                      {[0, 1, 2, 3].map(beatIndex => (
                        <div
                          key={beatIndex}
                          className={`px-1 sm:px-1.5 flex flex-col justify-end ${beatIndex < NUM_BEATS_PER_DRUM_MEASURE - 1 ? 'border-r border-surface-line' : ''}`}
                        >
                          <span className="block text-xs text-gray-400 leading-none text-center mb-1">
                            {beatIndex + 1}
                          </span>
                          {/* Invisible placeholder matching the exact width of the drum pads below to ensure alignment */}
                          <div className="flex gap-px p-px invisible h-0">
                            {[0, 1, 2, 3].map(subdivisionIndex => (
                              <div key={subdivisionIndex} className="w-6 sm:w-7" />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {DRUM_INSTRUMENT_OPTIONS.map(drumOpt => {
                    const instrumentPattern = currentChordDrumPattern[drumOpt.value] ||
                                              Array(NUM_BEATS_PER_DRUM_MEASURE).fill(null).map(() => Array(NUM_SUBDIVISIONS_PER_DRUM_BEAT).fill(false));

                    return (
                      <div key={drumOpt.value} className="flex items-center gap-1 sm:gap-2">
                        <span
                          className={`sticky left-0 z-10 ${LANE_LABEL_WIDTH} shrink-0 bg-surface-1 text-xs text-gray-300 truncate text-right pr-1`}
                          title={drumOpt.label}
                        >
                          {drumOpt.label.split(' (')[0]}
                        </span>
                        <div className="flex">
                          {[0, 1, 2, 3].map(beatIndex => (
                            <div
                              key={beatIndex}
                              className={`px-1 sm:px-1.5 ${beatIndex < NUM_BEATS_PER_DRUM_MEASURE - 1 ? 'border-r border-surface-line' : ''}`}
                            >
                              <div className="flex gap-px bg-surface-2 p-px rounded-sm shadow-inner">
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
                                        w-6 h-6 sm:w-7 sm:h-7 rounded-[2px] transition-colors duration-100
                                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ai focus-visible:z-10
                                        ${isActive ? 'bg-accent-drums hover:bg-red-400 shadow-sm' : 'bg-slate-500 hover:bg-slate-400'}
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
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default CustomDrumEditor;