const pluginWebc = require("@11ty/eleventy-plugin-webc");
const htmlMinifier = require ('html-minifier')

module.exports = function(eleventyConfig) {
	eleventyConfig.addPlugin(pluginWebc, {
		components: "./src/_includes/components/**/*.webc",
	});
	eleventyConfig.setUseGitIgnore(false);
	eleventyConfig.ignores.add("src/css/");
	eleventyConfig.addPassthroughCopy("public");
	eleventyConfig.addPassthroughCopy("src/sw.js");
	eleventyConfig.addPassthroughCopy("favicon.svg");

	  eleventyConfig.addTransform("component-css", async function(content) {
		if (this.page.outputPath === "src/css/components.css") {
			const index = content.indexOf("/*CSS-END*/");
			return content.slice(0, index);
		}

	    return content; // no change done.
	  });

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
