import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ['dist', 'node_modules'] },
  {
    // The service worker template runs in the worker scope; build placeholders are filled in by vite.config.ts.
    files: ['src/pwa/**/*.js'],
    languageOptions: { globals: { ...globals.serviceworker, __PRECACHE__: 'readonly' } },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // The simulation must stay engine- and UI-agnostic so it can run headless.
    files: ['src/sim/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/game/**', '**/ui/**', '**/save/**', 'phaser', 'preact', 'preact/*'],
            message: 'src/sim must not depend on rendering, UI or persistence.' },
        ],
      }],
    },
  },
);
