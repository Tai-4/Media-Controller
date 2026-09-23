import js from '@eslint/js';
import globals from 'globals';

export default [
    { ignores: ['dist/'] },
    js.configs.recommended,
    {
        files: ['src/**/*.js'],
        languageOptions: {
            sourceType: 'module',
            globals: { ...globals.browser, ...globals.webextensions },
        },
    },
    {
        files: ['scripts/**/*.mjs', 'test/**/*.js', 'eslint.config.mjs'],
        languageOptions: {
            sourceType: 'module',
            globals: globals.node,
        },
    },
];
