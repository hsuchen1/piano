import React from 'react';
import { PianoKeyData, NoteName } from '../types';

interface PianoKeyProps {
  keyData: PianoKeyData;
  onNoteAttack: (noteName: NoteName, octave: number) => void;
  onNoteRelease: (noteName: NoteName, octave: number) => void;
  isComputerKeyPressed?: boolean;
  isAccompanimentActive?: boolean;
  /**
   * Horizontal placement for black keys, supplied by the keyboard as a percentage
   * so it tracks the container width.
   *
   * The key used to size itself (`w-10`) and rely on a negative margin to overlap
   * its neighbour, which only worked at one fixed width and forced the whole
   * keyboard to scroll horizontally. Width is now the parent's responsibility.
   */
  positionStyle?: React.CSSProperties;
}

const PianoKey: React.FC<PianoKeyProps> = ({ keyData, onNoteAttack, onNoteRelease, isComputerKeyPressed, isAccompanimentActive, positionStyle }) => {
  const { note, octave, isBlack, displayName } = keyData;
  const [isMouseActive, setIsMouseActive] = React.useState(false);

  const isEffectivelyPressed = isComputerKeyPressed || isMouseActive;

  // Use a slightly faster duration for a snappier press/release animation.
  const baseStyles = "border border-gray-700 flex flex-col items-center justify-end select-none cursor-pointer transition-all duration-75 ease-out relative group";
  
  // White keys share the row width via flex-1, so they always fill the container
  // instead of forcing a fixed 1120px scroll area. Height steps down on small
  // screens, where 192px swallowed nearly a third of the viewport.
  const whiteKeyStyles = `bg-white text-black flex-1 min-w-0 h-32 sm:h-40 lg:h-48 hover:bg-gray-200 shadow-sm rounded-b`;
  // When pressed, translate down and add an inner shadow for a "pushed in" feel.
  const pressedWhiteKeyStyles = "bg-gray-300 shadow-inner transform translate-y-px";
  const accompanimentWhiteKeyStyles = "bg-blue-200";

  // Black keys are positioned by the parent as a percentage, and sized as a share
  // of a white key rather than a fixed pixel width.
  const blackKeyStyles = `bg-gray-900 text-white w-[7%] max-w-[26px] h-20 sm:h-24 lg:h-32 hover:bg-gray-800 absolute top-0 z-10 shadow-md rounded-b border-x border-b-2 border-black -translate-x-1/2`;
  // When pressed, translate down, become darker, and reduce bottom border to simulate sinking.
  const pressedBlackKeyStyles = "bg-black border-b-2 border-black transform translate-y-px";
  const accompanimentBlackKeyStyles = "bg-blue-800";

  let keySpecificStyles;
  if (isBlack) {
    keySpecificStyles = blackKeyStyles;
    // User press feedback takes priority over accompaniment highlight.
    if (isEffectivelyPressed) {
      keySpecificStyles += ` ${pressedBlackKeyStyles}`;
    } else if (isAccompanimentActive) {
      keySpecificStyles += ` ${accompanimentBlackKeyStyles}`;
    }
  } else {
    keySpecificStyles = whiteKeyStyles;
    // User press feedback takes priority over accompaniment highlight.
    if (isEffectivelyPressed) {
      keySpecificStyles += ` ${pressedWhiteKeyStyles}`;
    } else if (isAccompanimentActive) {
      keySpecificStyles += ` ${accompanimentWhiteKeyStyles}`;
    }
  }
  
  const styles = `${baseStyles} ${keySpecificStyles}`;

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
      style={positionStyle}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave} 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd} // Handle touch cancel as well
      aria-label={`${displayName}${octave}`}
      aria-pressed={isEffectivelyPressed}
    >
      {/* Note names are hidden on the narrowest keys, where they no longer fit and
          only made the keys look cluttered. The accessible name still carries them. */}
      <span className={`hidden sm:block text-xs font-semibold pointer-events-none text-center leading-tight mb-1 ${isBlack ? 'text-gray-300 group-hover:text-white' : 'text-gray-600 group-hover:text-black'}`}>
        {displayName}
        <span className="hidden lg:block text-gray-500 text-xs">{octave}</span>
      </span>
    </button>
  );
};

export default PianoKey;