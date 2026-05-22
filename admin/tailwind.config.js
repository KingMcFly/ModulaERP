/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        primary: {
          50:  '#fffbf0',
          100: '#fef3d0',
          200: '#fde49e',
          300: '#fbd060',
          400: '#f9be38',
          500: '#F2B045',
          600: '#EDA135',
          700: '#d4861a',
          800: '#b06a12',
          900: '#8a5010',
        },
      },
    },
  },
  plugins: [],
};
