import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  build: { chunkSizeWarningLimit: 2000 },
  test: { environment: 'node' },
} as never);
