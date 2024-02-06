const pluginWebc = require("@11ty/eleventy-plugin-webc");
const htmlMinifier = require ('html-minifier')
const {PurgeCSS} = require("purgecss");
const { bundle, browserslistToTargets } =  require("lightningcss");
const fs = require("node:fs");

/**
 * @param {import("@11ty/eleventy/src/UserConfig")} eleventyConfig
 * @returns {ReturnType<import("@11ty/eleventy/src/defaultConfig")>}
 */
module.exports = function(eleventyConfig) {
	const is_prod = process.env.NODE_ENV === "production";

	eleventyConfig.on('eleventy.after', async (_) => {
		// TODO: if css has changed
		let { code } = bundle({
		  filename: 'src/css/main.css',
		  minify: is_prod,
		  targets: browserslistToTargets([">= 0.25% and not dead"]),
		});
		const css_dir = "_site/css/";
		if (!fs.existsSync(css_dir)){
		    fs.mkdirSync(css_dir);
		}
		let file = css_dir + "main.css";
		if (is_prod) {
			const result = await new PurgeCSS().purge({
			  // Content files referencing CSS classes
			  content: ["./_site/**/*.html"],
			  // content: ["./src/**/*.webc"],
			  keyframes: true,
			  variables: true,
			  safelist: [":where"],
			  // CSS files to be purged in-place
			  // css: ["./_site/css/main.css"],
			  css: [{ name: file, raw: code.toString() }],
			});
			if (result.length) {
				code = result[0].css;
			}
		}
		fs.writeFileSync(file, code);
	});

	eleventyConfig.addPlugin(pluginWebc, {
		components: ["./src/_includes/components/**/*.webc"],
	});

	eleventyConfig.setUseGitIgnore(false);
	eleventyConfig.watchIgnores.add("src/css/_components.css");
	eleventyConfig.watchIgnores.add("src/css/_utilities_generated.css");
	// TODO: find better solution for building css with lightningcss
	eleventyConfig.ignores.add(is_prod ? "src/css/*.css" : "src/css/_*.css");
	eleventyConfig.addPassthroughCopy("public");
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

	eleventyConfig.setServerOptions({
		domDiff: false
	});

	return {
		dir: {
			input: "src",
			output: "_site",
		}
	};
};
