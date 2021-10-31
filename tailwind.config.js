const defaultTheme = require('tailwindcss/defaultTheme');
const colors = require('tailwindcss/colors')

module.exports = {
  mode: 'jit',
  purge: {
    content: ['./index.html', 'public/partials/*.html', 'src/**/*.{js,ts,jsx,tsx}', 'netlify/functions/*.{ts,js}'],
  },
  theme: {
    colors : colors,
    extend: {
      colors: {
        transparent: 'transparent',
        current: 'currentColor',
      },
      borderWidth: {
        "5": "5px",
        "6": "6px",
      },
      zIndex: {
        "-10": "-10",
      },
      maxWidth: {
        "10": "10rem",
      }
    }
  },
  variants: {},
  plugins: [
    require('@tailwindcss/line-clamp'),
  ]
};
