
import React from 'react';
import { ChordDefinition } from '../types';

interface SavedProgressionsProps {
  savedProgressions: Record<string, ChordDefinition[]>;
  onLoadProgression: (name: string) => void;
  onDeleteProgression: (name: string) => void;
}

const SavedProgressions: React.FC<SavedProgressionsProps> = ({ savedProgressions, onLoadProgression, onDeleteProgression }) => {
  const progressionNames = Object.keys(savedProgressions);

  return (
    <div className="p-4 bg-gray-700 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-100 mb-3">已儲存的和弦進行</h3>
      {progressionNames.length === 0 ? (
        <p className="text-gray-400 text-sm">沒有已儲存的和弦進行。</p>
      ) : (
        <ul className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-600 pr-1">
          {progressionNames.map(name => (
            <li key={name} className="flex justify-between items-center p-2.5 bg-gray-600 rounded-md hover:bg-gray-500 transition-colors">
              <span className="text-sm text-gray-200 truncate mr-2" title={name}>{name}</span>
              <div className="space-x-2 flex-shrink-0">
                <button
                  onClick={() => onLoadProgression(name)}
                  className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                  aria-label={`載入和弦進行 ${name}`}
                >
                  載入
                </button>
                <button
                  onClick={() => onDeleteProgression(name)}
                  className="p-1.5 text-xs bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
                  aria-label={`刪除和弦進行 ${name}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SavedProgressions;
