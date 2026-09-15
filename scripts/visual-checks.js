import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import config from '../visual-checks.config.js'

const root = fileURLToPath(new URL('../.visual-checks/', import.meta.url))
const mode = process.argv[2]
const baseURL = process.env.SCREENS_BASE_URL || config.baseURL
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])

async function prepare(page) {
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; } *, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }' })
  await page.evaluate(async () => {
    await document.fonts.ready
    // Прокрутка запускает ленивую загрузку и IntersectionObserver.
    for (let y = 0, steps = 0; y < document.documentElement.scrollHeight && steps < 100; y += window.innerHeight, steps++) {
      window.scrollTo(0, y)
      await new Promise(resolve => setTimeout(resolve, 40))
    }
    window.scrollTo(0, 0)
    for (const element of document.querySelectorAll('.swiper')) {
      element.swiper?.autoplay?.stop()
      element.swiper?.slideTo(0, 0)
    }
    for (const video of document.querySelectorAll('video')) {
      video.pause()
      video.currentTime = 0
    }
  })
  await page.waitForFunction(() => [...document.querySelectorAll('video')].every(video => !video.currentSrc || (video.readyState >= 2 && !video.seeking)))
  await page.waitForFunction(() => [...document.images].every(img => img.complete))
  const broken = await page.evaluate(() => [...document.images].filter(img => img.currentSrc && !img.naturalWidth).map(img => img.currentSrc))
  if (broken.length) throw new Error(`Не загрузились изображения: ${broken.join(', ')}`)
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].filter(img => img.currentSrc).map(img => img.decode()))
  })
}

async function capture(browser, entry, directory) {
  const context = await browser.newContext({
    viewport: entry.viewport, deviceScaleFactor: 1,
    locale: 'ru-RU', timezoneId: 'Europe/Moscow', colorScheme: 'light', reducedMotion: 'reduce'
  })
  try {
    const page = await context.newPage()
    page.setDefaultTimeout(config.timeout)
    const response = await page.goto(new URL(entry.url, baseURL).href, { waitUntil: 'networkidle' })
    if (!response?.ok()) throw new Error(`HTTP ${response?.status()} для ${entry.url}`)
    if (await page.locator('vite-error-overlay').count()) throw new Error('Vite показывает ошибку сборки страницы')
    await prepare(page)
    // Два одинаковых кадра подряд защищают от съёмки в момент изменения страницы.
    let previous
    for (let attempt = 0; attempt < 6; attempt++) {
      const current = await page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide', timeout: config.timeout })
      if (previous?.equals(current)) {
        await fs.writeFile(path.join(directory, entry.file), current)
        return
      }
      previous = current
      await page.waitForTimeout(200)
    }
    throw new Error('Страница продолжает меняться: не удалось получить два одинаковых кадра')
  } finally {
    await context.close()
  }
}

async function compare(entry, directory) {
  const before = PNG.sync.read(await fs.readFile(path.join(root, 'before', entry.file)))
  const after = PNG.sync.read(await fs.readFile(path.join(directory, entry.file)))
  const width = Math.max(before.width, after.width)
  const height = Math.max(before.height, after.height)
  const pad = source => {
    const target = new PNG({ width, height })
    target.data.fill(255)
    PNG.bitblt(source, target, 0, 0, source.width, source.height, 0, 0)
    return target
  }
  const diff = new PNG({ width, height })
  let pixels = pixelmatch(pad(before).data, pad(after).data, diff.data, width, height, { threshold: config.threshold })
  // Подсвечиваем также добавленную/исчезнувшую область, даже если она белая.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((x < before.width && y < before.height) !== (x < after.width && y < after.height)) {
        const offset = (y * width + x) * 4
        if (!(diff.data[offset] === 255 && diff.data[offset + 1] === 0 && diff.data[offset + 2] === 0)) pixels++
        diff.data.set([255, 0, 0, 255], offset)
      }
    }
  }
  const changed = pixels > 0 || before.width !== after.width || before.height !== after.height
  await fs.writeFile(path.join(root, 'diff', entry.file), PNG.sync.write(diff))
  return { ...entry, changed, pixels, percent: (pixels / (width * height) * 100).toFixed(3), beforeSize: `${before.width} × ${before.height}`, afterSize: `${after.width} × ${after.height}` }
}

function report(results, baseline) {
  const changed = results.filter(item => item.changed).length
  const errors = results.filter(item => item.error).length
  return `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Сравнение страниц</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:32px;color:#182238;background:#f4f6fa}h1{margin-bottom:8px}a{color:#2058b5}nav{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}details{background:white;border:1px solid #ccd3df;border-radius:8px;margin:16px 0;padding:16px}summary{cursor:pointer;font-weight:600}.images{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:16px}figure{margin:0;min-width:0}img{display:block;width:100%;height:auto;border:1px solid #ddd}figcaption{margin-bottom:8px}.error{color:#b42318}small{color:#526079}@media(max-width:700px){body{margin:12px}.images{grid-template-columns:1fr}}</style>
<h1>Сравнение страниц</h1><p>Изменились: ${changed} · Без изменений: ${results.length - changed - errors} · Ошибки: ${errors}</p>
<small>До: ${escapeHTML(baseline.createdAt)} · После: ${escapeHTML(new Date().toISOString())}<br>${escapeHTML(baseURL)} · Chromium ${escapeHTML(baseline.browserVersion)}<br>Красным выделены отличия. Нажмите на изображение для полного размера.</small>
<nav>${results.map((item, index) => `<a href="#result-${index}">${escapeHTML(item.url)} · ${item.viewport.width}: ${item.error ? 'ошибка' : item.changed ? 'изменения' : 'без изменений'}</a>`).join('')}</nav>
${results.map((item, index) => `<details id="result-${index}" ${item.changed || item.error ? 'open' : ''}><summary>${escapeHTML(item.url)} — ${item.viewport.width} × ${item.viewport.height} — ${item.error ? 'Ошибка' : item.changed ? `Изменения: ${item.percent}% (${item.pixels} пикс.)` : 'Без изменений'}</summary>${item.error ? `<p class="error">${escapeHTML(item.error)}</p>` : `<p>Размер снимка: ${item.beforeSize} → ${item.afterSize}</p><div class="images">${[['before', 'До'], ['after', 'После'], ['diff', 'Отличия']].map(([folder, label]) => `<figure><figcaption>${label}</figcaption><a href="${folder}/${item.file}" target="_blank" rel="noopener"><img loading="lazy" src="${folder}/${item.file}" alt="${label}: ${escapeHTML(item.url)}"></a></figure>`).join('')}</div>`}</details>`).join('')}</html>`
}

async function openReport(filename) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer.exe' : 'xdg-open'
  await new Promise(resolve => {
    const child = spawn(command, [filename], { stdio: 'ignore' })
    child.on('error', () => { console.log(`Откройте отчёт вручную: ${filename}`); resolve() })
    child.on('exit', code => { if (code) console.log(`Откройте отчёт вручную: ${filename}`); resolve() })
  })
}

async function main() {
  if (!['before', 'compare'].includes(mode)) throw new Error('Используйте yarn screens:before или yarn screens:compare')
  const pageDirectories = await fs.readdir(new URL('../src/pages/', import.meta.url), { withFileTypes: true })
  const pages = pageDirectories
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => `/${entry.name}.html`)
    .filter(url => !(config.excludePages || []).includes(url))
    .sort()
  const entries = pages.flatMap((url, index) => config.viewports.map(viewport => ({ url, viewport, file: `${index + 1}-${viewport.width}x${viewport.height}.png` })))
  if (!entries.length || new Set(entries.map(entry => entry.file)).size !== entries.length) throw new Error('Нужны страницы в src/pages, не попавшие в excludePages, и уникальные размеры в visual-checks.config.js')
  const signature = JSON.stringify({ baseURL, entries })
  let baseline
  if (mode === 'compare') {
    try { baseline = JSON.parse(await fs.readFile(path.join(root, 'before/manifest.json'), 'utf8')) } catch { throw new Error('Нет исходных снимков. Сначала запустите yarn screens:before') }
    if (baseline.signature !== signature) throw new Error('Адрес, страницы или размеры изменились. Снимите новое исходное состояние: yarn screens:before')
  }
  try { await fetch(baseURL, { signal: AbortSignal.timeout(5000) }) } catch { throw new Error(`Сайт недоступен: ${baseURL}. Запустите yarn dev. Для другого порта задайте SCREENS_BASE_URL`) }
  await fs.mkdir(root, { recursive: true })
  let lock
  try { lock = await fs.open(path.join(root, '.lock'), 'wx') } catch { throw new Error('Другая проверка уже запущена. Если она аварийно завершилась, удалите .visual-checks/.lock') }
  let browser
  try {
    browser = await chromium.launch({ channel: 'chromium' })
    if (baseline && baseline.browserVersion !== browser.version()) throw new Error('Версия Chromium изменилась. Снимите новое исходное состояние: yarn screens:before')
    const directory = path.join(root, mode === 'before' ? 'before-pending' : 'after')
    await fs.rm(directory, { recursive: true, force: true })
    await fs.mkdir(directory, { recursive: true })
    if (mode === 'compare') {
      await fs.rm(path.join(root, 'diff'), { recursive: true, force: true })
      await fs.mkdir(path.join(root, 'diff'))
    }
    const results = []
    for (const entry of entries) {
      process.stdout.write(`${entry.url} · ${entry.viewport.width} × ${entry.viewport.height} … `)
      try {
        await capture(browser, entry, directory)
        let result = mode === 'compare' ? await compare(entry, directory) : entry
        // Повторная съёмка в свежем контексте отсеивает разовые артефакты растрирования.
        if (result.changed) {
          await capture(browser, entry, directory)
          result = await compare(entry, directory)
        }
        results.push(result)
        console.log(mode === 'before' ? 'сохранено' : result.changed ? `изменения: ${result.pixels} пикс. (${result.percent}%)` : 'без изменений')
      } catch (error) {
        console.log(`ОШИБКА: ${error.message}`)
        results.push({ ...entry, error: error.message })
      }
    }
    const errors = results.filter(item => item.error)
    if (mode === 'before') {
      if (errors.length) throw new Error(`Не удалось снять ${errors.length} вариантов. Предыдущее исходное состояние сохранено`)
      await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify({ signature, createdAt: new Date().toISOString(), browserVersion: browser.version() }, null, 2))
      await fs.rm(path.join(root, 'before'), { recursive: true, force: true })
      await fs.rename(directory, path.join(root, 'before'))
      await fs.rm(path.join(root, 'report.html'), { force: true })
      console.log(`Готово: ${entries.length} исходных снимков в .visual-checks/before/`)
    } else {
      const filename = path.join(root, 'report.html')
      await fs.writeFile(filename, report(results, baseline))
      console.log(`Отчёт: ${filename}`)
      if (!process.argv.includes('--no-open')) await openReport(filename)
      if (errors.length) process.exitCode = 1
    }
  } finally {
    try { await browser?.close() } finally {
      await lock.close()
      await fs.rm(path.join(root, '.lock'), { force: true })
    }
  }
}

main().catch(error => { console.error(`\n${error.message}`); process.exitCode = 1 })
