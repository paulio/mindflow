import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

const browserGlobals = {
  ...globals.browser,
  ...globals.es2021,
};

const nodeGlobals = {
  ...globals.node,
};

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'playwright-report/**', 'test-results/**']
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: { ...browserGlobals, ...nodeGlobals },
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' }
    },
    settings: {
      react: { version: 'detect' }
    },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: { ...browserGlobals, ...nodeGlobals }
    },
    plugins: { '@typescript-eslint': tsPlugin, react, 'react-hooks': reactHooks },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...browserGlobals,
        ...nodeGlobals,
        ...globals['jest'],
        ...globals['vitest']
      }
    }
  }
];
