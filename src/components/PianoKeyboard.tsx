import React, { useCallback, useMemo, useState } from 'react';
import { ALL_PIANO_KEYS, NUM_OCTAVES, START_OCTAVE } from '../constants';
import { NoteName } from '../types';
import PianoKey from './PianoKey';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { blackKeyOffsetPercent, buildKeyboardLayout } from '../utils/keyboardLayout';

interface PianoKeyboardProps {
  onNoteAttack: (noteName: NoteName, octave: number) => void;
  onNoteRelease: (noteName: NoteName, octave: number) => void;
  pressedKeys: Set<string>; // Set of fullNoteNames (e.g., "C#4") pressed by computer
  accompanimentActiveNotes: Set<string>; // Notes played by accompaniment
}

/**
 * How many octaves to render at each width.
 *
 * The keyboard used to render all four octaves at a fixed 40px per white key,
 * giving a 1120px-wide strip. On a 375px phone that meant a three-screen
 * horizontal scroll showing about nine white keys at a time, with the instrument
 * mostly off-screen. Showing fewer octaves and letting the visible ones fill the
 * width is far more usable than scrolling a full-size keyboard.
 */
const OCTAVES_AT_LG = NUM_OCTAVES; // everything fits comfortably
const OCTAVES_AT_SM = 3;
const OCTAVES_AT_BASE = 2;

const PianoKeyboard: React.FC<PianoKeyboardProps> = ({ onNoteAttack, onNoteRelease, pressedKeys, accompanimentActiveNotes }) => {
  const isLarge = useMediaQuery('(min-width: 1024px)');
  const isMedium = useMediaQuery('(min-width: 640px)');

  const visibleOctaveCount = isLarge ? OCTAVES_AT_LG : isMedium ? OCTAVES_AT_SM : OCTAVES_AT_BASE;
  const maxOctaveStart = START_OCTAVE + NUM_OCTAVES - visibleOctaveCount;

  const [octaveStart, setOctaveStart] = useState(START_OCTAVE);

  // Clamp during render rather than in an effect: when the viewport widens, the
  // window grows and a previously valid start can fall past the end. Deriving it
  // avoids a frame of out-of-range keys.
  const clampedStart = Math.min(Math.max(octaveStart, START_OCTAVE), Math.max(maxOctaveStart, START_OCTAVE));

  const { whiteKeys, blackKeys } = useMemo(
    () => buildKeyboardLayout(ALL_PIANO_KEYS, clampedStart, visibleOctaveCount),
    [clampedStart, visibleOctaveCount]
  );

  const canShiftDown = clampedStart > START_OCTAVE;
  const canShiftUp = clampedStart < maxOctaveStart;
  const showOctaveControls = visibleOctaveCount < NUM_OCTAVES;

  const shift = useCallback((delta: number) => {
    setOctaveStart(current => {
      const base = Math.min(Math.max(current, START_OCTAVE), Math.max(maxOctaveStart, START_OCTAVE));
      return Math.min(Math.max(base + delta, START_OCTAVE), Math.max(maxOctaveStart, START_OCTAVE));
    });
  }, [maxOctaveStart]);

  const navButton =
    'min-h-tap min-w-tap inline-flex items-center justify-center rounded-md bg-surface-2 text-gray-100 ' +
    'transition-colors hover:bg-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-chord ' +
    'disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <section
      className="w-full bg-gradient-to-b from-surface-1 to-surface-0 border border-surface-line rounded-lg shadow-xl my-4 p-2 sm:p-4 select-none"
      aria-label="虛擬鋼琴鍵盤"
    >
      {showOctaveControls && (
        <div className="flex items-center justify-between gap-2 mb-2">
          <button
            type="button"
            className={navButton}
            onClick={() => shift(-1)}
            disabled={!canShiftDown}
            aria-label="往低音移動一個八度"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <p className="text-xs sm:text-sm text-gray-300 font-mono" aria-live="polite">
            八度 C{clampedStart} – B{clampedStart + visibleOctaveCount - 1}
          </p>

          <button
            type="button"
            className={navButton}
            onClick={() => shift(1)}
            disabled={!canShiftUp}
            aria-label="往高音移動一個八度"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/*
        White keys lay out the row and share its width via flex-1; black keys are
        absolutely positioned on top at the boundary between two white keys. This
        replaces the old fixed-width plus negative-margin approach, which only
        lined up at exactly 40px per key.
      */}
      <div className="relative flex items-start gap-px">
        {whiteKeys.map(keyData => (
          <PianoKey
            key={keyData.fullName}
            keyData={keyData}
            onNoteAttack={onNoteAttack}
            onNoteRelease={onNoteRelease}
            isComputerKeyPressed={pressedKeys.has(keyData.fullName)}
            isAccompanimentActive={accompanimentActiveNotes.has(keyData.fullName)}
          />
        ))}

        {blackKeys.map(({ key, whiteBefore }) => (
          <PianoKey
            key={key.fullName}
            keyData={key}
            onNoteAttack={onNoteAttack}
            onNoteRelease={onNoteRelease}
            isComputerKeyPressed={pressedKeys.has(key.fullName)}
            isAccompanimentActive={accompanimentActiveNotes.has(key.fullName)}
            // Centre the key on the seam between the white keys either side of it.
            positionStyle={{ left: `${blackKeyOffsetPercent(whiteBefore, whiteKeys.length)}%` }}
          />
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-2 text-center">
        提示：您可以使用電腦鍵盤彈奏 (Z,S,X,D,C... 或 Q,2,W,3,E...)，空白鍵播放或停止伴奏
      </p>
    </section>
  );
};

export default PianoKeyboard;
