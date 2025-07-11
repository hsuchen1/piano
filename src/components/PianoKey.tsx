import React from 'react';
import { PianoKeyData, NoteName } from '../types';

interface PianoKeyProps {
  keyData: PianoKeyData;
  onNoteAttack: (noteName: NoteName, octave: number) => void;
  onNoteRelease: (noteName: NoteName, octave: number) => void;
  isComputerKeyPressed?: boolean;
  isAccompanimentActive?: boolean;
}

const PianoKey: React.FC<PianoKeyProps> = ({ keyData, onNoteAttack, onNoteRelease, isComputerKeyPressed, isAccompanimentActive }) => {
  const { note, octave, isBlack, displayName } = keyData;
  const [isMouseActive, setIsMouseActive] = React.useState(false);

  const isEffectivelyPressed = isComputerKeyPressed || isMouseActive;

  // Use a longer duration for a smoother press/release animation
  const baseStyles = "border border-gray-700 flex flex-col items-center justify-end select-none cursor-pointer transition-all duration-100 ease-out relative group";
  
  // A "pressed in" effect for white keys using scale and inner shadow.
  // The `origin-bottom` and `scale-y` makes the key appear to sink from the top.
  const whiteKeyStyles = `bg-white text-black h-48 w-10 hover:bg-gray-200 shadow-sm`; 
  const pressedWhiteKeyStyles = "bg-gray-300 shadow-inner transform scale-y-[.98] origin-bottom";
  const accompanimentWhiteKeyStyles = "bg-blue-200";

  // A "pressed in" effect for black keys.
  const blackKeyStyles = `bg-gray-800 text-white h-32 w-6 hover:bg-gray-700 absolute z-10 shadow-md border-l-2 border-r-2 border-b-4 border-gray-900`; 
  const pressedBlackKeyStyles = "bg-black border-b-2 border-black shadow-sm transform scale-y-[.97] origin-bottom";
  const accompanimentBlackKeyStyles = "bg-blue-800";

  let keySpecificStyles;
  if (isBlack) {
    keySpecificStyles = blackKeyStyles;
    // User press feedback takes priority over accompaniment highlight
    if (isEffectivelyPressed) {
      keySpecificStyles += ` ${pressedBlackKeyStyles}`;
    } else if (isAccompanimentActive) {
      keySpecificStyles += ` ${accompanimentBlackKeyStyles}`;
    }
  } else {
    keySpecificStyles = whiteKeyStyles;
    // User press feedback takes priority over accompaniment highlight
    if (isEffectivelyPressed) {
      keySpecificStyles += ` ${pressedWhiteKeyStyles}`;
    } else if (isAccompanimentActive) {
      keySpecificStyles += ` ${accompanimentWhiteKeyStyles}`;
    }
  }
  
  const blackKeyMargin = "ml-[-0.75rem]";
  const styles = `${baseStyles} ${keySpecificStyles} ${isBlack ? blackKeyMargin : ''}`;

  const handleMouseDown = () => {
    onNoteAttack(note, octave);
    setIsMouseActive(true);
  };

  const handleMouseUpOrLeave = () => {
    if (isMouseActive) { // Only release if this key instance was responsible for attack
        onNoteRelease(note, octave);
        setIsMouseActive(false);
    }
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent mouse event emulation and scrolling
    onNoteAttack(note, octave);
    setIsMouseActive(true); // Use same state for visual feedback
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
     if (isMouseActive) {
        onNoteRelease(note, octave);
        setIsMouseActive(false);
    }
  };


  return (
    <button
      type="button"
      className={styles}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave} 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd} // Handle touch cancel as well
      aria-label={`${displayName}${octave}`}
      aria-pressed={isEffectivelyPressed}
    >
      <span className={`text-xs font-semibold pointer-events-none ${isBlack ? 'text-gray-300 group-hover:text-white mb-1' : 'text-gray-600 group-hover:text-black mb-1'}`}>
        {displayName}
        <span className="text-gray-500 text-[0.6rem] block">{octave}</span>
      </span>
    </button>
  );
};

export default PianoKey;