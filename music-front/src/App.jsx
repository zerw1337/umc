import { useCallback, useEffect, useRef, useState } from 'react';
import { readContents, replacePlaylist, setLoaded } from './db';
import { cfgUrl, loadServer, saveServer, trackUrl } from './config';

const fmt = (s) => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const pretty = (title) =>
  title.replace(/[-_]+/g, ' ').replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase());

const explain = (e) =>
  e instanceof TypeError
    ? 'сеть недоступна или сервер не разрешил запрос (CORS)'
    : e?.message || String(e);

const LOG_ICON = {
  success: 'fa-circle-check',
  error: 'fa-circle-exclamation',
  info: 'fa-circle-info',
};

function setMediaMetadata(title) {
  if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
  const icon = (file, sizes) => ({
    src: new URL(`icons/${file}`, document.baseURI).href,
    sizes,
    type: 'image/png',
  });
  navigator.mediaSession.metadata = new MediaMetadata({
    title: pretty(title),
    artist: 'Плейлист',
    album: 'Офлайн-плейлист',
    artwork: [icon('icon-192.png', '192x192'), icon('icon-512.png', '512x512')],
  });
}

export default function App() {
  const [tracks, setTracks] = useState([]);
  const [server, setServer] = useState(loadServer);
  const [log, setLog] = useState([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [loadingList, setLoadingList] = useState(false);
  const [downloading, setDownloading] = useState({});
  const [currentId, setCurrentId] = useState(null);
  const [preparingId, setPreparingId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(null);
  const urlRef = useRef(null);
  const tracksRef = useRef([]);
  const currentIdRef = useRef(null);
  const pendingPlayRef = useRef(false);
  const keyRef = useRef(0);
  const actionsRef = useRef({});
  tracksRef.current = tracks;

  const notify = useCallback((type, text) => {
    const time = new Date().toLocaleTimeString('ru-RU');
    setLog((prev) => [{ key: ++keyRef.current, type, text, time }, ...prev].slice(0, 40));
  }, []);

  /* ---------- Старт: чтение плейлиста из IndexedDB (objectStore contents) ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const items = await readContents();
        if (!alive) return;
        setTracks(items);
        if (items.length) {
          const n = items.filter((t) => t.loaded).length;
          notify('success', `Плейлист прочитан из IndexedDB: ${items.length} треков, загружено ${n}`);
        } else {
          notify('info', 'Плейлист в базе отсутствует — нажмите «Загрузить плейлист»');
        }
      } catch (e) {
        if (alive) notify('error', `Ошибка чтения IndexedDB: ${explain(e)}`);
      }
    })();
    // Просим браузер не вытеснять сохранённые mp3 при нехватке места.
    navigator.storage?.persist?.().catch(() => {});
    return () => {
      alive = false;
    };
  }, [notify]);

  /* ---------- Сеть и сервис-воркер ---------- */
  useEffect(() => {
    const on = () => {
      setOnline(true);
      notify('info', 'Соединение восстановлено');
    };
    const off = () => {
      setOnline(false);
      notify('info', 'Сети нет — приложение работает автономно');
    };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() =>
        notify('success', 'Сервис-воркер активен: приложение доступно без сети'),
      );
    } else {
      notify('error', 'Service Worker недоступен (нужен HTTPS или localhost)');
    }
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [notify]);

  /* ---------- Аудио-элемент и Media Session ---------- */
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;
    const ms = 'mediaSession' in navigator ? navigator.mediaSession : null;

    const syncPosition = () => {
      if (!ms || !Number.isFinite(audio.duration) || !audio.duration) return;
      try {
        ms.setPositionState({
          duration: audio.duration,
          position: Math.min(audio.currentTime, audio.duration),
          playbackRate: audio.playbackRate || 1,
        });
      } catch {
        /* некоторые браузеры не поддерживают setPositionState */
      }
    };

    const titleNow = () => {
      const t = tracksRef.current.find((x) => x.id === currentIdRef.current);
      return t ? pretty(t.title) : '';
    };

    const handlers = {
      // Трек можно проигрывать без остановок — запускаем воспроизведение.
      canplaythrough: () => {
        setPreparingId(null);
        if (!pendingPlayRef.current) return;
        pendingPlayRef.current = false;
        audio
          .play()
          .then(() => notify('success', `Воспроизведение: ${titleNow()}`))
          .catch((e) => notify('error', `Не удалось начать воспроизведение: ${explain(e)}`));
      },
      timeupdate: () => {
        setPosition(audio.currentTime);
        syncPosition();
      },
      loadedmetadata: () => {
        setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
        syncPosition();
      },
      durationchange: () => {
        setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
        syncPosition();
      },
      play: () => {
        setIsPlaying(true);
        if (ms) ms.playbackState = 'playing';
      },
      pause: () => {
        setIsPlaying(false);
        if (ms) ms.playbackState = 'paused';
      },
      // Трек закончился — переходим к следующему загруженному.
      ended: () => {
        setIsPlaying(false);
        notify('info', `Трек закончился: ${titleNow()}`);
        actionsRef.current.next(true);
      },
      error: () => {
        if (!audio.getAttribute('src')) return;
        pendingPlayRef.current = false;
        setPreparingId(null);
        setIsPlaying(false);
        const codes = {
          1: 'загрузка прервана',
          2: 'сетевая ошибка',
          3: 'ошибка декодирования',
          4: 'формат не поддерживается',
        };
        notify('error', `Ошибка аудио: ${codes[audio.error?.code] || 'неизвестная ошибка'}`);
      },
    };
    Object.entries(handlers).forEach(([name, h]) => audio.addEventListener(name, h));

    // Управление с заблокированного экрана / медиа-клавиш / уведомления.
    const mediaActions = {
      play: () => actionsRef.current.resume(),
      pause: () => actionsRef.current.pause(),
      previoustrack: () => actionsRef.current.prev(),
      nexttrack: () => actionsRef.current.next(false),
      seekbackward: (d) => {
        audio.currentTime = Math.max(0, audio.currentTime - (d?.seekOffset || 10));
      },
      seekforward: (d) => {
        audio.currentTime = Math.min(
          audio.duration || Infinity,
          audio.currentTime + (d?.seekOffset || 10),
        );
      },
      seekto: (d) => {
        if (d.fastSeek && 'fastSeek' in audio) audio.fastSeek(d.seekTime);
        else audio.currentTime = d.seekTime;
        syncPosition();
      },
      stop: () => actionsRef.current.pause(),
    };
    if (ms) {
      for (const [action, fn] of Object.entries(mediaActions)) {
        try {
          ms.setActionHandler(action, fn);
        } catch {
          /* действие не поддерживается этим браузером */
        }
      }
    }

    return () => {
      Object.entries(handlers).forEach(([name, h]) => audio.removeEventListener(name, h));
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      if (ms) {
        for (const action of Object.keys(mediaActions)) {
          try {
            ms.setActionHandler(action, null);
          } catch {
            /* ignore */
          }
        }
      }
    };
  }, [notify]);

  /* ---------- Воспроизведение ---------- */

  const swReady = () => {
    if (!('serviceWorker' in navigator)) {
      notify('error', 'Service Worker недоступен (нужен HTTPS или localhost)');
      return false;
    }
    if (!navigator.serviceWorker.controller) {
      notify(
        'error',
        'Сервис-воркер ещё не управляет страницей — обновите страницу (F5, не Ctrl+F5) и повторите',
      );
      return false;
    }
    return true;
  };

  // Останавливает аудио и освобождает blob-URL (URL.revokeObjectURL).
  const releaseAudio = () => {
    const audio = audioRef.current;
    pendingPlayRef.current = false;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  };

  const stopPlayback = () => {
    releaseAudio();
    currentIdRef.current = null;
    setCurrentId(null);
    setPreparingId(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    }
  };

  const startTrack = async (id) => {
    const track = tracksRef.current.find((t) => t.id === id);
    if (!track) return;
    if (!track.loaded) {
      notify('error', `Трек «${pretty(track.title)}» ещё не загружен`);
      return;
    }
    if (!swReady()) return;

    releaseAudio();
    currentIdRef.current = id;
    setCurrentId(id);
    setPreparingId(id);
    setPosition(0);
    setDuration(0);
    setIsPlaying(false);

    try {
      // Запрос `${id}.mp3` перехватывает сервис-воркер и отвечает файлом из tracks.
      const res = await fetch(`${id}.mp3`);
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      const blob = await res.blob();
      if (!/audio|octet-stream/i.test(blob.type)) {
        throw new Error('сервис-воркер не вернул аудио (страница открыта в обход воркера?)');
      }
      if (currentIdRef.current !== id) return; // пользователь уже выбрал другой трек

      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      pendingPlayRef.current = true;
      audioRef.current.src = url;
      setMediaMetadata(track.title);
      notify('info', `Трек «${pretty(track.title)}» получен из базы, готовим воспроизведение…`);
    } catch (e) {
      if (currentIdRef.current === id) {
        setPreparingId(null);
        notify('error', `Не удалось прочитать трек «${pretty(track.title)}» из базы: ${explain(e)}`);
      }
    }
  };

  const pause = () => {
    const audio = audioRef.current;
    if (!audio.getAttribute('src')) return;
    audio.pause();
    notify('info', 'Пауза');
  };

  const resume = () => {
    const audio = audioRef.current;
    if (!audio.getAttribute('src')) {
      const first = tracksRef.current.find((t) => t.loaded);
      if (first) startTrack(first.id);
      else notify('error', 'Нет загруженных треков для воспроизведения');
      return;
    }
    audio
      .play()
      .then(() => notify('success', 'Воспроизведение продолжено'))
      .catch((e) => notify('error', `Не удалось продолжить воспроизведение: ${explain(e)}`));
  };

  // Следующий/предыдущий загруженный трек (по кругу).
  const go = (dir, auto) => {
    const audio = audioRef.current;
    if (dir < 0 && !auto && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const list = tracksRef.current;
    const n = list.length;
    const idx = list.findIndex((t) => t.id === currentIdRef.current);
    const limit = idx === -1 ? n : n - 1;
    for (let step = 1; step <= limit; step++) {
      const t = list[(((idx + dir * step) % n) + n) % n];
      if (t.loaded) {
        startTrack(t.id);
        return;
      }
    }
    if (auto) notify('info', 'Больше нет загруженных треков — воспроизведение остановлено');
    else notify('error', 'Нет другого загруженного трека');
  };

  actionsRef.current = { pause, resume, prev: () => go(-1, false), next: (auto) => go(1, auto) };

  /* ---------- Плейлист и загрузка треков ---------- */

  const loadPlaylist = async () => {
    setLoadingList(true);
    try {
      const res = await fetch(cfgUrl(server), { cache: 'no-store' });
      if (!res.ok) throw new Error(`сервер ответил HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !Array.isArray(data.root)) {
        throw new Error('в JSON нет массива root');
      }
      const items = data.root.map((title, i) => ({ id: i + 1, title: String(title), loaded: false }));
      stopPlayback();
      await replacePlaylist(items); // contents заменяется, tracks очищается
      setTracks(items);
      notify(
        'success',
        `Плейлист загружен и сохранён в базе: ${items.length} треков; ранее загруженные mp3 удалены`,
      );
    } catch (e) {
      notify('error', `Не удалось загрузить плейлист: ${explain(e)}`);
    } finally {
      setLoadingList(false);
    }
  };

  const downloadTrack = async (track) => {
    if (!swReady()) return;
    setDownloading((d) => ({ ...d, [track.id]: true }));
    try {
      // Запрос уходит с нестандартным заголовком track_id; его перехватывает сервис-воркер.
      const res = await fetch(trackUrl(server, track.title), {
        headers: { track_id: String(track.id) },
      });
      const msg = await res.text();
      if (!res.ok || !msg.startsWith('track is saved in db')) {
        throw new Error(msg.slice(0, 200) || `HTTP ${res.status}`);
      }
      await setLoaded(track.id, true);
      setTracks((prev) => prev.map((t) => (t.id === track.id ? { ...t, loaded: true } : t)));
      notify('success', `«${pretty(track.title)}»: ${msg}`);
    } catch (e) {
      notify('error', `Не удалось загрузить «${pretty(track.title)}»: ${explain(e)}`);
    } finally {
      setDownloading((d) => {
        const { [track.id]: _removed, ...rest } = d;
        return rest;
      });
    }
  };

  const onTrackButton = (track) => {
    if (!track.loaded) return downloadTrack(track);
    const audio = audioRef.current;
    if (currentIdRef.current === track.id && audio.getAttribute('src')) {
      return audio.paused ? resume() : pause();
    }
    return startTrack(track.id);
  };

  const onSeek = (e) => {
    const value = Number(e.target.value);
    audioRef.current.currentTime = value;
    setPosition(value);
  };

  const buttonIcon = (t) => {
    if (downloading[t.id] || preparingId === t.id) return 'fa-spinner fa-spin';
    if (!t.loaded) return 'fa-cloud-arrow-down';
    return currentId === t.id && isPlaying ? 'fa-pause' : 'fa-play';
  };

  const buttonLabel = (t) => {
    if (downloading[t.id]) return 'Загрузка…';
    if (!t.loaded) return 'Загрузить';
    return currentId === t.id && isPlaying ? 'Пауза' : 'Воспроизвести';
  };

  const current = tracks.find((t) => t.id === currentId);
  const anyLoaded = tracks.some((t) => t.loaded);

  return (
    <div className="app">
      <header className="top">
        <h1>
          <i className="fa-solid fa-music" /> Плейлист
        </h1>
        <span className={`net ${online ? 'on' : 'off'}`}>
          <span className="dot" /> {online ? 'онлайн' : 'офлайн'}
        </span>
      </header>

      <section className="toolbar">
        <button className="btn primary" onClick={loadPlaylist} disabled={loadingList}>
          <i className={`fa-solid ${loadingList ? 'fa-spinner fa-spin' : 'fa-rotate'}`} />
          Загрузить плейлист
        </button>
        <details className="server">
          <summary>Сервер</summary>
          <input
            type="url"
            value={server}
            onChange={(e) => setServer(e.target.value)}
            onBlur={() => saveServer(server)}
            aria-label="Адрес сервера"
            spellCheck="false"
          />
        </details>
      </section>

      <ul className="log" aria-live="polite" aria-label="Сообщения">
        {log.map((m) => (
          <li key={m.key} className={m.type}>
            <i className={`fa-solid ${LOG_ICON[m.type]}`} />
            <span className="msg">{m.text}</span>
            <time>{m.time}</time>
          </li>
        ))}
      </ul>

      {tracks.length ? (
        <ul className="tracks">
          {tracks.map((t) => (
            <li key={t.id} className={currentId === t.id ? 'active' : ''}>
              <span className="num">{t.id}</span>
              <div className="info">
                <span className="title">{pretty(t.title)}</span>
                <span className={`state ${t.loaded ? 'ok' : ''}`}>
                  {t.loaded ? 'сохранён в базе' : 'не загружен'}
                </span>
              </div>
              <button
                className={`round ${t.loaded ? 'accent' : ''}`}
                onClick={() => onTrackButton(t)}
                disabled={!!downloading[t.id] || preparingId === t.id}
                aria-label={`${buttonLabel(t)}: ${pretty(t.title)}`}
                title={buttonLabel(t)}
              >
                <i className={`fa-solid ${buttonIcon(t)}`} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">Плейлист пуст. Загрузите его с сервера.</p>
      )}

      <footer className="player">
        <div className="now">{current ? pretty(current.title) : 'Трек не выбран'}</div>
        <div className="seek">
          <span>{fmt(position)}</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(position, duration || 0)}
            onChange={onSeek}
            disabled={!duration}
            aria-label="Позиция в треке"
          />
          <span>{fmt(duration)}</span>
        </div>
        <div className="controls">
          <button
            className="round"
            onClick={() => actionsRef.current.prev()}
            disabled={!anyLoaded}
            aria-label="Предыдущий трек"
          >
            <i className="fa-solid fa-backward-step" />
          </button>
          <button
            className="round big accent"
            onClick={() => (isPlaying ? pause() : resume())}
            disabled={!anyLoaded}
            aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
          >
            <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`} />
          </button>
          <button
            className="round"
            onClick={() => actionsRef.current.next(false)}
            disabled={!anyLoaded}
            aria-label="Следующий трек"
          >
            <i className="fa-solid fa-forward-step" />
          </button>
        </div>
      </footer>
    </div>
  );
}
