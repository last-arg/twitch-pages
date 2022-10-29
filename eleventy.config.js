const pluginWebc = require("@11ty/eleventy-plugin-webc");

module.exports = function(eleventyConfig) {
	eleventyConfig.addPlugin(pluginWebc, {
    components: "src/_includes/components/*.webc"
	});
  eleventyConfig.setWatchJavaScriptDependencies(true);
  eleventyConfig.addWatchTarget("src/main.js");
  eleventyConfig.addPassthroughCopy("public");
  eleventyConfig.addPassthroughCopy("src/main.js");
	return {
  	dir: {
    	input: "src",
    	output: "tmp",
  	}
	};
};
