export default [
  {
    ignores: ['.git/**', 'icons/**', 'node_modules/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        chrome: 'readonly',
        window: 'readonly',
        document: 'readonly',
        MutationObserver: 'readonly',
        URL: 'readonly',
        btoa: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        Date: 'readonly',
        console: 'readonly',
        prompt: 'readonly',
        alert: 'readonly',
        localStorage: 'readonly',
        clearTimeout: 'readonly',
        globalThis: 'readonly',
        PD: 'writable',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
    },
  },
];
