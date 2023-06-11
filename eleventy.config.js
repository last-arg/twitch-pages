const pluginWebc = require("@11ty/eleventy-plugin-webc");
const htmlMinifier = require ('html-minifier')
const lightningCSS = require("@11tyrocks/eleventy-plugin-lightningcss");

module.exports = function(eleventyConfig) {
	eleventyConfig.addPlugin(pluginWebc, {
		components: ["./src/_includes/components/**/*.webc"],
	});
	// eleventyConfig.addPlugin(lightningCSS, {
	// 	visitors: [
	// 		(d) => {
	// 			console.log("visit")
	// 		}
	// 	]
	// });

	eleventyConfig.setUseGitIgnore(false);
	eleventyConfig.ignores.add("src/css/");
	eleventyConfig.addPassthroughCopy("public");
	eleventyConfig.addPassthroughCopy("src/sw.js");
	eleventyConfig.addPassthroughCopy("favicon.svg");

    eleventyConfig.addTransform ('html-minifier', content => {
      if (process.env.NODE_ENV === 'production') {
        return htmlMinifier.minify (content, {
          useShortDoctype: true,
          removeComments: true,
          collapseWhitespace: true,
        })
      }
      return content
    })

	return {
		// domdiff: false,
		dir: {
			input: "src",
			output: "_site",
		}
	};
};
