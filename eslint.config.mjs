import nx from '@nx/eslint-plugin';

export default [
  {
    // The pre-flat-config root .eslintrc.json had ignorePatterns: ["**/*"], so
    // projects without their own eslint config were never linted. Keep those
    // projects out of lint scope to preserve that behavior.
    ignores: [
      'apps/intellij/**',
      'apps/vscode-e2e/**',
      'libs/shared/cloud-fix-webview/**',
      'libs/shared/nx-cloud/**',
      'libs/shared/ui-components/**',
      'libs/vscode/add-dependency/**',
      'libs/vscode/migrate-sidebar-webview/**',
    ],
  },
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
      // Newly enabled by the ESLint v9 / typescript-eslint v8 preset defaults;
      // these were not enforced before the Nx 23.1 migration.
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-constant-binary-expression': 'off',
      'no-unused-private-class-members': 'off',
    },
  },
  ...nx.configs['flat/javascript'],
  {
    files: ['**/*.js', '**/*.jsx'],
    rules: {
      'no-extra-semi': 'off',
      // Newly enabled by the ESLint v9 preset defaults; these were not
      // enforced before the Nx 23.1 migration.
      'prefer-const': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {},
  },
];
