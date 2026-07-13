/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Keep in sync with src/constants/theme.ts (COLORS) —
      // Tailwind config can't import the TS constant directly.
      colors: {
        background: '#111111',
        bubbleReceived: '#242625',
        bubbleSent: '#333333',
        'button-primary': '#bdbdbd',
      },
    },
  },
  plugins: [],
};
