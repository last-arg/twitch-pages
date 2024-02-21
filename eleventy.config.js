const pluginWebc = require("@11ty/eleventy-plugin-webc");
const htmlMinifier = require ('html-minifier')
const { PurgeCSS } = require("purgecss");
const { bundle, browserslistToTargets } =  require("lightningcss");
const esbuild = require("esbuild");
const fs = require("node:fs");
const path = require("node:path");
const eleventyAutoCacheBuster = require("eleventy-auto-cache-buster");
const svgo = require("svgo");
const manifestPlugin = require('esbuild-plugin-manifest')
const manifest = require('./src/_data/manifest.json');

// TODO: manifest file with esbuild - https://github.com/woodcox/11ty-solid-base/blob/main/config/build/esbuild.js

const output_dir = "_site";
/**
 * @param {import("@11ty/eleventy/src/UserConfig")} eleventyConfig
 * @returns {ReturnType<import("@11ty/eleventy/src/defaultConfig")>}
 */
module.exports = function(eleventyConfig) {
	const is_prod = process.env.NODE_ENV === "production";

	if (is_prod) {
		fs.rmSync(output_dir, { recursive: true, force: true });
	}

	eleventyConfig.addJavaScriptFunction("isProd", function() { return is_prod });
	if (is_prod) {
		eleventyConfig.addPlugin(eleventyAutoCacheBuster, {
			globstring: "**/*.{css,js,png,jpg,jpeg,gif,mp4,ico,svg}",
			// enableLogging: true,
		});
	}

	// Use this filter only if the asset is processed by esbuild and is in _data/manifest.json. Use {{ 'myurl' | hash }}
	eleventyConfig.addFilter("hash", (url) => {
		const urlbase = path.basename(url);
		const [basePart, ...paramPart] = urlbase.split(".");
		const urldir = path.dirname(url);
		let hashedBasename = manifest[basePart];
		return `${urldir}/${hashedBasename}`;
	});

	eleventyConfig.on('eleventy.before', async () => {
		// TODO: use esbuild.context instead? - https://github.com/woodcox/11ty-solid-base/blob/main/config/build/esbuild.js
		await esbuild.build({
		  entryPoints: ["src/main.js", "src/third-party.js"],
		  entryNames: is_prod ? "[name]-[hash]" : "[name]",
		  outdir: `${output_dir}/public/js/`,
		  minify: is_prod,
		  bundle: true,
		  sourcemap: false,
		  metafile: true,
		  plugins: [
	  	    manifestPlugin({
		      // NOTE: Save to src/_data. This is always relative to `outdir`.
		      filename: '../../../src/_data/manifest.json',
		      shortNames: true,
		      extensionless: 'input',
		      // Generate manifest.json - https://github.com/pellebjerkestrand/pokesite/blob/main/source/build/build-client.js
		      generate: (entries) =>
		        Object.fromEntries(
		          Object.entries(entries).map(([from, to]) => [
		            from,
		            `${path.basename(to)}`,
		          ])
		        ),
		      })
		  ]
		})

		await esbuild.build({
		  entryPoints: ["src/config.prod.js"],
		  outdir: "src/js/",
		  minify: false,
		  sourcemap: false,
		  format: "cjs",
		})
	})

	if (is_prod) {
		eleventyConfig.on('eleventy.after', async () => {
			const input = fs.readFileSync("./src/assets/icons.svg", "utf-8");
			const {data} = svgo.optimize(input, require("./svg.config"));
			const dir = `${output_dir}/public/assets`;
			if (!fs.existsSync(dir)) {
			  fs.mkdirSync(dir)
			}
			fs.writeFileSync(`${dir}/icons.svg`, data);
		});
	} else {
		eleventyConfig.addPassthroughCopy({ "src/assets": "public/assets" });
	}
	
	eleventyConfig.addPlugin(pluginWebc, {
		components: ["./src/_includes/components/**/*.webc"],
		bundlePluginOptions: {
			transforms: [
				function(content) {
					if (this.type === 'css' && this.page?.outputPath.endsWith("_components.css")) {
						// run after the file is created
						setTimeout(() => buildCss(is_prod), 1);
					}
					return content;
				}
			]
		},
	});

	eleventyConfig.setUseGitIgnore(false);
	eleventyConfig.addWatchTarget("src/*.js")
	eleventyConfig.watchIgnores.add("src/js/*.js");
	eleventyConfig.watchIgnores.add("src/css/_components.css");
	eleventyConfig.watchIgnores.add("src/css/_utilities_generated.css");
	eleventyConfig.ignores.add("src/css/_*.css");

	eleventyConfig.addPassthroughCopy({
		"./node_modules/upup/dist/upup.min.js": "./upup.min.js",
		"./node_modules/upup/dist/upup.sw.min.js": "/upup.sw.min.js",
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
			output: output_dir,
		}
	};
};

async function buildCss(is_prod) {
	const unocss_cli = await import("@unocss/cli");
	await unocss_cli.build({ patterns: [ "src/**/*.webc" ], outFile: "src/css/_utilities_generated.css" });

	// TODO: if css has changed
	let { code } = bundle({
	  filename: './src/css/main.css',
	  minify: is_prod,
	  targets: browserslistToTargets([">= 0.25% and not dead"]),
	});
	const css_dir = `${output_dir}/css/`;
	let file = css_dir + "main.css";
	if (!fs.existsSync(css_dir)){
	    fs.mkdirSync(css_dir);
	}

	if (is_prod) {
		const result = await new PurgeCSS().purge({
		  // Content files referencing CSS classes
		  content: [`./${output_dir}/**/*.html`],
		  keyframes: true,
		  variables: true,
		  safelist: {
		  	standard: [ /^\:[-a-z]+$/, "no-uploads", "no-highlights", "no-archives" ],
		  	greedy: [/\:(before|after)/ ],
		  	keyframes: ["fade-in", "fade-out"],
		  },
		  // CSS files to be purged in-place
		  // css: [`./${output_dir}/css/main.css`],
		  css: [{ name: file, raw: code.toString() }],
		});
		if (result.length) {
			code = result[0].css;
		}
	}
	fs.writeFileSync(file, code);
}
