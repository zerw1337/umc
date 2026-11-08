/* Сервис-воркер: офлайн-оболочка, загрузка mp3 в IndexedDB и выдача треков из неё. */

const BUILD = 'BUILD_VERSION';
const CACHE = `app-shell-${BUILD}`;
// Список файлов подставляется при сборке (vite.config.js). В dev-режиме он пуст,
// и кэширование оболочки отключено, чтобы не мешать HMR.
const PRECACHE = /*PRECACHE_LIST*/[];

const DB_NAME = 'playerDB';
const DB_VERSION = 1;
const STORES = ['contents', 'tracks'];

/* ---------- IndexedDB ---------- */

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

async function putTrack(id, mp3) {
  const db = await openDB();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('tracks', 'readwrite');
      tx.objectStore('tracks').put({ id, mp3 });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function getTrack(id) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction('tracks', 'readonly').objectStore('tracks').get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/* ---------- Жизненный цикл ---------- */

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      if (PRECACHE.length) {
        const cache = await caches.open(CACHE);
        const scope = self.registration.scope;
        await cache.addAll(
          PRECACHE.map((p) => new Request(new URL(p, scope).href, { cache: 'reload' })),
        );
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

/* ---------- Обработчики запросов ---------- */

const text = (body, status = 200) =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });

// Запрос mp3 с заголовком track_id: скачать, положить в tracks, ответить текстом.
async function downloadTrack(request) {
  const id = Number(request.headers.get('track_id'));
  if (!Number.isFinite(id)) return text('download failed: bad track_id header', 400);
  try {
    const res = await fetch(request);
    if (!res.ok) return text(`download failed: server answered HTTP ${res.status}`, 502);
    const blob = await res.blob();
    if (blob.size === 0) return text('download failed: server returned an empty file', 502);
    if (/html|json/i.test(blob.type)) {
      return text(`download failed: server returned ${blob.type} instead of audio`, 502);
    }
    const mp3 = new Blob([blob], { type: blob.type || 'audio/mpeg' });
    await putTrack(id, mp3);
    return text(`track is saved in db with id=${id}`);
  } catch (err) {
    return text(`download failed: ${err && err.message ? err.message : err}`, 502);
  }
}

// Запрос `${id}.mp3`: отдать сохранённый трек из tracks.
async function serveTrack(id) {
  try {
    const rec = await getTrack(id);
    if (!rec || !rec.mp3) return text(`track with id=${id} is not found in db`, 404);
    return new Response(rec.mp3, {
      status: 200,
      headers: { 'Content-Type': rec.mp3.type || 'audio/mpeg' },
    });
  } catch (err) {
    return text(`db error: ${err && err.message ? err.message : err}`, 500);
  }
}

// Оболочка приложения: сначала кэш, потом сеть; при отсутствии сети — index.html.
async function appShell(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok && res.type === 'basic') cache.put(request, res.clone());
    return res;
  } catch (err) {
    if (request.mode === 'navigate') {
      const scope = self.registration.scope;
      const fallback =
        (await cache.match(new URL('index.html', scope).href)) ||
        (await cache.match(new URL('./', scope).href));
      if (fallback) return fallback;
    }
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.headers.has('track_id')) {
    event.respondWith(downloadTrack(request));
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== 'GET') return;

  const m = url.pathname.match(/\/(\d+)\.mp3$/);
  if (m) {
    event.respondWith(serveTrack(Number(m[1])));
    return;
  }

  if (PRECACHE.length) event.respondWith(appShell(request));
});
