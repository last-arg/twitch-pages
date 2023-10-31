const pluginWebc = require("@11ty/eleventy-plugin-webc");
const htmlMinifier = require ('html-minifier')
const lightningCSS = require("@11tyrocks/eleventy-plugin-lightningcss");
const purgeCssPlugin = require("eleventy-plugin-purgecss");

module.exports = function(eleventyConfig) {
	const is_prod = process.env.NODE_ENV === "production";

	if (is_prod) {
		eleventyConfig.addPlugin(purgeCssPlugin)
	}
	eleventyConfig.addPlugin(lightningCSS, { minify: is_prod });
	eleventyConfig.addPlugin(pluginWebc, {
		components: ["./src/_includes/components/**/*.webc"],
	});

	eleventyConfig.setUseGitIgnore(false);
	eleventyConfig.watchIgnores.add("src/css/_components.css");
	eleventyConfig.watchIgnores.add("src/css/_utilities_generated.css");
	// TODO: find better solution for building css with lightningcss
	eleventyConfig.ignores.add(is_prod ? "src/css/*.css" : "src/css/_*.css");
	eleventyConfig.addPassthroughCopy("public");
	// eleventyConfig.addPassthroughCopy("src/sw.js");
	eleventyConfig.addPassthroughCopy("favicon.svg");

    eleventyConfig.addTransform ('html-minifier', content => {
      if (is_prod && this.page?.fileSlug === "html") {
        return htmlMinifier.minify (content, {
          useShortDoctype: true,
          removeComments: true,
          collapseWhitespace: true,
        })
      }
      return content
    })

	return {
		dir: {
			input: "src",
			output: "_site",
		}
	};
};
