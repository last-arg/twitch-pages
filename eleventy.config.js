const pluginWebc = require("@11ty/eleventy-plugin-webc");

module.exports = function(eleventyConfig) {
	eleventyConfig.addPlugin(pluginWebc, {
    components: "./src/_includes/components/**/*.webc",
	});
  eleventyConfig.setUseGitIgnore(false);
	eleventyConfig.ignores.add("src/css/");
  eleventyConfig.addPassthroughCopy("public");
  eleventyConfig.addPassthroughCopy("src/sw.js");
  eleventyConfig.addPassthroughCopy("favicon.svg");
	return {
		// domdiff: false,
  	dir: {
    	input: "src",
    	output: "_site",
  	}
	};
};
