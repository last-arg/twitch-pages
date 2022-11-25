const plugins = [
  require('postcss-import')(),
];

if (process.env.NODE_ENV === "production") {
  plugins.push(require("cssnano")());
  plugins.push(require("postcss-prune-var")());
}

module.exports = {
  plugins: plugins
}
