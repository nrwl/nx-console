// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const NG_BUILD_ARCHITECT = {
  title: 'ng build vscode-ui',
  schema: [
    {
      name: 'assets',
      type: 'array',
      description: 'List of static application assets.',
      defaultValue: '',
      required: false,
      positional: false,
    },
    {
      name: 'main',
      type: 'string',
      description:
        'The full path for the main entry point to the app, relative to the current workspace.',
      required: true,
      positional: false,
    },
    {
      name: 'polyfills',
      type: 'string',
      description:
        'The full path for the polyfills file, relative to the current workspace.',
      required: false,
      positional: false,
    },
    {
      name: 'tsConfig',
      type: 'string',
      description:
        'The full path for the TypeScript configuration file, relative to the current workspace.',
      required: true,
      positional: false,
    },
    {
      name: 'scripts',
      type: 'array',
      description: 'Global scripts to be included in the build.',
      defaultValue: '',
      required: false,
      positional: false,
    },
    {
      name: 'styles',
      type: 'array',
      description: 'Global styles to be included in the build.',
      defaultValue: '',
      required: false,
      positional: false,
    },
    {
      name: 'stylePreprocessorOptions',
      type: 'object',
      description: 'Options to pass to style preprocessors.',
      required: false,
      positional: false,
    },
    {
      name: 'optimization',
      type: 'string',
      description: 'Enables optimization of the build output.',
      required: false,
      positional: false,
    },
    {
      name: 'fileReplacements',
      type: 'array',
      description: 'Replace files with other files in the build.',
      defaultValue: '',
      required: false,
      positional: false,
    },
    {
      name: 'outputPath',
      type: 'string',
      description:
        'The full path for the new output directory, relative to the current workspace.\n\nBy default, writes output to a folder named dist/ in the current project.',
      required: true,
      positional: false,
    },
    {
      name: 'resourcesOutputPath',
      type: 'string',
      description:
        'The path where style resources will be placed, relative to outputPath.',
      defaultValue: '',
      required: false,
      positional: false,
    },
    {
      name: 'aot',
      type: 'boolean',
      description: 'Build using Ahead of Time compilation.',
      defaultValue: 'false',
      required: false,
      positional: false,
    },
    {
      name: 'sourceMap',
      type: 'string',
      description: 'Output sourcemaps.',
      defaultValue: 'true',
      required: false,
      positional: false,
    },
    {
      name: 'vendorSourceMap',
      type: 'boolean',
      description: 'Resolve vendor packages sourcemaps.',
      defaultValue: 'false',
      required: false,
      positional: false,
    },
    {
      name: 'evalSourceMap',
      type: 'boolean',
      description: 'Output in-file eval sourcemaps.',
      defaultValue: 'false',
      required: false,
      positional: false,
    },
    {
      name: 'vendorChunk',
      type: 'boolean',
      description: 'Use a separate bundle containing only vendor libraries.',
      defaultValue: 'true',
      required: false,
      positional: false,
    },
    {
      name: 'commonChunk',
      type: 'boolean',
      description:
        'Use a separate bundle containing code used across multiple bundles.',
      defaultValue: 'true',
      required: false,
      positional: false,
    },
    {
      name: 'baseHref',
      type: 'string',
      description: 'Base url for the application being built.',
      required: false,
      positional: false,
    },
    {
      name: 'deployUrl',
      type: 'string',
      description: 'URL where files will be deployed.',
      required: false,
      positional: false,
    },
    {
      name: 'verbose',
      type: 'boolean',
      description: 'Adds more details to output logging.',
      defaultValue: 'false',
      required: false,
      positional: false,
    },
    {
      name: 'progress',
      type: 'boolean',
      description: 'Log progress to the console while building.',
      required: false,
      positional: false,
    },
    {
      name: 'i18nFile',
      type: 'string',
      description: 'Localization file to use for i18n.',
      required: false,
      positional: false,
    },
    {
      name: 'i18nFormat',
      type: 'string',
      description:
        'Format of the localization file specified with --i18n-file.',
      required: false,
      positional: false,
    },
    {
      name: 'i18nLocale',
      type: 'string',
      description: 'Locale to use for i18n.',
      required: false,
      positional: false,
    },
    {
      name: 'i18nMissingTranslation',
      type: 'string',
      description: 'How to handle missing translations for i18n.',
      required: false,
      positional: false,
    },
    {
      name: 'extractCss',
      type: 'boolean',
      description:
        'Extract css from global styles into css files instead of js ones.',
      defaultValue: 'false',
      required: false,
      positional: false,
    },
    {
      name: 'watch',
      type: 'boolean',
      description: 'Run build when files change.',
      defaultValue: 'false',
      required: false,
      positional: false,
    },
    {
      name: 'outputHashing',
      type: 'string',
      description: 'Define the output filename cache-busting hashing mode.',
      defaultValue: 'none',
      required: false,
      positional: false,
      enum: ['none', 'all', 'media', 'bundles'],
    },
    {
      name: 'poll',
      type: 'number',
      description:
        'Enable and define the file watching poll time period in milliseconds.',
      required: false,
      positional: false,
    },
    {
      name: 'deleteOutputPath',
      type: 'boolean',
      description: 'Delete the output path before building.',
      defaultValue: 'true',
      required: false,
      positional: false,
    },
    {
      name: 'preserveSymlinks',
      type: 'boolean',
      description: 'Do not use the real path when resolving modules.',
      defaultValue: 'false',
      required: false,
      positional: false,
    },
    {
      name: 'extractLicenses',
      type: 'boolean',
      description: 'Extract all licenses in a separate file.',
      defaultValue: 'false',
      required: false,
      positional: false,
    },
    {
      name: 'showCircularDependencies',
      type: 'boolean',
      description: 'Show circular dependency warnings on builds.',
      defaultValue: 'true',
      required: false,
      positional: false,
    },
    {
      name: 'buildOptimizer',
      type: 'boolean',
      description: `Enables '@angular-devkit/build-optimizer' optimizations when using the 'aot' option.`,
      defaultValue: 'false',
      required: false,
      positional: false,
    },
    {
      name: 'namedChunks',
      type: 'boolean',
      description: 'Use file name for lazy loaded chunks.',
      defaultValue: 'true',
      required: false,
      positional: false,
    },
    {
      name: 'subresourceIntegrity',
      type: 'boolean',
      description: 'Enables the use of subresource integrity validation.',
      defaultValue: 'false',
      required: false,
      positional: false,
    },
    {
      name: 'serviceWorker',
      type: 'boolean',
      description: 'Generates a service worker config for production builds.',
      defaultValue: 'false',
      required: false,
      positional: false,
    },
    {
      name: 'ngswConfigPath',
      type: 'string',
      description: 'Path to ngsw-config.json.',
      required: false,
      positional: false,
    },
    {
      name: 'skipAppShell',
      type: 'boolean',
      description: 'Flag to prevent building an app shell.',
      defaultValue: 'false',
      required: false,
      positional: false,
    },
    {
      name: 'index',
      type: 'string',
      description: 'The name of the index HTML file.',
      required: true,
      positional: false,
    },
    {
      name: 'statsJson',
      type: 'boolean',
      description: `Generates a 'stats.json' file which can be analyzed using tools such as 'webpack-bundle-analyzer'.`,
      defaultValue: 'false',
      required: false,
      positional: false,
    },
    {
      name: 'forkTypeChecker',
      type: 'boolean',
      description: 'Run the TypeScript type checker in a forked process.',
      defaultValue: 'true',
      required: false,
      positional: false,
    },
    {
      name: 'lazyModules',
      type: 'array',
      description:
        'List of additional NgModule files that will be lazy loaded. Lazy router modules will be discovered automatically.',
      defaultValue: '',
      required: false,
      positional: false,
    },
    {
      name: 'budgets',
      type: 'array',
      description:
        'Budget thresholds to ensure parts of your application stay within boundaries which you set.',
      defaultValue: '',
      required: false,
      positional: false,
    },
    {
      name: 'profile',
      type: 'boolean',
      description: 'Output profile events for Chrome profiler.',
      defaultValue: 'false',
      required: false,
      positional: false,
    },
    {
      name: 'es5BrowserSupport',
      type: 'boolean',
      description: 'Enables conditionally loaded ES2015 polyfills.',
      required: false,
      positional: false,
    },
    {
      name: 'rebaseRootRelativeCssUrls',
      type: 'boolean',
      description:
        'Change root relative URLs in stylesheets to include base HREF and deploy URL. Use only for compatibility and transition. The behavior of this option is non-standard and will be removed in the next major release.',
      defaultValue: 'false',
      required: false,
      positional: false,
    },
    {
      name: 'webWorkerTsConfig',
      type: 'string',
      description: 'TypeScript configuration for Web Worker modules.',
      required: false,
      positional: false,
    },
    {
      name: 'crossOrigin',
      type: 'string',
      description:
        'Define the crossorigin attribute setting of elements that provide CORS support.',
      defaultValue: 'none',
      required: false,
      positional: false,
      enum: ['none', 'anonymous', 'use-credentials'],
    },
  ],
  options: {
    defaultValues: [
      {
        name: 'outputPath',
        defaultValue: 'dist/apps/vscode/assets/public',
      },
      {
        name: 'index',
        defaultValue: 'apps/vscode-ui/src/index.html',
      },
      {
        name: 'main',
        defaultValue: 'apps/vscode-ui/src/main.ts',
      },
      {
        name: 'tsConfig',
        defaultValue: 'apps/vscode-ui/tsconfig.app.json',
      },
      {
        name: 'assets',
      },
      {
        name: 'styles',
      },
      {
        name: 'extractCss',
        defaultValue: 'true',
      },
      {
        name: 'namedChunks',
        defaultValue: 'false',
      },
      {
        name: 'extractLicenses',
        defaultValue: 'true',
      },
      {
        name: 'vendorChunk',
        defaultValue: 'false',
      },
      {
        name: 'stylePreprocessorOptions',
      },
      {
        name: 'es5BrowserSupport',
        defaultValue: 'false',
      },
    ],
  },
  configurations: [
    {
      name: 'production',
      defaultValues: [
        {
          name: 'outputPath',
          defaultValue: 'prodpath',
        },
        {
          name: 'index',
          defaultValue: 'apps/vscode-ui/src/index.html',
        },
        {
          name: 'main',
          defaultValue: 'apps/vscode-ui/src/main.ts',
        },
        {
          name: 'tsConfig',
          defaultValue: 'apps/vscode-ui/tsconfig.app.json',
        },
        {
          name: 'assets',
        },
        {
          name: 'styles',
        },
        {
          name: 'extractCss',
          defaultValue: 'true',
        },
        {
          name: 'namedChunks',
          defaultValue: 'false',
        },
        {
          name: 'extractLicenses',
          defaultValue: 'true',
        },
        {
          name: 'vendorChunk',
          defaultValue: 'false',
        },
        {
          name: 'stylePreprocessorOptions',
        },
        {
          name: 'es5BrowserSupport',
          defaultValue: 'false',
        },
        {
          name: 'sourceMap',
          defaultValue: 'false',
        },
        {
          name: 'aot',
          defaultValue: 'true',
        },
        {
          name: 'optimization',
          defaultValue: 'true',
        },
        {
          name: 'buildOptimizer',
          defaultValue: 'true',
        },
        {
          name: 'fileReplacements',
        },
      ],
    },
  ],
  name: 'build',
  project: 'vscode-ui',
  description: '',
  builder: '@angular-devkit/build-angular:browser',
};

export const MOCK_COMPONENT_ARCHITECT = {
  title: 'ng generate component',
  name: 'component',
  project: 'Project',
  builder: 'Builder',
  description: 'Description',
  options: { defaultValues: [] },
  configurations: [],
  schema: [
    {
      name: 'inlineStyle',
      enum: null,
      type: 'boolean',
      description:
        'When true, includes styles inline in the component.ts file. Only CSS styles can be included inline. By default, an external styles file is created and referenced in the component.ts file.',
      defaultValue: false,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false,
    },
    {
      name: 'inlineTemplate',
      enum: null,
      type: 'boolean',
      description:
        'When true, includes template inline in the component.ts file. By default, an external template file is created and referenced in the component.ts file.',
      defaultValue: false,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false,
    },
    {
      name: 'viewEncapsulation',
      enum: ['Emulated', 'Native', 'None', 'ShadowDom'],
      type: 'enum',
      description:
        'The view encapsulation strategy to use in the new component.',
      defaultValue: 'ShadowDom',
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false,
      completionValues: {
        _isScalar: false,
        source: {
          source: {
            _isScalar: false,
            source: {
              _isScalar: false,
              source: { _isScalar: false },
              operator: { concurrent: 1 },
            },
            operator: {},
          },
        },
        operator: {
          connectable: {
            source: {
              _isScalar: false,
              source: {
                _isScalar: false,
                source: { _isScalar: false },
                operator: { concurrent: 1 },
              },
              operator: {},
            },
          },
        },
      },
    },
    {
      name: 'changeDetection',
      enum: ['Default', 'OnPush'],
      type: 'string',
      description: 'The change detection strategy to use in the new component.',
      defaultValue: 'Default',
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false,
      completionValues: {
        _isScalar: false,
        source: {
          source: {
            _isScalar: false,
            source: {
              _isScalar: false,
              source: { _isScalar: false },
              operator: { concurrent: 1 },
            },
            operator: {},
          },
        },
        operator: {
          connectable: {
            source: {
              _isScalar: false,
              source: {
                _isScalar: false,
                source: { _isScalar: false },
                operator: { concurrent: 1 },
              },
              operator: {},
            },
          },
        },
      },
    },
    {
      name: 'prefix',
      enum: null,
      type: 'string',
      description: 'The prefix to apply to the generated component selector.',
      defaultValue: null,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false,
    },
    {
      name: 'styleext',
      enum: null,
      type: 'string',
      description: 'The file extension to use for style files.',
      defaultValue: 'css',
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false,
    },
    {
      name: 'style',
      enum: ['css', 'scss', 'sass', 'less', 'styl'],
      type: 'string',
      description: 'The file extension or preprocessor to use for style files.',
      defaultValue: 'css',
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false,
      completionValues: {
        _isScalar: false,
        source: {
          source: {
            _isScalar: false,
            source: {
              _isScalar: false,
              source: { _isScalar: false },
              operator: { concurrent: 1 },
            },
            operator: {},
          },
        },
        operator: {
          connectable: {
            source: {
              _isScalar: false,
              source: {
                _isScalar: false,
                source: { _isScalar: false },
                operator: { concurrent: 1 },
              },
              operator: {},
            },
          },
        },
      },
    },
    {
      name: 'spec',
      enum: null,
      type: 'boolean',
      description:
        'When true (the default), generates a `spec.ts` test file for the new component.',
      defaultValue: true,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false,
    },
    {
      name: 'skipTests',
      enum: null,
      type: 'boolean',
      description:
        'When true, does not create `spec.ts` test files for the new component.',
      defaultValue: false,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false,
    },
    {
      name: 'flat',
      enum: null,
      type: 'boolean',
      description:
        'When true, creates the new files at the top level of the current project.',
      defaultValue: false,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false,
    },
    {
      name: 'skipImport',
      enum: null,
      type: 'boolean',
      description:
        'When true, does not import this component into the owning NgModule.',
      defaultValue: false,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false,
    },
    {
      name: 'selector',
      enum: null,
      type: 'string',
      description: 'The HTML selector to use for this component.',
      defaultValue: null,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false,
    },
    {
      name: 'entryComponent',
      enum: null,
      type: 'boolean',
      description:
        'When true, the new component is the entry component of the declaring NgModule.',
      defaultValue: false,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false,
    },
    {
      name: 'lintFix',
      enum: null,
      type: 'boolean',
      description:
        'When true, applies lint fixes after generating the component.',
      defaultValue: false,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false,
    },
  ],
};

export const environment = {
  production: false,
  providers: [],
};
