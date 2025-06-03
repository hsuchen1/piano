
import React from 'react';
import { ACTIVE_NOTE_NAMES } from '../constants'; // Use active note names for display

interface TranspositionControlProps {
  currentTransposition: number;
  onTransposeChange: (semitones: number) => void;
}

const TranspositionControl: React.FC<TranspositionControlProps> = ({ currentTransposition, onTransposeChange }) => {
  // Ensure "C" is part of ACTIVE_NOTE_NAMES or use a fixed index (0)
  const cIndex = ACTIVE_NOTE_NAMES.indexOf("C");
  const currentKeyIndex = ( (cIndex !== -1 ? cIndex : 0) + currentTransposition % 12 + 12) % 12; 
  const currentKeyName = ACTIVE_NOTE_NAMES[currentKeyIndex];

  const handleTranspose = (delta: number) => {
    onTransposeChange(currentTransposition + delta);
  };

  return (
    <div className="p-4 bg-gray-700 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-3 text-center text-gray-100">移調控制</h3>
      <div className="flex items-center justify-center space-x-3">
        <button
          onClick={() => handleTranspose(-1)}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="向下移調"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="text-2xl font-bold w-28 text-center tabular-nums bg-gray-600 px-3 py-1 rounded-md">
          {currentKeyName} 
          <span className="text-sm ml-1">({currentTransposition >=0 ? '+' : ''}{currentTransposition})</span>
        </div>
        <button
          onClick={() => handleTranspose(1)}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="向上移調"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-3 text-center">當彈奏琴鍵 'C' 時，實際發出的音高。</p>
    </div>
  );
};

export default TranspositionControl;
