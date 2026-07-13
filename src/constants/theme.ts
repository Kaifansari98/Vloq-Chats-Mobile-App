// Single source of truth for shared color values.
// For Tailwind/NativeWind `className` usage, the same hexes are also
// registered in tailwind.config.js (background, bubbleReceived, bubbleSent,
// button-primary) — keep the two in sync when changing these.
export const COLORS = {
  background: '#111111',
  backgroundRgb: '17, 17, 17',
  bubbleReceived: '#242625',
  bubbleSent: '#333333',
  buttonPrimary: '#bdbdbd',
  buttonPrimaryForeground: '#0a0a0a',
} as const;
