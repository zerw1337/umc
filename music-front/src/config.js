// Адрес сервера можно поменять прямо в интерфейсе (хранится в localStorage).
export const DEFAULT_SERVER = 'http://5.nikpv.z8.ru/MobileDeviceOS';
const KEY = 'server-base';

export function loadServer() {
  try {
    return localStorage.getItem(KEY) || DEFAULT_SERVER;
  } catch {
    return DEFAULT_SERVER;
  }
}

export function saveServer(value) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* localStorage может быть недоступен */
  }
}

const base = (server) => server.trim().replace(/\/+$/, '');

export const cfgUrl = (server) => `${base(server)}/getcfg.php`;

// Шаблон из задания: .../get.php?url=${title}.mp3
export const trackUrl = (server, title) =>
  `${base(server)}/get.php?url=${encodeURIComponent(title)}.mp3`;
