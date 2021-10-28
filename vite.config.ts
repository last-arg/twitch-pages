import { resolve } from "path"
import { defineConfig } from "vite";
// import viteCompression from 'vite-plugin-compression';

const configFile = process.env.NODE_ENV === "production" ? "config.prod.ts" : "config.prod.ts"
export default defineConfig({
  plugins: [],

  resolve: {
    alias: {
      'config': resolve(__dirname, `src/${configFile}`)
      // 'htmx.org': resolve(__dirname, 'node_modules/htmx.org/dist/htmx.js')
    }
  },
  base: "/twitch-pages/",
  build: {
    target: "esnext",
  },
  server: {
    port: 3001,
  }
});
