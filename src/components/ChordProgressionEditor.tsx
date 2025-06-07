
import React, { useRef, useState } from 'react';
import { ChordDefinition } from '../types';

interface ChordProgressionEditorProps {
  progression: ChordDefinition[];
  onRemoveChord: (id: string) => void;
  onClearProgression: () => void;
  onSaveProgression: () => void;
  onReorderProgression: (sourceIndex: number, destinationIndex: number) => void;
}

const ChordProgressionEditor: React.FC<ChordProgressionEditorProps> = ({
  progression,
  onRemoveChord,
  onClearProgression,
  onSaveProgression,
  onReorderProgression
}) => {
  const draggedItemIndex = useRef<number | null>(null);
  const draggedOverItemIndex = useRef<number | null>(null);
  const [dragIndicatorIndex, setDragIndicatorIndex] = useState<number | null>(null);


  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    draggedItemIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString()); // Required for Firefox
    // Optional: Add a class to the dragged item for visual feedback
    e.currentTarget.classList.add('opacity-50', 'bg-blue-500'); 
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLLIElement>) => {
    e.currentTarget.classList.remove('opacity-50', 'bg-blue-500');
    setDragIndicatorIndex(null); // Clear indicator line
    draggedItemIndex.current = null;
    draggedOverItemIndex.current = null;
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.preventDefault(); // Necessary to allow dropping
    if (draggedItemIndex.current === null || draggedItemIndex.current === index) {
      setDragIndicatorIndex(null);
      return;
    }
    draggedOverItemIndex.current = index;
    
    // Determine if indicator should be above or below the target item
    const targetRect = e.currentTarget.getBoundingClientRect();
    const isDraggingOverUpperHalf = e.clientY < targetRect.top + targetRect.height / 2;
    
    if (isDraggingOverUpperHalf) {
      setDragIndicatorIndex(index); // Indicator above target
    } else {
      setDragIndicatorIndex(index + 1); // Indicator below target
    }
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLLIElement>) => {
    // If the mouse leaves an item but hasn't entered another valid drop target within the list,
    // we might want to clear the indicator. This can be tricky.
    // For simplicity, we'll let onDrop or onDragEnd handle final clearing.
    // If we clear it here, it might flicker too much.
  };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedItemIndex.current === null) return;

    const sourceIndex = draggedItemIndex.current;
    let destinationIndex = dropIndex;
    
    // Adjust destinationIndex based on where the drop indicator was
    if (dragIndicatorIndex !== null) {
      // If indicator was at index `i`, it means drop *before* item `i`.
      // If indicator was at `progression.length`, it means drop at the end.
       destinationIndex = dragIndicatorIndex;
        if (sourceIndex < destinationIndex) {
            destinationIndex--; // Adjust if moving an item downwards past its original position
        }
    } else {
      // Fallback if no indicator (e.g., dropped directly on item without precise half detection)
      // This part might need refinement if dragIndicatorIndex isn't always set reliably
      const targetRect = e.currentTarget.getBoundingClientRect();
      const isDroppedOnUpperHalf = e.clientY < targetRect.top + targetRect.height / 2;
      if (!isDroppedOnUpperHalf && sourceIndex < dropIndex) {
        destinationIndex = dropIndex;
      } else if (isDroppedOnUpperHalf && sourceIndex > dropIndex){
        destinationIndex = dropIndex;
      } else if (!isDroppedOnUpperHalf && sourceIndex > dropIndex) {
        destinationIndex = dropIndex + 1;
         if (sourceIndex < destinationIndex) {
            destinationIndex--; 
        }
      }
    }


    if (sourceIndex !== destinationIndex && destinationIndex >= 0 && destinationIndex <= progression.length) {
       // Correct destination index if item is dragged downwards
        let finalDestinationIndex = destinationIndex;
        if (sourceIndex < destinationIndex && dragIndicatorIndex !== null && dragIndicatorIndex > sourceIndex) {
            // This adjustment logic can be tricky. Let App.tsx handle the reordering.
            // Just pass source and the determined logical destination.
        }
      onReorderProgression(sourceIndex, destinationIndex);
    }
    
    draggedItemIndex.current = null;
    draggedOverItemIndex.current = null;
    setDragIndicatorIndex(null);
    e.currentTarget.classList.remove('opacity-50', 'bg-blue-500'); // Clean up style from dragStart
  };
  
  const renderDragIndicator = (index: number) => {
    if (dragIndicatorIndex === index) {
      return <div className="h-1 bg-blue-400 my-0.5 rounded-full" />;
    }
    return null;
  };

  return (
    <div className="p-4 bg-gray-700 rounded-lg shadow-md h-full flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-100">和弦進行</h3>
        <div className="space-x-2">
          {progression.length > 0 && (
            <button
              onClick={onSaveProgression}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
              title="儲存目前和弦進行"
            >
              儲存
            </button>
          )}
          {progression.length > 0 && (
            <button
              onClick={onClearProgression}
              className="px-3 py-1 text-xs bg-red-700 hover:bg-red-800 rounded text-white transition-colors"
              title="清除所有和弦"
            >
              全部清除
            </button>
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
            onDragLeave={() => setDragIndicatorIndex(null)} // Clear indicator if mouse leaves the list area
        >
          {progression.map((chord, index) => (
            <React.Fragment key={chord.id}>
              {renderDragIndicator(index)}
              <li
                draggable="true"
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragLeave={handleDragLeave}
                className="flex justify-between items-center p-2.5 bg-gray-600 rounded-md shadow hover:bg-gray-500 transition-colors cursor-grab active:cursor-grabbing"
              >
                <span className="font-mono text-sm text-gray-200">
                  <span className="text-gray-400">{index + 1}.</span> {chord.root}{chord.type}
                </span>
                <button
                  onClick={() => onRemoveChord(chord.id)}
                  className="p-1.5 text-xs bg-red-500 hover:bg-red-600 rounded text-white transition-colors focus:outline-none focus:ring-1 focus:ring-red-400"
                  aria-label={`移除和弦 ${chord.root}${chord.type}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
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

