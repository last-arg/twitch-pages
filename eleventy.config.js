const pluginWebc = require("@11ty/eleventy-plugin-webc");

module.exports = function(eleventyConfig) {
	eleventyConfig.addPlugin(pluginWebc, {
    components: "src/_includes/components/*.webc",
	});
  // eleventyConfig.addWatchTarget("src/_includes/components/");
  eleventyConfig.setUseGitIgnore(false);
	eleventyConfig.ignores.add("src/css/");
  eleventyConfig.addPassthroughCopy("public");
  eleventyConfig.addPassthroughCopy("favicon.svg");
	return {
  	dir: {
    	input: "src",
    	output: "_site",
  	}
	};
};
