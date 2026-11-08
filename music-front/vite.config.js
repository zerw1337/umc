import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory()
      ? walk(full, base)
      : [path.relative(base, full).split(path.sep).join('/')];
  });
}

// После сборки подставляет в dist/sw.js список файлов для предзагрузки в кэш
// (чтобы оболочка приложения открывалась без сети) и версию кэша.
function swPrecache() {
  let outDir;
  return {
    name: 'sw-precache',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const swPath = path.join(outDir, 'sw.js');
      if (!fs.existsSync(swPath)) return;
      const files = walk(outDir).filter((f) => f !== 'sw.js');
      const list = ['./', ...files.map((f) => `./${f}`)];
      const build = Date.now().toString(36);
      let src = fs.readFileSync(swPath, 'utf8');
      src = src
        .replace('/*PRECACHE_LIST*/[]', () => JSON.stringify(list, null, 2))
        .replace('BUILD_VERSION', () => build);
      fs.writeFileSync(swPath, src);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), swPrecache()],
});
