# Плейлист (React + IndexedDB + Service Worker)

## Запуск
```
npm install
npm run build      # сборка в dist/ (в sw.js подставляется список файлов для офлайна)
npm run preview    # http://localhost:4173
```
Service Worker работает только на `localhost` или по HTTPS. Для проверки на телефоне выложите `dist/` на HTTPS-хостинг.
Сервер (`getcfg.php`, `get.php`) меняется в интерфейсе: «Сервер» под кнопкой «Загрузить плейлист».
Серверу нужны CORS-заголовки: `Access-Control-Allow-Origin` и `Access-Control-Allow-Headers: track_id`.

## База IndexedDB `playerDB` (DevTools → Application → IndexedDB)
- `contents` — `{id, title, loaded}` для каждого трека
- `tracks` — `{id, mp3}` (Blob), пишет сервис-воркер

## Что показать на защите
1. Первый запуск: в `contents` пусто → «Загрузить плейлист» → записи в `contents`, `tracks` очищена.
2. Кнопка-облако у трека → запрос с заголовком `track_id` (Network) → в `tracks` появляется `{id, mp3}`, значок меняется на play.
3. Play/пауза, ползунок позиции, автопереход по `ended`, управление с заблокированного экрана (Media Session).
4. Автономность: DevTools → Network → Offline (или авиарежим), перезагрузить страницу — приложение и треки работают.
   Важно: обычное обновление (F5); Ctrl+F5 обходит сервис-воркер.
