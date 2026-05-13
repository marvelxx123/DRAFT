/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", 'sans-serif'],
        body: ["'Inter'", 'sans-serif'],
      },
      colors: {
        accent: {
          DEFAULT: '#7C3AED',
          light: '#A855F7',
          glow: 'rgba(124,58,237,0.3)',
        },
        surface: {
          DEFAULT: '#0A0A0A',
          raised: '#111111',
          border: 'rgba(255,255,255,0.08)',
          hover: 'rgba(255,255,255,0.04)',
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'typing': 'typing 0.05s steps(1) infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
