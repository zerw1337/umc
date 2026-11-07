const BASE = '/basic-pwa/';
const CACHE_NAME = 'my-pwa-v2';

const APP_SHELL = [
    BASE,
    BASE + 'index.html',
];

/* =====================================================================
 *  ЖУРНАЛ SERVICE WORKER
 *  SW не имеет доступа к DOM, поэтому журнал хранится в IndexedDB
 *  (память SW сбрасывается, когда браузер его "усыпляет"), а в страницу
 *  уходит через postMessage.
 * ===================================================================== */

const DB_NAME = 'sw-log-db';
const STORE = 'logs';
const MAX_LOGS = 500;

function openDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbAdd(entry) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const addReq = store.add(entry);

        // не даём журналу расти бесконечно: удаляем самые старые записи
        const countReq = store.count();
        countReq.onsuccess = () => {
            let extra = countReq.result - MAX_LOGS;
            if (extra > 0) {
                store.openCursor().onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor && extra-- > 0) {
                        cursor.delete();
                        cursor.continue();
                    }
                };
            }
        };

        tx.oncomplete = () => resolve(addReq.result);
        tx.onerror = () => reject(tx.error);
    });
}

async function dbGetAll() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbClear() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// Отправка сообщения всем открытым вкладкам приложения
async function broadcast(message) {
    const allClients = await self.clients.matchAll({ includeUncontrolled: true });
    allClients.forEach((client) => client.postMessage(message));
}

// Добавить запись в журнал: сохранить в IndexedDB и сразу показать открытым страницам
async function addLog(type, message, source = 'sw') {
    const entry = { time: new Date().toISOString(), source, type, message };
    try {
        entry.id = await dbAdd(entry);
        await broadcast({ type: 'LOG_ENTRY', entry });
    } catch (err) {
        console.error('SW: не удалось записать лог', err);
    }
}


/* =====================================================================
 *  ЖИЗНЕННЫЙ ЦИКЛ
 * ===================================================================== */

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            await addLog('install', 'Событие install: начало установки, кеширую App Shell');
            const cache = await caches.open(CACHE_NAME);
            await cache.addAll(APP_SHELL);
            await addLog('install', `Закешировано: ${APP_SHELL.join(', ')} (кеш "${CACHE_NAME}")`);
        })()
    );

    self.skipWaiting();
});


self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            await addLog('activate', 'Событие activate: SW активируется');
            const keys = await caches.keys();
            const old = keys.filter((key) => key !== CACHE_NAME);
            await Promise.all(old.map((key) => caches.delete(key)));
            if (old.length) {
                await addLog('activate', `Удалены старые кеши: ${old.join(', ')}`);
            }
            await self.clients.claim();
            await addLog('activate', 'clients.claim(): SW взял под контроль открытые страницы');
        })()
    );
});


/* =====================================================================
 *  СООБЩЕНИЯ ОТ СТРАНИЦЫ
 * ===================================================================== */

self.addEventListener('message', (event) => {
    const data = event.data || {};

    if (data.type === 'GET_LOGS') {
        // страница просит весь журнал -> отвечаем ей напрямую (event.source)
        event.waitUntil(
            dbGetAll().then((entries) => {
                event.source.postMessage({ type: 'LOGS_ALL', entries });
            })
        );
    }

    if (data.type === 'CLEAR_LOGS') {
        event.waitUntil(
            dbClear().then(() => broadcast({ type: 'LOGS_ALL', entries: [] }))
        );
    }

    if (data.type === 'CLIENT_LOG') {
        // события, которые видит только страница (регистрация и т.д.)
        event.waitUntil(addLog(data.logType || 'client', data.message, 'client'));
    }
});


/* =====================================================================
 *  FETCH
 * ===================================================================== */

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== 'GET' || url.origin !== self.location.origin) {
        addLog('fetch', `Пропущен (не GET или внешний ресурс): ${request.method} ${url.href}`);
        return;
    }


    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    addLog('fetch', `Навигация ${url.pathname}: ответ из СЕТИ (${response.status})`);
                    return response;
                })
                .catch(async () => {
                    addLog('fetch', `Навигация ${url.pathname}: сети нет, отдаю index.html из КЕША`);
                    return (
                        await caches.match(BASE + 'index.html')
                    ) || Response.error();
                })
        );
        return;
    }

    event.respondWith(
        caches.match(request).then(async (cachedResponse) => {
            if (cachedResponse) {
                addLog('fetch', `${url.pathname}: найден в КЕШЕ`);
                return cachedResponse;
            }

            const response = await fetch(request);

            if (response.ok) {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(request, response.clone());
                addLog('fetch', `${url.pathname}: загружен из СЕТИ (${response.status}) и добавлен в кеш`);
            } else {
                addLog('fetch', `${url.pathname}: ответ сети ${response.status}, в кеш не кладу`);
            }

            return response;
        })
    );
});
