
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
}

const ChordProgressionEditor: React.FC<ChordProgressionEditorProps> = ({
  progression,
  onRemoveChord,
  onClearProgression,
  onSaveProgression,
  onReorderProgression,
  onUpdateChordInversion,
  currentlyPlayingChordIndex
}) => {
  const draggedItemIndex = useRef<number | null>(null);
  const draggedOverItemIndex = useRef<number | null>(null);
  const [dragIndicatorIndex, setDragIndicatorIndex] = useState<number | null>(null);


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

  const InversionControl = ({ chord }: { chord: ChordDefinition }) => {
    const numNotes = CHORD_INTERVALS[chord.type]?.length || 3;
    const maxInversions = numNotes - 1; // 3 notes -> 2 inversions, 4 notes -> 3 inversions

    return (
      <div className="flex items-center space-x-1">
        <span className="text-xs text-gray-400 mr-1">轉位:</span>
        {[0, 1, 2].map(invValue => {
          const isDisabled = invValue > maxInversions;
          return (
            <button
              key={invValue}
              disabled={isDisabled}
              onClick={(e) => {
                e.stopPropagation();
                onUpdateChordInversion(chord.id, invValue);
              }}
              className={`
                w-5 h-5 text-xs font-mono rounded-sm transition-colors
                flex items-center justify-center
                ${chord.inversion === invValue ? 'bg-blue-500 text-white' : 'bg-gray-500 hover:bg-gray-400 text-gray-200'}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              aria-label={`設定為第 ${invValue} 轉位`}
            >
              {invValue}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 bg-gray-700 rounded-lg shadow-md h-full flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-100">和弦進行</h3>
        <div className="space-x-2">
          {progression.length > 0 && (
            <button onClick={onSaveProgression} className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors" title="儲存目前和弦進行">儲存</button>
          )}
          {progression.length > 0 && (
            <button onClick={onClearProgression} className="px-3 py-1 text-xs bg-red-700 hover:bg-red-800 rounded text-white transition-colors" title="清除所有和弦">全部清除</button>
          )}
        </div>
      </div>
      {progression.length === 0 ? (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-gray-400 text-center">尚未加入任何和弦。<br />請使用選擇器新增和弦以建立伴奏。</p>
        </div>
      ) : (
        <ul 
            className="space-y-0.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-600"
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
                    <InversionControl chord={chord} />
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
