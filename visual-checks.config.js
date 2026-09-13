export default {
  baseURL: 'http://localhost:5173',
  // Все страницы из src/pages подключаются автоматически, кроме исключённых.
  excludePages: ['/main-2.html'],
  viewports: [
    { width: 414, height: 896 },
    { width: 1030, height: 900 },
    { width: 1500, height: 1080 },
    { width: 1940, height: 1080 }
  ],
  // Допуск различий цвета одного пикселя (0–1), а не доля пропускаемых изменений.
  threshold: 0.1,
  timeout: 30000
}
