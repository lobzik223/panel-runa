/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        runa: {
          orange: '#C45C26',
          'orange-light': '#E85D04',
          dark: '#0f0f0f',
          cream: '#F5E6D3',
          gold: '#D4A84B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
