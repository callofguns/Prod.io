import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';

/** "1.0.0-beta" -> "v1-beta", "1.0.0-beta.2" -> "v1-beta.2", "1.2.0" -> "v1.2.0". */
function displayVersion(semver: string): string {
  const [core = '0.0.0', pre] = semver.split(/-(.*)/s);
  const [major, minor, patch] = core.split('.');
  const base = minor === '0' && patch === '0' ? `v${major}` : `v${core}`;
  return pre ? `${base}-${pre}` : base;
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/** Every file under public/, as site paths. */
function publicFiles(dir = 'public', root = 'public'): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? publicFiles(path, root) : ['/' + relative(root, path).split('\\').join('/')];
  });
}

/**
 * Emits sw.js: the service worker from src/pwa/sw-template.js with this
 * build's file list baked in, so the installed game works offline.
 */
function serviceWorker(): Plugin {
  return {
    name: 'prodio-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = ['/', '/index.html', ...Object.keys(bundle).map((f) => '/' + f), ...publicFiles()]
        .filter((f) => !f.endsWith('.map') && f !== '/sw.js');
      const unique = [...new Set(files)].sort();
      const version = createHash('sha256').update(pkg.version + unique.join('|')).digest('hex').slice(0, 12);
      const source = readFileSync('src/pwa/sw-template.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(unique, null, 2));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  plugins: [preact(), serviceWorker()],
  define: { __APP_VERSION__: JSON.stringify(displayVersion(pkg.version)) },
  build: { chunkSizeWarningLimit: 2000 },
  test: { environment: 'node' },
} as never);
