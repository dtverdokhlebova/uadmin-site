import path, { resolve } from 'node:path'
import url from 'node:url'
import fs from 'node:fs'
import { defineConfig } from 'vite'
import viteMultipage from 'vite-plugin-multipage'
import vitePug from 'vite-plugin-pug-transformer'
import viteEslint from 'vite-plugin-eslint'
import viteStylelint from 'vite-plugin-stylelint'
import viteSassGlob from 'vite-plugin-sass-glob-import'

const projectRoot = path.dirname(url.fileURLToPath(import.meta.url))
const root = resolve(projectRoot, 'src')
const outDir = resolve(projectRoot, 'dist')
const sourceJavaScriptPath = resolve(root, 'js/index.js')

const preserveSourceJavaScript = () => ({
  name: 'preserve-source-javascript',
  enforce: 'post',
  generateBundle(_options, bundle) {
    const scriptChunk = bundle['scripts/scripts.js']

    if (!scriptChunk || scriptChunk.type !== 'chunk') {
      throw new Error('JavaScript entry chunk was not found')
    }

    scriptChunk.code = fs.readFileSync(sourceJavaScriptPath, 'utf8')
  }
})

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
    preserveSourceJavaScript()
  ]
})
