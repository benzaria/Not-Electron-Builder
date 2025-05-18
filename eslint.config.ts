import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import jsPlugin from '@eslint/js'
import globals from 'globals'

export default defineConfig(
    {
        files: ['src/**/*.{js,mjs,cjs,ts,mts,cts}'],
        ignores: ['node_modules', 'dist', '.history'],
        languageOptions: {
            globals: globals.node,
            ecmaVersion: 'latest',
            sourceType: 'module',
            parser: tsParser,
        },
        rules: {
            'no-console': 'off',
            'no-unused-vars': 'off',
            'semi': ['warn', 'never'],
            'quotes': ['warn', 'single'],
        },
    },
    {
        files: ['src/**/*.{js,mjs,cjs}'],
        ...jsPlugin.configs.recommended,
        rules: {
            ...jsPlugin.configs.recommended.rules,
            'strict': ['error', 'never'],
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                ignoreRestSiblings: true,
            }]
        },
    },
    {
        files: ['src/**/*.{ts,mts,cts}'],
        plugins: { '@typescript-eslint': tsPlugin as any },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                ignoreRestSiblings: true,
            }],
            '@typescript-eslint/ban-ts-comment': 'off'
        },
    }
)