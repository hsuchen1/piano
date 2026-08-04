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
    },
  },
  plugins: [],
};
