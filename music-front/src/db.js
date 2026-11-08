// Работа с IndexedDB из основного потока.
// База playerDB, два хранилища:
//   contents — [{id, title, loaded}]  — состояние каждого трека плейлиста
//   tracks   — [{id, mp3}]            — сами mp3 (пишет сервис-воркер)

export const DB_NAME = 'playerDB';
export const DB_VERSION = 1;
const STORES = ['contents', 'tracks'];

export function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB не поддерживается браузером'));
      return;
    }
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
    req.onblocked = () => reject(new Error('Открытие базы заблокировано другой вкладкой'));
  });
}

// Выполняет транзакцию; work получает транзакцию и может вернуть запрос,
// результат которого станет значением промиса.
async function run(stores, mode, work) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let req;
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Транзакция прервана'));
      req = work(tx);
    });
  } finally {
    db.close();
  }
}

export async function readContents() {
  const items = await run('contents', 'readonly', (tx) => tx.objectStore('contents').getAll());
  return (items || []).sort((a, b) => a.id - b.id);
}

// Новый плейлист: заменяет contents и удаляет все сохранённые треки из tracks.
export function replacePlaylist(items) {
  return run(['contents', 'tracks'], 'readwrite', (tx) => {
    const contents = tx.objectStore('contents');
    contents.clear();
    tx.objectStore('tracks').clear();
    for (const item of items) contents.put(item);
  });
}

export function setLoaded(id, loaded) {
  return run('contents', 'readwrite', (tx) => {
    const store = tx.objectStore('contents');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) store.put({ ...getReq.result, loaded });
    };
  });
}
