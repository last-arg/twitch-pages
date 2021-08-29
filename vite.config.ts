import { resolve } from "path"
import { defineConfig } from "vite";
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [viteCompression()],

  // resolve: {
  //   alias: {
  //     'htmx.org': resolve(__dirname, 'node_modules/htmx.org/dist/htmx.js')
  //   }
  // },
  build: {
    target: "esnext",
    polyfillDynamicImport: false,
		rollupOptions: {
			inlineDynamicImports: true,
			// output: {
			// 	manualChunks: () => "everything.js",
			// },
      input: {
        main: resolve(__dirname, 'index.html'),
        index: resolve(__dirname, 'index/index.html'),
        category: resolve(__dirname, 'category/index.html'),
      }
		},
  },
  server: {
    port: 3001,
  }
});
