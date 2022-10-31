const pluginWebc = require("@11ty/eleventy-plugin-webc");

module.exports = function(eleventyConfig) {
	eleventyConfig.addPlugin(pluginWebc, {
    components: "src/_includes/components/*.webc"
	});
  eleventyConfig.setUseGitIgnore(false);
  eleventyConfig.addPassthroughCopy("public/");
	return {
  	dir: {
    	input: "src",
    	output: "_site",
  	}
	};
};
