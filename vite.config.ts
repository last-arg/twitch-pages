import Unocss from "unocss/vite";
import { presetUno } from 'unocss'
import { resolve } from "path";
import { defineConfig } from "vite";

const configFile = process.env.NODE_ENV === "production" ? "config.prod.js" : "config.prod.js"
export default defineConfig({
  plugins: [
    // Unocss({
    //   mode: 'global',
    //   presets: [ presetUno() ],
    //   include: [
    //     "**/*"
    //   ],
    // })
  ],
  resolve: {
    alias: {
      'config': resolve(__dirname, `src/${configFile}`),
      // 'htmx.org': resolve(__dirname, 'node_modules/htmx.org/dist/htmx.js'),
    }
  },
  base: "/",
  build: {
    target: "esnext",
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8888/.netlify/functions',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  }
});
