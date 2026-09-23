/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Roboto', 'ui-sans-serif', 'system-ui', '-apple-system',
          '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif',
        ],
        display: [
          '"Google Sans"', 'Roboto', 'ui-sans-serif', 'system-ui',
          '-apple-system', '"Segoe UI"', 'Arial', 'sans-serif',
        ],
      },
      colors: {
        // ---- CrossLinkd brand system (original) ----
        // Warm parchment neutrals (light) / charcoal-graphite (dark),
        // with a "grace gold" primary + "living teal" secondary.
        brand: {
          50: '#FFFBF2', 100: '#FEF3D9', 200: '#FCE6B0', 300: '#FAD586',
          400: '#F6C25C', 500: '#EFAE33', 600: '#D89522', 700: '#B47318',
          800: '#8F5B17', 900: '#744C16', 950: '#452A0B',
        },
        tealish: {
          50: '#EFFAF7', 100: '#D7F0E8', 200: '#AFE1D4', 300: '#7CCABB',
          400: '#4AAE9C', 500: '#2E9283', 600: '#22746A', 700: '#1F5D57',
          800: '#1C4A47', 900: '#1B3D3B', 950: '#0C2322',
        },
        ink: {
          50: '#F7F6F3', 100: '#ECEAE3', 200: '#D8D4C8', 300: '#BDB6A5',
          400: '#A29A83', 500: '#877F68', 600: '#6C6653', 700: '#595445',
          800: '#4B473C', 900: '#26241F', 925: '#1E1C18', 950: '#171512',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,16,20,.04), 0 6px 16px -10px rgba(15,16,20,.10)',
        lift: '0 1px 2px rgba(15,16,20,.05), 0 10px 24px -14px rgba(15,16,20,.16)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up .5s ease both',
      },
    },
  },
  plugins: [],
};
