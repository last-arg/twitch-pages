import fs from "node:fs";
import pluginWebc from "@11ty/eleventy-plugin-webc";
import htmlMinifier from 'html-minifier';
import { PurgeCSS } from "purgecss";
import { bundle, browserslistToTargets } from "lightningcss";
import esbuild from "esbuild";
import eleventyAutoCacheBuster from "eleventy-auto-cache-buster";
import svgo from "svgo";
import bundlerPlugin from "@11ty/eleventy-plugin-bundle";
import * as unocss_cli from "@unocss/cli";

const output_dir = "_site";
/**
 * @param {import("@11ty/eleventy/src/UserConfig")} eleventyConfig
 * @returns {ReturnType<import("@11ty/eleventy/src/defaultConfig")>}
 */
export default function(eleventyConfig) {
	const is_prod = process.env.NODE_ENV === "production";

	if (is_prod) {
		fs.rmSync(output_dir, { recursive: true, force: true });
	}

	eleventyConfig.addJavaScriptFunction("isProd", function() { return is_prod });
	if (is_prod) {
		eleventyConfig.addPlugin(eleventyAutoCacheBuster, {
			globstring: "**/*.{css,svg}",
			// enableLogging: true,
		});
	}

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
	
	eleventyConfig.addPlugin(bundlerPlugin, {
		bundles: ["svg"],
		transforms: [
			async function(content) {
				if (this.type === "js") {
					// TODO?: use esbuild.context instead? - https://github.com/woodcox/11ty-solid-base/blob/main/config/build/esbuild.js
					const r = await esbuild.build({
    				  stdin: {
    				  	  contents: content,
    				  	  resolveDir: './src/js',
    				  	  sourcefile: this.page.url,
    				  },
					  minify: is_prod,
					  bundle: true,
					  sourcemap: !is_prod,
					  write: false,
					})
					const out = r.outputFiles[0];
					if (out) {
						return out.text
					}
				} else if (this.type === 'css' && this.page?.outputPath.endsWith("_components.css")) {
					// run after the file is created
					setTimeout(() => buildCss(is_prod), 1);
				}
			
				return content;
			}
		]
	});

	eleventyConfig.addPlugin(pluginWebc, {
		components: ["./src/_includes/components/**/*.webc"],
	});

	eleventyConfig.setUseGitIgnore(false);
	eleventyConfig.addWatchTarget("src/js/*")
	eleventyConfig.watchIgnores.add("src/css/_components.css");
	eleventyConfig.watchIgnores.add("src/css/_utilities_generated.css");
	eleventyConfig.ignores.add("src/css/_*.css");

	eleventyConfig.addPassthroughCopy({
		"./node_modules/upup/dist/upup.min.js": "./upup.min.js",
		"./node_modules/upup/dist/upup.sw.min.js": "/upup.sw.min.js",
		"static": "/",
	});

	if (is_prod) {
	    eleventyConfig.addTransform ('html-minifier', content => {
	      if (this.page?.fileSlug === "html") {
	        return htmlMinifier.minify(content, {
	          useShortDoctype: true,
	          removeComments: true,
	          collapseWhitespace: true,
	        })
	      }
	      return content
	    })
    }

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
