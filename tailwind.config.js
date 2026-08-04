/** @type {import('tailwindcss').Config} */
export default {
  // Only these files are scanned, so unused utilities are dropped from the build.
  // The old CDN shipped the entire framework and compiled it in the browser on
  // every page load.
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // 'Noto Sans TC' keeps Traditional Chinese rendering consistent with the
        // previous inline body style.
        sans: ['Inter', 'Noto Sans TC', 'sans-serif'],
      },

      /**
       * Semantic tokens.
       *
       * The UI previously stacked five raw grey levels (gray-800 page, 700 card,
       * 600 tab body, 500 layer, 400 input). Adjacent levels differ by so little
       * that the nesting reads as muddy rather than layered, and two of the greys
       * used in the code (gray-450, gray-550) do not exist in Tailwind's palette
       * at all, so those rules silently did nothing.
       *
       * Three surface levels plus a border colour give clearer separation, and
       * naming them means new code does not have to re-derive the hierarchy.
       */
      colors: {
        // Numbered rather than named raised/sunken: in a dark theme each level up
        // is *lighter*, so "sunken" would read backwards for the inputs that sit
        // on top of a card. Level 0 is furthest back.
        surface: {
          0: '#111827', // gray-900 - page background
          1: '#1f2937', // gray-800 - cards
          2: '#374151', // gray-700 - nested panels, inputs, list rows
          line: '#4b5563', // gray-600 - borders and dividers
        },

        /**
         * One colour per feature area, so a control's colour tells you which part
         * of the arrangement it affects. Previously six accent colours were used
         * with no consistent mapping: purple meant both "tempo" and "AI style
         * transfer", teal meant both "effects" and "smart voicing".
         */
        accent: {
          chord: '#3b82f6', // blue-500
          drums: '#ef4444', // red-500
          bass: '#f59e0b', // amber-500
          fx: '#14b8a6', // teal-500
          ai: '#a855f7', // purple-500
        },
      },

      minHeight: {
        // WCAG 2.5.8 (AA) requires 24x24 CSS px for pointer targets; 2.5.5 (AAA)
        // asks for 44x44. `touch` is the floor for dense grids, `tap` for
        // standalone buttons.
        touch: '1.75rem', // 28px
        tap: '2.75rem', // 44px
      },
      minWidth: {
        touch: '1.75rem',
        tap: '2.75rem',
      },
    },
  },
  plugins: [],
};
