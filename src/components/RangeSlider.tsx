import React from 'react';

const COLOR_MAP: Record<string, string> = {
  purple: '#a855f7',
  blue: '#3b82f6',
  red: '#ef4444',
  yellow: '#f59e0b',
  amber: '#f59e0b',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  pink: '#ec4899',
  green: '#22c55e',
  ai: '#a855f7',
};

export interface RangeSliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'min' | 'max'> {
  id?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  /** Color name (e.g., 'blue', 'red', 'purple') or custom CSS hex color (e.g., '#3b82f6') */
  color?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Enhanced range slider component with high-contrast track background and
 * clear progress fill so users can easily see current value and track bounds.
 */
export const RangeSlider: React.FC<RangeSliderProps> = ({
  id,
  min,
  max,
  step = 1,
  value,
  onChange,
  color = 'blue',
  className = '',
  ariaLabel,
  disabled,
  ...rest
}) => {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const hexColor = COLOR_MAP[color] || (color.startsWith('#') ? color : '#3b82f6');
  const unfilledColor = '#111827'; // Dark high-contrast track background

  const trackStyle: React.CSSProperties = {
    background: `linear-gradient(to right, ${hexColor} 0%, ${hexColor} ${percentage}%, ${unfilledColor} ${percentage}%, ${unfilledColor} 100%)`,
    color: hexColor,
  };

  return (
    <input
      type="range"
      id={id}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={trackStyle}
      className={`range-slider w-full h-2.5 rounded-lg appearance-none cursor-pointer border border-gray-600/60 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-900 focus:ring-opacity-80 ${className}`}
      aria-label={ariaLabel}
      {...rest}
    />
  );
};

export default RangeSlider;
