import React from 'react';
import { ALL_PIANO_KEYS } from '../constants';
import { NoteName, PianoKeyData } from '../types';
import PianoKey from './PianoKey';

interface PianoKeyboardProps {
  onNoteAttack: (noteName: NoteName, octave: number) => void;
  onNoteRelease: (noteName: NoteName, octave: number) => void;
  pressedKeys: Set<string>; // Set of fullNoteNames (e.g., "C#4") pressed by computer
}

const PianoKeyboard: React.FC<PianoKeyboardProps> = ({ onNoteAttack, onNoteRelease, pressedKeys }) => {
  const whiteKeyCount = ALL_PIANO_KEYS.filter(k => !k.isBlack).length;
  const approxWhiteKeyWidthPx = 40;
  const estimatedMinWidth = whiteKeyCount * approxWhiteKeyWidthPx;

  return (
    <div className="w-full bg-gradient-to-b from-gray-700 to-gray-800 rounded-lg shadow-xl my-4 p-2 sm:p-4 select-none">
      <div 
        className="flex items-start relative overflow-x-auto overflow-y-hidden pb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
        style={{ minWidth: '100%', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex items-start relative" style={{minWidth: `${estimatedMinWidth}px`}}>
          {ALL_PIANO_KEYS.map((keyData: PianoKeyData) => (
            <PianoKey
              key={keyData.fullName}
              keyData={keyData}
              onNoteAttack={onNoteAttack}
              onNoteRelease={onNoteRelease}
              isComputerKeyPressed={pressedKeys.has(keyData.fullName)}
            />
          ))}
        </div>
      </div>
       <p className="text-xs text-gray-400 mt-2 text-center">提示：您可以使用電腦鍵盤彈奏 (Z,S,X,D,C... 或 Q,2,W,3,E...)</p>
    </div>
  );
};

export default PianoKeyboard;
