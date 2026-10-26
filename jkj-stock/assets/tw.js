tailwind.config = {
  theme: {
    extend: {
      colors: {
        ivory: '#f6f3ee',
        sand: '#ece6dc',
        ink: { DEFAULT: '#121110', soft: '#3a3733', mute: '#77716a' },
        bronze: { DEFAULT: '#a87b45', light: '#c9a46a', deep: '#7d5a2f' },
        wa: '#25d366',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(18,17,16,.04), 0 8px 24px rgba(18,17,16,.06)',
        lift: '0 24px 60px rgba(18,17,16,.14)',
      },
      screens: { xs: '400px', '3xl': '1920px' },
      letterSpacing: { luxe: '0.3em' },
    },
  },
};
