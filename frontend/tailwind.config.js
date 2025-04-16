/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#2dd4bf', // Teal 400 - Lighter
          DEFAULT: '#14b8a6', // Teal 500 - Default
          dark: '#0d9488', // Teal 600 - Darker
        },
        secondary: {
          light: '#6ee7b7',
          DEFAULT: '#34d399',
          dark: '#10b981',
        },
        background: {
          light: '#f8fafc',
          dark: '#0f172a',
        },
        surface: {
          light: 'rgba(255, 255, 255, 0.9)',
          dark: 'rgba(15, 23, 42, 0.9)',
        },
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glass-hover': '0 8px 32px 0 rgba(31, 38, 135, 0.25)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
      },
      backdropBlur: {
        'glass': '12px',
      },
    },
  },
  plugins: [],
};