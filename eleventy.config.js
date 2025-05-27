import fs from "node:fs";
import pluginWebc from "@11ty/eleventy-plugin-webc";
import htmlMinifier from 'html-minifier';
import { PurgeCSS } from "purgecss";
import { bundle, browserslistToTargets } from "lightningcss";
import esbuild from "esbuild";
import svgo from "svgo";
import bundlerPlugin from "@11ty/eleventy-plugin-bundle";
import svgo_config from "./svg.config.js"
import * as unocss_cli from "@unocss/cli";
import path from "path";
import crypto from "crypto";

const __dirname = import.meta.dirname;

const output_dir = "_site";
const assets_output = `${output_dir}/assets`;
const tmp_dir = `${output_dir}/tmp`
// A cache to store the hashed file names
const hashCache = {};
let is_prod = false;

/**
 * @param {import("@11ty/eleventy/src/UserConfig")} eleventyConfig
 * @returns {ReturnType<import("@11ty/eleventy/src/defaultConfig")>}
 */
export default function(eleventyConfig) {
	is_prod = process.env.NODE_ENV === "production";
	eleventyConfig.addJavaScriptFunction("isProd", function() { return is_prod });

	// A cache buster if a file changes
	const prefixLength = "./src".length
	eleventyConfig.on('eleventy.beforeWatch', async (changedFiles) => {
		for (const file of changedFiles) {
			const relativePath = file.slice(prefixLength)
			delete hashCache[relativePath]
		}
	});

	// A filter to dynamically hash asset file contents
	eleventyConfig.addFilter("hashFile", hashFile)

	if (is_prod) {
		fs.rmSync(output_dir, { recursive: true, force: true });

		eleventyConfig.on('eleventy.after', async function() {
			await buildCssProd(is_prod);
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
		eleventyConfig.on('eleventy.after', async function() {
			// This reloads page when using 'wrangler pages dev'
			const time = new Date();
			fs.utimes("./functions/reload.js", time, time, function() { });
		})
	}

	eleventyConfig.on('eleventy.before', async function() {
		await unocss_cli.build({ patterns: ["src/**/*.webc"], outFile: `${output_dir}/css/_utilities_generated.css` });
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
		},
		compileOptions: {
			permalink: function(contents, inputPath) {
				const index = inputPath.indexOf("/assets");
				if (index !== -1) {
					return hashFile(inputPath.slice(index));
				}
				return inputPath;
			}
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
		toFileDirectory: "assets",
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
		"static": "/",
		"./favicon.svg": "./favicon.svg",
		"./src/js/main_module.js": "./js/main_module.js",
	});

	// TODO: livereload does not seem to work well
	// - probably eleventy bug
	// - reload seems to work the first time only
	eleventyConfig.setServerOptions({
		domDiff: false,
		// liveReload: true,
		watch: [
			// `${output_dir}/**/*.css`, 
			// `${output_dir}/**/*.js`
		],
		onRequest: {
			"/directory/category/*": function(req) {
				const _site_index = fs.readFileSync(path.join(__dirname, output_dir, "index.html")).toString();
				return _site_index;
			},
			"/*/videos": function(req) {
				const _site_index = fs.readFileSync(path.join(__dirname, output_dir, "index.html")).toString();
				return _site_index;
			},
			"/settings": function(req) {
				const _site_index = fs.readFileSync(path.join(__dirname, output_dir, "index.html")).toString();
				return _site_index;
			},
		},
	});

	return {
		dir: {
			input: "src",
			output: output_dir,
		}
	};
};

function tmpDir() {
	if (!fs.existsSync(tmp_dir)) {
		fs.mkdirSync(tmp_dir);
	}
	return tmp_dir;
}

function cleanUp() {
	fs.rm(tmpDir(), { recursive: true }, function(err) { if (err) throw err; })
}

async function buildCssProd(is_prod) {
	const file_key = "/css/main.css";
	const file_path = hashCache[file_key] || file_key
	const input_file = `./${output_dir}${file_path}`;
	// TODO: if css has changed
	let { code } = bundle({
		filename: input_file,
		minify: is_prod,
		targets: browserslistToTargets([">= 0.25% and not dead"]),
	});
	const css_dir = `${output_dir}/css_prod/`;
	if (!fs.existsSync(css_dir)) {
		fs.mkdirSync(css_dir);
	}

	const file = css_dir + path.basename(input_file);
	const result = await new PurgeCSS().purge({
		// Content files referencing CSS classes
		content: [`./${output_dir}/**/*.html`],
		keyframes: true,
		variables: true,
		safelist: {
			standard: [/^\:[-a-z]+$/, "no-uploads", "no-highlights", "no-archives"],
			greedy: [/\:(before|after)/],
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

function hashFile(filePath) {
	if (!is_prod) {
		return filePath;
	}
	// If we've already hashed this file, return the hash
	if (hashCache[filePath]) {
		return hashCache[filePath];
	}

	// Get the absolute path to the file inside of src/site
	const absolutePath = path.join(__dirname, 'src', filePath);

	// Digest the file
	const fileBuffer = fs.readFileSync(absolutePath);
	const hash = crypto.createHash('md5').update(fileBuffer).digest('hex').slice(0, 8);
	const relativePath = filePath.slice(0, path.basename(filePath).length * -1)
	const digestFileName = `${relativePath}${hash}-${path.basename(filePath)}`;

	// See if the digest file exists in the output folder _site
	const digestFilePath = path.join(__dirname, output_dir, digestFileName);
	hashCache[filePath] = digestFileName;
	if (!fs.existsSync(digestFilePath)) {
		if (!fs.existsSync(path.dirname(digestFilePath))) {
			fs.mkdirSync(path.dirname(digestFilePath), { recursive: true });
		}
		fs.copyFileSync(absolutePath, digestFilePath);
	}
	// Return the hashFile file name
	return digestFileName;
}
