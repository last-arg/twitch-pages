module.exports = {
  // Content files referencing CSS classes
  content: ["./_site/**/*.html"],
  // content: ["./src/**/*.webc"],
  keyframes: true,
  variables: true,
  safelist: [":where"],
  // CSS files to be purged in-place
  css: ["./_site/css/main.css"],
};
