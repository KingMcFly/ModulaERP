/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        primary: {
          50: '#f0f0ff', 100: '#e4e3ff', 200: '#cccbfe', 300: '#aaa8fc',
          400: '#837dfa', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca',
          800: '#3730a3', 900: '#312e81', 950: '#1e1b4b',
        },
        apple: {
          bg:        '#F5F5F7',
          'bg-2':    '#FFFFFF',
          'bg-3':    '#F2F2F2',
          label:     '#1D1D1F',
          'label-2': '#6E6E73',
          'label-3': '#AEAEB2',
          separator: 'rgba(60,60,67,0.12)',
          fill:      'rgba(120,120,128,0.12)',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
};
