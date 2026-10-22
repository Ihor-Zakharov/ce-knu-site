import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import astro from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist/', '.astro/', 'node_modules/', 'public/']),
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  astro.configs['jsx-a11y-strict'],
  {
    // React islands (.tsx): hooks rules and the same accessibility rules as .astro files.
    files: ['**/*.{jsx,tsx}'],
    extends: [jsxA11y.configs.strict, reactHooks.configs.flat['recommended-latest']],
  },
  {
    files: ['*.{js,mjs,ts}', 'scripts/**/*.{js,mjs,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      eqeqeq: 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
]);
