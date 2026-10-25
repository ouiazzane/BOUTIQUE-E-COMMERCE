/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0f172a',
        accent: '#2563eb',
        warm: '#f8fafc',
        peach: '#f59e0b'
      }
    }
  },
  plugins: []
};
