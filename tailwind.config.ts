import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#07070B',
          secondary: '#0B0B12',
          card: '#101018',
          elevated: '#151520',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        insta: {
          purple: '#833AB4',
          pink: '#E1306C',
          orange: '#F77737',
          yellow: '#FCAF45',
        },
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fd',
          400: '#36a9fa',
          500: '#0c8ce9',
          600: '#026fc7',
          700: '#0358a1',
          800: '#074b85',
          900: '#0c3f6e',
          950: '#082849',
        },
        slate: {
          850: '#131f37',
          900: '#0f172a',
          950: '#090d16',
        }
      },
      backgroundImage: {
        'insta-gradient': 'linear-gradient(135deg, #833AB4 0%, #E1306C 50%, #F77737 100%)',
        'insta-gradient-hover': 'linear-gradient(135deg, #9346C8 0%, #ED3C78 50%, #FF8343 100%)',
        'insta-gradient-soft': 'linear-gradient(135deg, rgba(131, 58, 180, 0.15) 0%, rgba(225, 48, 108, 0.15) 50%, rgba(247, 119, 55, 0.15) 100%)',
        'gradient-purple-pink': 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
        'gradient-pink-orange': 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
        'gradient-purple-cyan': 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
      },
      boxShadow: {
        'insta-glow': '0 0 25px -5px rgba(225, 48, 108, 0.3)',
        'purple-glow': '0 0 25px -5px rgba(139, 92, 246, 0.3)',
        'blue-glow': '0 0 25px -5px rgba(56, 189, 248, 0.3)',
        'rose-glow': '0 0 25px -5px rgba(244, 63, 94, 0.3)',
        'amber-glow': '0 0 25px -5px rgba(245, 158, 11, 0.3)',
        'emerald-glow': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
