import cypress from 'eslint-plugin-cypress/flat';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  cypress.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {},
  },
  {
    ignores: ['dist/**/*'],
  },
  {
    ignores: ['cypress'],
  },
];
