/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bc-dark': '#0f1117',
        'bc-panel': '#1a1d27',
        'bc-border': '#2a2d3a',
        'bc-accent': '#3b82f6',
        'bc-green': '#22c55e',
        'bc-red': '#ef4444',
        'bc-yellow': '#eab308',
      },
    },
  },
  plugins: [],
};
