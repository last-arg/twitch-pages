const defaultTheme = require('tailwindcss/defaultTheme');
const colors = require('tailwindcss/colors')

module.exports = {
  mode: 'jit',
  purge: ['./index.html', 'partials/*.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors : colors,
    extend: {
      colors: {
        transparent: 'transparent',
        current: 'currentColor',
      }
    }
  },
  variants: {}
  // plugins: [
  //   require('@tailwindcss/line-clamp'),
  // ]
};
