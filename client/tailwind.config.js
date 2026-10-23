/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          darkest: '#090d16',
          darker: '#0f172a',
          card: '#131e36',
          border: '#1e293b',
          accent: '#06b6d4',
          neon: '#10b981',
          danger: '#ef4444',
          warning: '#f59e0b'
        }
      }
    },
  },
  plugins: [],
};
