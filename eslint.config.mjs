import json from '@eslint/json'
import markdown from '@eslint/markdown'
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'
import preferArrowFunctions from 'eslint-plugin-prefer-arrow-functions'
import pluginPromise from 'eslint-plugin-promise'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import eslintPluginTailwindcss from 'eslint-plugin-tailwindcss'
import unicorn from 'eslint-plugin-unicorn'

const NO_PARENT_IMPORTS = {
  group: ['../*'],
  message:
    'Use `./` for the same folder or a direct subfolder and the `@/` alias otherwise.'
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  pluginPromise.configs['flat/recommended'],
  prettier,
  preferArrowFunctions.configs.all,
  {
    extends: [eslintPluginTailwindcss.configs.recommended],
    settings: {
      tailwindcss: {
        cssConfigPath: './src/app/styles/globals.css',
        parseKeyFunctions: ['classnames', 'classNames']
      }
    }
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    plugins: {
      unicorn
    },
    extends: ['unicorn/recommended'],
    rules: {
      'unicorn/consistent-boolean-name': 'off',
      'unicorn/default-export-style': ['error', { functions: 'separate' }],
      'unicorn/logical-assignment-operators': 'off',
      'unicorn/no-null': 'off',
      'unicorn/name-replacements': [
        'error',
        {
          replacements: {
            params: false,
            props: false,
            utils: false
          }
        }
      ]
    }
  },
  {
    files: ['src/app/**', 'src/tests/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [NO_PARENT_IMPORTS] }]
    }
  },
  ...Object.entries({
    'src/entry/**': ['app'],
    'src/{dtos,models,types}/**': ['app', 'entry'],
    'src/repositories/**': ['app', 'entry', 'dtos', 'models', 'types'],
    'src/infra/**': ['app', 'entry', 'dtos', 'models', 'repositories', 'types'],
    'src/constants/**': [
      'app',
      'entry',
      'dtos',
      'models',
      'repositories',
      'infra',
      'types'
    ]
  }).map(([files, layers]) => ({
    files: [files],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: `^@/(${layers.join('|')})(/|$)`,
              message: 'Imports only flow down the layers (see AGENTS.md).'
            },
            NO_PARENT_IMPORTS
          ]
        }
      ]
    }
  })),
  {
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/no-anonymous-default-export': 'off'
    }
  },
  {
    files: ['**/*.json'],
    plugins: { json },
    language: 'json/json',
    extends: ['json/recommended']
  },
  {
    files: ['**/*.md'],
    plugins: { markdown },
    language: 'markdown/gfm',
    languageOptions: { frontmatter: 'yaml' },
    extends: ['markdown/recommended'],
    // These rules crash ESLint on GFM text nodes without a position (e.g. `[text][https://...]`)
    // instead of reporting: https://github.com/eslint/markdown/issues/619
    rules: {
      'markdown/no-invalid-label-refs': 'off',
      'markdown/no-missing-label-refs': 'off',
      'markdown/no-reference-like-urls': 'off',
      'markdown/no-space-in-emphasis': 'off'
    }
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    '.claude/**',
    '.agents/**',
    'test-results/**'
  ])
])

export default eslintConfig
