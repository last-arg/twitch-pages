const pluginWebc = require("@11ty/eleventy-plugin-webc");

module.exports = function(eleventyConfig) {
	eleventyConfig.addPlugin(pluginWebc, {
    components: "src/_includes/components/*.webc"
	});
  eleventyConfig.addWatchTarget("public/js/main.js");
  eleventyConfig.addWatchTarget("public/css/main.css");
  eleventyConfig.addPassthroughCopy("public/");
	return {
  	dir: {
    	input: "src",
    	output: "_site",
  	}
	};
};
