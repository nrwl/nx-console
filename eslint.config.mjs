import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
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
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {},
  },
];
