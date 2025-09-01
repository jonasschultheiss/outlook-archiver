import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescriptEslintEslintPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...compat.extends('eslint:recommended', 'plugin:@typescript-eslint/strict-type-checked').map((config) => ({
    ...config,
    files: ['**/*.ts'],
  })),
  {
    files: ['**/*.ts'],

    plugins: {
      '@typescript-eslint': typescriptEslintEslintPlugin,
    },

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },

      parser: tsParser,
      ecmaVersion: 5,
      sourceType: 'module',

      parserOptions: {
        project: 'tsconfig.json',
      },
    },

    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'property',
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'require',
        },
        {
          selector: 'property',
          modifiers: ['private', 'static'],
          format: ['UPPER_CASE'],
          leadingUnderscore: 'require',
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
      ],

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '_',
        },
      ],

      'no-constant-binary-expression': 'error',
      '@typescript-eslint/no-extraneous-class': ['error', { allowStaticOnly: true, allowWithDecorator: true }],
      '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],
    },
  },
  {
    ignores: ['node_modules', 'dist'],
  },
];
