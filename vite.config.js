import path, { resolve } from 'node:path'
import url from 'node:url'
import { defineConfig } from 'vite'
import viteMultipage from 'vite-plugin-multipage'
import vitePug from 'vite-plugin-pug-transformer'
import viteEslint from 'vite-plugin-eslint'
import viteStylelint from 'vite-plugin-stylelint'
import viteSassGlob from 'vite-plugin-sass-glob-import'
import viteImagemin from 'vite-plugin-imagemin'

const root = resolve(path.dirname(url.fileURLToPath(import.meta.url)), 'src')
const outDir = resolve(path.dirname(url.fileURLToPath(import.meta.url)), 'dist')

export default defineConfig({
  root,
  base: './',
  clearScreen: false,
  css: {
    preprocessorOptions: {
      scss: {
        // Temporary: the project still relies on Sass @import and Vite 4's legacy API.
        silenceDeprecations: ['import', 'legacy-js-api']
      }
    }
  },
  build: {
    outDir,
    emptyOutDir: true,
    chunkSizeWarningLimit: '1024',
    modulePreload: false,
    polyfillModulePreload: false,
    cssMinify: false,
    minify: false,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          let extType = assetInfo.name.split('.')[1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = 'images'
          } else if (extType === 'css') {
            extType = 'styles'
          }
          return `${extType}/[name][extname]`
        },
        chunkFileNames: 'scripts/scripts.js'
      }
    }
  },
  plugins: [
    viteMultipage({
      mimeCheck: true,
      open: '/',
      pageDir: 'pages',
      purgeDir: 'pages',
      removePageDirs: true,
      rootPage: 'index.html'
    }),
    vitePug({
      pugOptions: {
        pretty: true
      }
    }),
    viteEslint({
      failOnError: false
    }),
    viteStylelint(),
    viteSassGlob(),
    viteImagemin({
      gifsicle: {
        optimizationLevel: 7,
        interlaced: false
      },
      mozjpeg: {
        quality: 75
      },
      pngquant: {
        quality: [0.7, 0.7],
        speed: 4
      },
      svgo: {
        plugins: [
          {
            name: 'removeViewBox'
          },
          {
            name: 'removeEmptyAttrs',
            active: false
          }
        ]
      }
    })
  ]
})
