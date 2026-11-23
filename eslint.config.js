import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ['dist', 'node_modules'] },
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
