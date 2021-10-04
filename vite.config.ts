import { resolve } from "path"
import { defineConfig } from "vite";
import viteCompression from 'vite-plugin-compression';

const base = process.env.NODE_ENV === "production" ? "/twitch-pages/" : "/"
const configFile = process.env.NODE_ENV === "production" ? "config.prod.ts" : "config.dev.ts"
export default defineConfig({
  plugins: [],

  resolve: {
    alias: {
      'config': resolve(__dirname, `src/${configFile}`)
      // 'htmx.org': resolve(__dirname, 'node_modules/htmx.org/dist/htmx.js')
    }
  },
  base: base,
  build: {
    target: "esnext",
    polyfillDynamicImport: false,
		rollupOptions: {
			inlineDynamicImports: true,
			// output: {
			// 	manualChunks: () => "everything.js",
			// },
      input: {
        index: resolve(__dirname, 'index.html'),
      }
		},
  },
  server: {
    port: 3001,
  }
});
