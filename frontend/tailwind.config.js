/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mint: {
          50: '#f0f7f4',
          100: '#e1f0e9',
          200: '#c3e2d3',
          300: '#95ceb6',
          400: '#62b394',
          500: '#3d9878',
          600: '#2d7a5f',
          700: '#26624d',
          800: '#214e3f',
          900: '#1d4135',
        },
        cream: '#faf8f5',
        forest: '#0f382c',
        iosBg: '#f0f7f4',
      },
      borderRadius: {
        '3xl': '1.75rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'ios': '0 8px 30px rgba(0, 0, 0, 0.04)',
        'ios-hover': '0 14px 40px rgba(16, 185, 129, 0.12)',
        'ios-glow': '0 10px 30px -5px rgba(16, 185, 129, 0.35)',
      },
    },
  },
  plugins: [],
}
