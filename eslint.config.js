import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// ESLint stays on 9.x until eslint-plugin-jsx-a11y supports ESLint 10.
export default tseslint.config(
  {
    ignores: [
      'build',
      'coverage',
      'node_modules',
      'playwright-report',
      'test-results',
      'src-controller',
      'e2e/.artifacts',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest'], jsxA11y.flatConfigs.recommended],
    plugins: { 'react-refresh': reactRefresh },
    languageOptions: { globals: globals.browser },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['vite.config.ts', 'playwright.config.ts', 'e2e/**/*.ts', 'scripts/**/*.{ts,js,mjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    ignores: ['public/**'],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  {
    // Served verbatim; service-worker.js runs as a classic script in a ServiceWorkerGlobalScope.
    files: ['public/**/*.js'],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
    languageOptions: { sourceType: 'script', globals: globals.serviceworker },
  }
);
