import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

/** "1.0.0-beta" -> "v1-beta", "1.0.0-beta.2" -> "v1-beta.2", "1.2.0" -> "v1.2.0". */
function displayVersion(semver: string): string {
  const [core = '0.0.0', pre] = semver.split(/-(.*)/s);
  const [major, minor, patch] = core.split('.');
  const base = minor === '0' && patch === '0' ? `v${major}` : `v${core}`;
  return pre ? `${base}-${pre}` : base;
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  plugins: [preact()],
  define: { __APP_VERSION__: JSON.stringify(displayVersion(pkg.version)) },
  build: { chunkSizeWarningLimit: 2000 },
  test: { environment: 'node' },
} as never);
