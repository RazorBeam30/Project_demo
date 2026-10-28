/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          600: '#059669',
          700: '#047857',
          900: '#064E3B',
        },
      },
    },
  },
  plugins: [],
}
