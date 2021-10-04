import { resolve } from "path"
import { defineConfig } from "vite";
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [],

  // resolve: {
  //   alias: {
  //     'htmx.org': resolve(__dirname, 'node_modules/htmx.org/dist/htmx.js')
  //   }
  // },
  base: "/twitch-pages/",
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
