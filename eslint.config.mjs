import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  {
    // Never lint build artifacts. The pre-migration per-project .eslintrc files
    // ignored these (e.g. "ignorePatterns": ["out-tsc", "test-output"]); the
    // flat/base preset only ignores ".nx", so re-add them here workspace-wide.
    ignores: ['**/dist', '**/out-tsc', '**/test-output'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: 'type:vscode',
              onlyDependOnLibsWithTags: [
                'type:shared',
                'type:vscode',
                'type:mcp',
              ],
            },
            {
              sourceTag: 'type:lsp',
              onlyDependOnLibsWithTags: ['type:lsp', 'type:shared', 'type:mcp'],
              bannedExternalImports: ['vscode'],
            },
            {
              sourceTag: 'type:mcp',
              onlyDependOnLibsWithTags: ['type:mcp', 'type:shared'],
              bannedExternalImports: ['vscode'],
            },
            {
              sourceTag: 'type:shared',
              onlyDependOnLibsWithTags: ['type:shared'],
              bannedExternalImports: ['vscode'],
            },
            {
              sourceTag: 'type:generate-ui',
              onlyDependOnLibsWithTags: ['type:shared', 'type:generate-ui'],
            },
          ],
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          name: '@nx/devkit',
          message:
            'Please use nx/src/devkit-exports instead, or import function directly from @nx/devkit/src/*',
        },
        {
          name: 'semver',
          importNames: ['gte', 'gt'],
          message: 'Please use @nx-console/nx-version instead',
        },
      ],
    },
  },
  ...nx.configs['flat/typescript'],
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_$',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-extra-semi': 'off',
    },
  },
  ...nx.configs['flat/javascript'],
  {
    files: ['**/*.js', '**/*.jsx'],
    rules: {
      'no-extra-semi': 'off',
    },
  },
  // ESLint v9 and typescript-eslint v8 turned these rules on in their recommended
  // presets. They were not enforced before this upgrade and are not configured by
  // this workspace; disable them to preserve the pre-migration lint baseline
  // (per the Nx flat-config migration guidance: don't edit source for newly
  // enabled preset rules — disable the rule instead).
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      'no-control-regex': 'off',
      'no-constant-binary-expression': 'off',
      'no-unused-private-class-members': 'off',
      'prefer-const': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {},
  },
];
