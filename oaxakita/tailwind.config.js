/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.jsx', './index.html'],
  theme: {
    extend: {
      colors: {
        obsidiana: '#080707',
        barro: '#110F0E',
        terracota: '#C85A32',
        teotitlan: '#E55B2B',
        maiz: '#E5A93B',
        agave: '#2D483A',
        oro: '#D4AF37',
        marfil: '#F5F2EB',
        ceniza: '#9E988E',
      },
      fontFamily: {
        display: ['Cinzel', '"Playfair Display"', 'Georgia', 'serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      screens: { xs: '400px', '3xl': '1920px', '4xl': '2560px' },
    },
  },
  plugins: [],
};
