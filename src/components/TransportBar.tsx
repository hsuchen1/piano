import React from 'react';
import { MAX_BPM, MIN_BPM } from '../constants';

interface TransportBarProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  isBeat: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  disabled: boolean;
  /** Why playback is unavailable, surfaced as the button's title. */
  disabledReason?: string;
}

/**
 * Floating transport, pinned to the bottom of the viewport.
 *
 * Play/stop and tempo previously lived only inside the accompaniment card, which
 * scrolls away as soon as you start editing chords or drum patterns. The space bar
 * covers this on a desktop, but a phone has no space bar, so on mobile there was
 * no way to stop playback without scrolling back up.
 *
 * Rendered only while the real transport is off screen, so the two are never
 * visible together.
 */
const TransportBar: React.FC<TransportBarProps> = ({
  bpm,
  onBpmChange,
  isBeat,
  isPlaying,
  onPlay,
  onStop,
  disabled,
  disabledReason,
}) => (
  <div
    // pb offset keeps the controls clear of the iOS home indicator.
    className="fixed bottom-0 left-0 right-0 z-40 border-t border-surface-line bg-surface-1/95 backdrop-blur-sm shadow-[0_-4px_12px_rgba(0,0,0,0.35)] pb-[env(safe-area-inset-bottom)]"
    role="region"
    aria-label="播放控制"
  >
    <div className="container mx-auto flex items-center gap-3 px-3 py-2">
      {!isPlaying ? (
        <button
          type="button"
          onClick={onPlay}
          disabled={disabled}
          title={disabled ? disabledReason : '播放伴奏'}
          className="min-h-tap min-w-tap inline-flex items-center justify-center gap-2 px-4 rounded-md bg-green-600 text-white font-semibold transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">播放</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onStop}
          title="停止伴奏"
          className="min-h-tap min-w-tap inline-flex items-center justify-center gap-2 px-4 rounded-md bg-red-600 text-white font-semibold transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H8a1 1 0 01-1-1V8z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">停止</span>
        </button>
      )}

      <label htmlFor="transportBarBpm" className="flex items-center gap-2 flex-grow min-w-0">
        <span
          className={`w-2.5 h-2.5 shrink-0 rounded-full bg-accent-ai transition-all duration-75 ${isBeat ? 'scale-150 opacity-100' : 'scale-100 opacity-50'}`}
          aria-hidden="true"
        />
        <span className="text-xs text-gray-300 font-mono shrink-0 tabular-nums">{bpm} BPM</span>
        <input
          type="range"
          id="transportBarBpm"
          min={MIN_BPM}
          max={MAX_BPM}
          value={bpm}
          onChange={event => onBpmChange(parseInt(event.target.value, 10))}
          className="flex-grow min-w-0 h-2.5 bg-surface-2 rounded-lg appearance-none cursor-pointer accent-accent-ai focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ai"
          aria-label="調整伴奏速度"
        />
      </label>
    </div>
  </div>
);

export default TransportBar;
