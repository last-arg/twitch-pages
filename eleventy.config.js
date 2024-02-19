const pluginWebc = require("@11ty/eleventy-plugin-webc");
const htmlMinifier = require ('html-minifier')
const { PurgeCSS } = require("purgecss");
const { bundle, browserslistToTargets } =  require("lightningcss");
const fs = require("node:fs");
const eleventyAutoCacheBuster = require("eleventy-auto-cache-buster");

/**
 * @param {import("@11ty/eleventy/src/UserConfig")} eleventyConfig
 * @returns {ReturnType<import("@11ty/eleventy/src/defaultConfig")>}
 */
module.exports = function(eleventyConfig) {
	const is_prod = process.env.NODE_ENV === "production";
	eleventyConfig.addJavaScriptFunction("isProd", function() { return is_prod });
	eleventyConfig.addPlugin(eleventyAutoCacheBuster, {
		globstring: "**/*.{css,js,png,jpg,jpeg,gif,mp4,ico,svg}",
		// enableLogging: true,
	});

	eleventyConfig.addPassthroughCopy("public");

	eleventyConfig.addPlugin(pluginWebc, {
		components: ["./src/_includes/components/**/*.webc"],
		bundlePluginOptions: {
			transforms: [
				function(content) {
					if (this.type === 'css' && this.page?.outputPath.endsWith("_components.css")) {
						// run after the file is created
						setTimeout(() => bundleCss(is_prod), 100);
					}
					return content;
				}
			]
		},
	});

	eleventyConfig.setUseGitIgnore(false);
	eleventyConfig.watchIgnores.add("src/css/_components.css");
	eleventyConfig.watchIgnores.add("src/css/_utilities_generated.css");
	eleventyConfig.ignores.add("src/css/_*.css");
	eleventyConfig.addPassthroughCopy("public");
	eleventyConfig.addPassthroughCopy({
		"./node_modules/upup/dist/upup.min.js": "./upup.min.js",
		"./node_modules/upup/dist/upup.sw.min.js": "upup.sw.min.js",
		"static": "/",
	});

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
		domDiff: false,
		// watch: []
	});

	return {
		dir: {
			input: "src",
			output: "_site",
		}
	};
};

async function bundleCss(is_prod) {
	// TODO: if css has changed
	let { code } = bundle({
	  filename: './src/css/main.css',
	  minify: is_prod,
	  targets: browserslistToTargets([">= 0.25% and not dead"]),
	});
	const css_dir = "_site/css/";
	let file = css_dir + "main.css";
	if (!fs.existsSync(css_dir)){
	    fs.mkdirSync(css_dir);
	}

	if (is_prod) {
		const result = await new PurgeCSS().purge({
		  // Content files referencing CSS classes
		  content: ["./_site/**/*.html"],
		  keyframes: true,
		  variables: true,
			safelist: {
				standard: [ /^\:[-a-z]+$/ ],
				greedy: [/\:(before|after)/ ],
			},
		  // CSS files to be purged in-place
		  // css: ["./_site/css/main.css"],
		  css: [{ name: file, raw: code.toString() }],
		});
		if (result.length) {
			code = result[0].css;
		}
	}
	fs.writeFileSync(file, code);
}
