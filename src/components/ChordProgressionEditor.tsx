
import React from 'react';
import { ChordDefinition } from '../types';

interface ChordProgressionEditorProps {
  progression: ChordDefinition[];
  onRemoveChord: (id: string) => void;
  onClearProgression: () => void;
  onSaveProgression: () => void; // New prop
}

const ChordProgressionEditor: React.FC<ChordProgressionEditorProps> = ({ progression, onRemoveChord, onClearProgression, onSaveProgression }) => {
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
        <ul className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-600">
          {progression.map((chord, index) => (
            <li key={chord.id} className="flex justify-between items-center p-2.5 bg-gray-600 rounded-md shadow hover:bg-gray-500 transition-colors">
              <span className="font-mono text-sm text-gray-200"><span className="text-gray-400">{index + 1}.</span> {chord.root}{chord.type}</span>
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
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChordProgressionEditor;
