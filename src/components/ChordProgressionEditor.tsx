import React, { useRef, useState } from 'react';
import { ChordDefinition } from '../types';
import { CHORD_INTERVALS } from '../constants';

interface ChordProgressionEditorProps {
  progression: ChordDefinition[];
  onRemoveChord: (id: string) => void;
  onClearProgression: () => void;
  onSaveProgression: () => void;
  onReorderProgression: (sourceIndex: number, destinationIndex: number) => void;
  onUpdateChordInversion: (id: string, inversion: number) => void;
  currentlyPlayingChordIndex: number | null;
  onStyleTransfer: (prompt: string) => void;
  isGeneratingStyle: boolean;
  isApiKeySet: boolean;
  onSmartVoicing: () => void;
  isGeneratingVoicing: boolean;
}

// --- Memoized InversionControl Component ---
interface InversionControlProps {
  chord: ChordDefinition;
  onUpdate: (id: string, inversion: number) => void;
}

/**
 * Card header actions. All four were `px-3 py-1`, roughly 22px tall, below the
 * 24px WCAG 2.5.8 minimum; `min-h-touch` lifts them to 28px.
 *
 * Both AI actions now use the shared AI accent. Previously smart voicing was teal
 * and style transfer purple, while teal also meant "effects" and purple also meant
 * "tempo" elsewhere, so colour carried no reliable meaning.
 */
const HEADER_ACTION_BUTTON =
  'px-3 min-h-touch inline-flex items-center text-xs rounded text-white transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-1 ' +
  'disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed';

const InversionControl: React.FC<InversionControlProps> = React.memo(({ chord, onUpdate }) => {
  const numNotes = CHORD_INTERVALS[chord.type]?.length || 3;
  // Cap displayed inversions at a reasonable number (0-4), covering up to 9th chords
  const maxDisplayableInversions = Math.min(numNotes - 1, 4);

  return (
    <div className="flex items-center space-x-1">
      <span className="text-xs text-gray-400 mr-1">轉位:</span>
      {Array.from({ length: maxDisplayableInversions + 1 }, (_, i) => i).map(invValue => {
        return (
          <button
            key={invValue}
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(chord.id, invValue);
            }}
            className={`
              w-7 h-7 text-xs font-mono rounded transition-colors
              flex items-center justify-center
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-chord
              ${chord.inversion === invValue ? 'bg-accent-chord text-white' : 'bg-surface-2 hover:bg-gray-600 text-gray-200'}
            `}
            aria-label={`設定為第 ${invValue} 轉位`}
            aria-pressed={chord.inversion === invValue}
          >
            {invValue}
          </button>
        );
      })}
    </div>
  );
});
InversionControl.displayName = 'InversionControl';


const ChordProgressionEditor: React.FC<ChordProgressionEditorProps> = ({
  progression,
  onRemoveChord,
  onClearProgression,
  onSaveProgression,
  onReorderProgression,
  onUpdateChordInversion,
  currentlyPlayingChordIndex,
  onStyleTransfer,
  isGeneratingStyle,
  isApiKeySet,
  onSmartVoicing,
  isGeneratingVoicing,
}) => {
  const draggedItemIndex = useRef<number | null>(null);
  const draggedOverItemIndex = useRef<number | null>(null);
  const [dragIndicatorIndex, setDragIndicatorIndex] = useState<number | null>(null);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [stylePrompt, setStylePrompt] = useState('');

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    draggedItemIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString()); // Required for Firefox
    e.currentTarget.classList.add('opacity-50', 'bg-blue-500'); 
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLLIElement>) => {
    e.currentTarget.classList.remove('opacity-50', 'bg-blue-500');
    setDragIndicatorIndex(null);
    draggedItemIndex.current = null;
    draggedOverItemIndex.current = null;
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.preventDefault(); 
    if (draggedItemIndex.current === null || draggedItemIndex.current === index) {
      setDragIndicatorIndex(null);
      return;
    }
    draggedOverItemIndex.current = index;
    const targetRect = e.currentTarget.getBoundingClientRect();
    const isDraggingOverUpperHalf = e.clientY < targetRect.top + targetRect.height / 2;
    setDragIndicatorIndex(isDraggingOverUpperHalf ? index : index + 1);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    if (draggedItemIndex.current === null) return;

    const sourceIndex = draggedItemIndex.current;
    let destinationIndex = draggedOverItemIndex.current;

    if (dragIndicatorIndex !== null) {
      destinationIndex = dragIndicatorIndex > sourceIndex ? dragIndicatorIndex - 1 : dragIndicatorIndex;
    }

    if (destinationIndex !== null && sourceIndex !== destinationIndex) {
      onReorderProgression(sourceIndex, destinationIndex);
    }
    
    draggedItemIndex.current = null;
    draggedOverItemIndex.current = null;
    setDragIndicatorIndex(null);
    e.currentTarget.classList.remove('opacity-50', 'bg-blue-500');
  };
  
  const renderDragIndicator = (index: number) => {
    if (dragIndicatorIndex === index) {
      return <div className="h-1 bg-blue-400 my-0.5 rounded-full" />;
    }
    return null;
  };

  const handleStyleSubmit = () => {
    if (stylePrompt.trim()) {
      onStyleTransfer(stylePrompt.trim());
      setIsStyleModalOpen(false);
    }
  };

  const canPerformAiAction = isApiKeySet && progression.length > 0;

  return (
    <div className="p-4 bg-surface-1 border border-surface-line rounded-lg shadow-md h-full flex flex-col">
      {isStyleModalOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={() => setIsStyleModalOpen(false)}>
          <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h4 className="text-xl font-bold text-purple-300 mb-3">AI 風格轉換</h4>
            <p className="text-sm text-gray-400 mb-4">輸入您想要的音樂風格，AI 將會重新詮釋您目前的和弦進行。</p>
            <textarea
              rows={3}
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.target.value)}
              className="w-full p-2.5 bg-surface-2 border border-surface-line rounded-md text-gray-100 focus:ring-purple-500 focus:border-purple-500 transition-colors placeholder-gray-500"
              placeholder="例如：smooth jazz trio, epic cinematic score, 8-bit video game music..."
              aria-label="Style prompt"
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button onClick={() => setIsStyleModalOpen(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-md transition-colors">取消</button>
              <button onClick={handleStyleSubmit} disabled={!stylePrompt.trim()} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">轉換</button>
            </div>
          </div>
        </div>
      )}
      {/* Wraps on narrow screens instead of squeezing four buttons onto one line. */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
        <h3 className="text-lg font-semibold text-gray-100">和弦進行</h3>
        <div className="flex flex-wrap items-center gap-2">
          {progression.length > 1 && (
            <button
              type="button"
              onClick={onSmartVoicing}
              disabled={!canPerformAiAction || isGeneratingVoicing || isGeneratingStyle}
              className={`${HEADER_ACTION_BUTTON} bg-accent-ai hover:bg-purple-700 focus-visible:ring-accent-ai`}
              title={!isApiKeySet ? "請先設定 API 金鑰" : "使用 AI 最佳化和弦轉位"}
            >
             🧠 AI 智慧轉位
            </button>
          )}
          {progression.length > 0 && (
             <button
              type="button"
              onClick={() => setIsStyleModalOpen(true)}
              disabled={!canPerformAiAction || isGeneratingStyle || isGeneratingVoicing}
              className={`${HEADER_ACTION_BUTTON} bg-accent-ai hover:bg-purple-700 focus-visible:ring-accent-ai`}
              title={!isApiKeySet ? "請先設定 API 金鑰" : "使用 AI 轉換風格"}
            >
              ✨ AI 風格轉換
            </button>
          )}
          {progression.length > 0 && (
            <button
              type="button"
              onClick={onSaveProgression}
              className={`${HEADER_ACTION_BUTTON} bg-accent-chord hover:bg-blue-700 focus-visible:ring-accent-chord`}
              title="儲存目前和弦進行"
            >
              儲存
            </button>
          )}
          {progression.length > 0 && (
            <button
              type="button"
              onClick={onClearProgression}
              className={`${HEADER_ACTION_BUTTON} bg-red-700 hover:bg-red-800 focus-visible:ring-red-400`}
              title="清除所有和弦"
            >
              全部清除
            </button>
          )}
        </div>
      </div>
      {(isGeneratingStyle || isGeneratingVoicing) && (
        <div className="text-center p-4 text-purple-300">
          {isGeneratingVoicing ? 'AI 轉位中...' : '風格轉換中...'}
        </div>
      )}
      {progression.length === 0 ? (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-gray-400 text-center">尚未加入任何和弦。<br />請使用選擇器或 AI 新增和弦以建立伴奏。</p>
        </div>
      ) : (
        <ul 
            className="space-y-0.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin"
            onDragLeave={() => setDragIndicatorIndex(null)}
        >
          {progression.map((chord, index) => (
            <React.Fragment key={chord.id}>
              {renderDragIndicator(index)}
              <li
                draggable="true"
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e)}
                className={`flex justify-between items-center p-2 rounded-md shadow transition-colors duration-300 cursor-grab active:cursor-grabbing
                  ${index === currentlyPlayingChordIndex ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
              >
                <div className="flex flex-col items-start">
                    <span className="font-mono text-sm text-gray-200">
                      <span className="text-gray-400">{index + 1}.</span> {chord.root}{chord.type}
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <InversionControl chord={chord} onUpdate={onUpdateChordInversion} />
                    <button
                      onClick={() => onRemoveChord(chord.id)}
                      className="p-1.5 text-xs bg-red-500 hover:bg-red-600 rounded text-white transition-colors focus:outline-none focus:ring-1 focus:ring-red-400"
                      aria-label={`移除和弦 ${chord.root}${chord.type}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                </div>
              </li>
            </React.Fragment>
          ))}
          {renderDragIndicator(progression.length)} 
        </ul>
      )}
    </div>
  );
};

export default ChordProgressionEditor;