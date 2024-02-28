import fs from "node:fs";
import pluginWebc from "@11ty/eleventy-plugin-webc";
import htmlMinifier from 'html-minifier';
import { PurgeCSS } from "purgecss";
import { bundle, browserslistToTargets } from "lightningcss";
import esbuild from "esbuild";
import eleventyAutoCacheBuster from "eleventy-auto-cache-buster";
import svgo from "svgo";
import bundlerPlugin from "@11ty/eleventy-plugin-bundle";
import svgo_config from "./svg.config.js"
import * as unocss_cli from "@unocss/cli";

const output_dir = "_site";
const tmp_dir = `${output_dir}/tmp`

/**
 * @param {import("@11ty/eleventy/src/UserConfig")} eleventyConfig
 * @returns {ReturnType<import("@11ty/eleventy/src/defaultConfig")>}
 */
export default function(eleventyConfig) {
	const is_prod = process.env.NODE_ENV === "production";
	eleventyConfig.addJavaScriptFunction("isProd", function() { return is_prod });

	if (is_prod) {
		fs.rmSync(output_dir, { recursive: true, force: true });

		eleventyConfig.addPlugin(eleventyAutoCacheBuster, {
			globstring: "**/*.{css,svg}",
			// enableLogging: true,
		});
		
		eleventyConfig.on('eleventy.after', async function() {
			await buildCssProd(is_prod);
			setupServiceWorkerScript();
			cleanUp();
		})

	    eleventyConfig.addTransform('html-minifier', function(content) {
	      if (this.page?.outputFileExtension === "html") {
	        return htmlMinifier.minify(content, {
	          useShortDoctype: true,
	          removeComments: true,
	          collapseWhitespace: true,
	        })
	      }
	      return content
	    })
	} else {
		// eleventyConfig.on('eleventy.after', async function() {
		// 	// This reloads page when using 'wrangler pages dev'
		// 	const time = new Date(); 
		// 	fs.utimes("./functions/reload.js", time, time, function() {});
		// })
	}

	eleventyConfig.on('eleventy.before', async function() {
		await unocss_cli.build({ patterns: [ "src/**/*.webc" ], outFile: `${output_dir}/css/_utilities_generated.css` });
	})

	eleventyConfig.addTemplateFormats("svg");
	eleventyConfig.addExtension("svg", {
		outputFileExtension: "svg",
	    compile: function(inputContent) {
	      if (is_prod) {
			  const result = svgo.optimize(inputContent, svgo_config);
			  inputContent = result.data;
	      }
	      return () => { return inputContent };
	    }
	});

	eleventyConfig.addPassthroughCopy({
		"./node_modules/open-props/open-props.min.css": "./css/open-props/open-props.min.css",
		"./node_modules/open-props/colors-hsl.min.css": "./css/open-props/colors-hsl.min.css",
	});
	eleventyConfig.addTemplateFormats("css");
	eleventyConfig.addExtension("css", {
		outputFileExtension: "css",
	    compile: function(inputContent) {
	      return () => { return inputContent };
	    }
	});
	
	eleventyConfig.addPlugin(bundlerPlugin, {
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

	eleventyConfig.addPassthroughCopy({
		"./node_modules/upup/dist/upup.min.js": "./upup.min.js",
		"./node_modules/upup/dist/upup.sw.min.js": "/upup.sw.min.js",
		"static": "/",
	});

	// TODO: livereload does not seem to work well
	// - probably eleventy bug
	// - reload seems to work the first time only
	eleventyConfig.setServerOptions({
		domDiff: false,
		// liveReload: false,
		watch: [
			`${output_dir}/**/*.css`, 
			// `${output_dir}/**/*.js`
		]
	});

	return {
		dir: {
			input: "src",
			output: output_dir,
		}
	};
};

function tmpDir() {
	if (!fs.existsSync(tmp_dir)){
	    fs.mkdirSync(tmp_dir);
	}
	return tmp_dir;
}

function cleanUp() {
	fs.rm(tmpDir(), {recursive: true}, function(err) { if (err) throw err; })
}

async function buildCssProd(is_prod) {
	// TODO: if css has changed
	let { code } = bundle({
	  filename: `./${output_dir}/css/main.css`,
	  minify: is_prod,
	  targets: browserslistToTargets([">= 0.25% and not dead"]),
	});
	const css_dir = `${output_dir}/css_prod/`;
	let file = css_dir + "main.css";
	if (!fs.existsSync(css_dir)){
	    fs.mkdirSync(css_dir);
	}

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

	if (result.length > 0) {
		code = result[0].css;
	}

	fs.writeFileSync(file, code);
	tmpDir();
	const old_dir = `${output_dir}/css/`;
    fs.rename(old_dir, `${output_dir}/tmp/css/`, function(err) { if (err) throw err; });
    fs.rename(css_dir, old_dir, function(err) { if (err) throw err; });
}

function setupServiceWorkerScript() { 
	const assets = [
      "/css/main.css", 
      "/public/assets/icons.svg",
      "/public/partials/category.html",
      "/public/partials/not-found.html",
      "/public/partials/settings.html",
      "/public/partials/top-games.html",
      "/public/partials/user-videos.html",
    ];
	const files = fs.readdirSync(`${output_dir}/bundle`);
	for (const f of files) {assets.push(f)}

	// To get hash version would have to get hash for all files. Concat those
	// hashes into version? Hash or shorten concated value into shorter value?
    const cache_version = Date.now().toString(); 
	let out = `UpUp.start({"cache-version": "${cache_version}","assets": ${JSON.stringify(assets)}})` 
	const filename = `${output_dir}/index.html`;
	const input = fs.readFileSync(filename, "utf-8");
	out = input.replace("[SERVICE_WORKER_SCRIPT]", out);
	fs.writeFileSync(filename, out);
}
