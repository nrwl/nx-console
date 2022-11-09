import {
  createTreeViewStrategy,
  TreeViewStrategy,
} from './nx-project-tree-view';

import * as nxWorkspaceModule from '@nx-console/vscode/nx-workspace';
import * as vscodeUtilsModule from '@nx-console/vscode/utils';

const nxExample = {
  workspacePath:
    '/git/nx-console/apps/vscode-e2e/testworkspaces/testworkspace-nx',
  // Result of cliTaskProvider.getProjects() for apps/vscode-e2e/testworkspaces/testworkspace-nx
  project: {
    app1: {
      targets: {
        build: {
          executor: '@nrwl/webpack:webpack',
          configurations: {
            production: {},
          },
          dependsOn: ['^build'],
          inputs: ['production', '^production'],
        },
        test: {
          executor: '@nrwl/jest:jest',
        },
      },
      root: 'apps/app1',
      tags: [],
      files: [
        {
          file: 'apps/app1/app1.js',
          hash: 'fda9bc547f3d044be11c43ba8df3b8f387f29532',
          deps: ['lib1', 'lib2'],
        },
        {
          file: 'apps/app1/project.json',
          hash: '5b8dd29636672949793a788e40c9f39b75aadc99',
        },
      ],
    },
    lib1: {
      targets: {
        test: {
          executor: '@nrwl/jest:jest',
        },
      },
      root: 'libs/lib1',
      tags: [],
      files: [
        {
          file: 'libs/lib1/project.json',
          hash: '929b00c99a39f3bb085b2487fed80d8e8421aea7',
        },
        {
          file: 'libs/lib1/src/index.ts',
          hash: '56e2812af30c82f0f15bb726f98a27321363e5ca',
        },
        {
          file: 'libs/lib1/src/lib/lib1.js',
          hash: 'f63c731f25f9ac8efaaee3420cac1e7f08185169',
        },
      ],
    },
    lib2: {
      targets: {
        test: {
          executor: '@nrwl/jest:jest',
        },
      },
      root: 'libs/lib2',
      tags: [],
      files: [
        {
          file: 'libs/lib2/project.json',
          hash: '157a68f9115ba2aeb01e074404066c7aef10c34b',
        },
        {
          file: 'libs/lib2/src/index.js',
          hash: '9aeaf007321d35731cf3a05e937f966216376c95',
        },
        {
          file: 'libs/lib2/src/lib/lib2.js',
          hash: 'fcc28489c736ebac8fe0b1b4f3c2aa3041a0de8e',
        },
      ],
    },
  },
};

const ngExample = {
  workspacePath: '/git/ng-multi-projects/my-workspace',
  // Results of cliTaskProvider.getProjects() from https://github.com/saaivs/ng-multi-projects commit 767463aaaccb3da3905b90f3127c418e17163345
  project: {
    app1: {
      projectType: 'application',
      generators: {
        '@schematics/angular:component': {
          style: 'scss',
        },
        '@schematics/angular:application': {
          strict: true,
        },
      },
      root: 'projects/app1',
      sourceRoot: 'projects/app1/src',
      prefix: 'app',
      targets: {
        build: {
          executor: '@angular-devkit/build-angular:browser',
          options: {
            outputPath: 'dist/app1',
            index: 'projects/app1/src/index.html',
            main: 'projects/app1/src/main.ts',
            polyfills: 'projects/app1/src/polyfills.ts',
            tsConfig: 'projects/app1/tsconfig.app.json',
            inlineStyleLanguage: 'scss',
            assets: [
              'projects/app1/src/favicon.ico',
              'projects/app1/src/assets',
            ],
            styles: [
              'node_modules/material-design-icons-iconfont/dist/material-design-icons.css',
              'node_modules/roboto-fontface/css/roboto/roboto-fontface.css',
              'node_modules/@fortawesome/fontawesome-free/css/all.min.css',
              'projects/app1/src/styles.scss',
            ],
            scripts: [
              'node_modules/document-register-element/build/document-register-element.js',
            ],
          },
          configurations: {
            production: {
              budgets: [
                {
                  type: 'initial',
                  maximumWarning: '500kb',
                  maximumError: '1mb',
                },
                {
                  type: 'anyComponentStyle',
                  maximumWarning: '2kb',
                  maximumError: '4kb',
                },
              ],
              fileReplacements: [
                {
                  replace: 'projects/app1/src/environments/environment.ts',
                  with: 'projects/app1/src/environments/environment.prod.ts',
                },
              ],
              outputHashing: 'all',
            },
            stage: {
              budgets: [
                {
                  type: 'initial',
                  maximumWarning: '500kb',
                  maximumError: '1mb',
                },
                {
                  type: 'anyComponentStyle',
                  maximumWarning: '2kb',
                  maximumError: '4kb',
                },
              ],
              fileReplacements: [
                {
                  replace: 'projects/app1/src/environments/environment.ts',
                  with: 'projects/app1/src/environments/environment.stage.ts',
                },
              ],
              outputHashing: 'all',
            },
            development: {
              buildOptimizer: false,
              optimization: false,
              vendorChunk: true,
              extractLicenses: false,
              sourceMap: true,
              namedChunks: true,
            },
          },
          defaultConfiguration: 'production',
        },
        serve: {
          executor: '@angular-devkit/build-angular:dev-server',
          configurations: {
            production: {
              browserTarget: 'app1:build:production',
            },
            development: {
              browserTarget: 'app1:build:development',
            },
          },
          defaultConfiguration: 'development',
        },
        'extract-i18n': {
          executor: '@angular-devkit/build-angular:extract-i18n',
          options: {
            browserTarget: 'app1:build',
          },
        },
        test: {
          executor: '@angular-devkit/build-angular:karma',
          options: {
            main: 'projects/app1/src/test.ts',
            polyfills: 'projects/app1/src/polyfills.ts',
            tsConfig: 'projects/app1/tsconfig.spec.json',
            karmaConfig: 'projects/app1/karma.conf.js',
            inlineStyleLanguage: 'scss',
            assets: [
              'projects/app1/src/favicon.ico',
              'projects/app1/src/assets',
            ],
            styles: ['projects/app1/src/styles.scss'],
            scripts: [],
          },
        },
      },
    },
    app2: {
      projectType: 'application',
      generators: {
        '@schematics/angular:component': {
          style: 'scss',
        },
        '@schematics/angular:application': {
          strict: true,
        },
      },
      root: 'projects/app2',
      sourceRoot: 'projects/app2/src',
      prefix: 'app',
      targets: {
        build: {
          executor: '@angular-devkit/build-angular:browser',
          options: {
            outputPath: 'dist/app2',
            index: 'projects/app2/src/index.html',
            main: 'projects/app2/src/main.ts',
            polyfills: 'projects/app2/src/polyfills.ts',
            tsConfig: 'projects/app2/tsconfig.app.json',
            inlineStyleLanguage: 'scss',
            assets: [
              'projects/app2/src/favicon.ico',
              'projects/app2/src/assets',
            ],
            styles: ['projects/app2/src/styles.scss'],
            scripts: [],
          },
          configurations: {
            production: {
              budgets: [
                {
                  type: 'initial',
                  maximumWarning: '500kb',
                  maximumError: '1mb',
                },
                {
                  type: 'anyComponentStyle',
                  maximumWarning: '2kb',
                  maximumError: '4kb',
                },
              ],
              fileReplacements: [
                {
                  replace: 'projects/app2/src/environments/environment.ts',
                  with: 'projects/app2/src/environments/environment.prod.ts',
                },
              ],
              outputHashing: 'all',
            },
            development: {
              buildOptimizer: false,
              optimization: false,
              vendorChunk: true,
              extractLicenses: false,
              sourceMap: true,
              namedChunks: true,
            },
          },
          defaultConfiguration: 'production',
        },
        serve: {
          executor: '@angular-devkit/build-angular:dev-server',
          configurations: {
            production: {
              browserTarget: 'app2:build:production',
            },
            development: {
              browserTarget: 'app2:build:development',
            },
          },
          defaultConfiguration: 'development',
        },
        'extract-i18n': {
          executor: '@angular-devkit/build-angular:extract-i18n',
          options: {
            browserTarget: 'app2:build',
          },
        },
        test: {
          executor: '@angular-devkit/build-angular:karma',
          options: {
            main: 'projects/app2/src/test.ts',
            polyfills: 'projects/app2/src/polyfills.ts',
            tsConfig: 'projects/app2/tsconfig.spec.json',
            karmaConfig: 'projects/app2/karma.conf.js',
            inlineStyleLanguage: 'scss',
            assets: [
              'projects/app2/src/favicon.ico',
              'projects/app2/src/assets',
            ],
            styles: ['projects/app2/src/styles.scss'],
            scripts: [],
          },
        },
      },
    },
    lib1: {
      projectType: 'library',
      root: 'projects/lib1',
      sourceRoot: 'projects/lib1/src',
      prefix: 'lib',
      targets: {
        build: {
          executor: '@angular-devkit/build-angular:ng-packagr',
          options: {
            project: 'projects/lib1/ng-package.json',
          },
          configurations: {
            production: {
              tsConfig: 'projects/lib1/tsconfig.lib.prod.json',
            },
            development: {
              tsConfig: 'projects/lib1/tsconfig.lib.json',
            },
          },
          defaultConfiguration: 'production',
        },
        test: {
          executor: '@angular-devkit/build-angular:karma',
          options: {
            main: 'projects/lib1/src/test.ts',
            tsConfig: 'projects/lib1/tsconfig.spec.json',
            karmaConfig: 'projects/lib1/karma.conf.js',
          },
        },
      },
    },
    lib2: {
      projectType: 'library',
      root: 'projects/lib2',
      sourceRoot: 'projects/lib2/src',
      prefix: 'lib',
      targets: {
        build: {
          executor: '@angular-devkit/build-angular:ng-packagr',
          options: {
            project: 'projects/lib2/ng-package.json',
          },
          configurations: {
            production: {
              tsConfig: 'projects/lib2/tsconfig.lib.prod.json',
            },
            development: {
              tsConfig: 'projects/lib2/tsconfig.lib.json',
            },
          },
          defaultConfiguration: 'production',
        },
        test: {
          executor: '@angular-devkit/build-angular:karma',
          options: {
            main: 'projects/lib2/src/test.ts',
            tsConfig: 'projects/lib2/tsconfig.spec.json',
            karmaConfig: 'projects/lib2/karma.conf.js',
          },
        },
      },
    },
    lib3: {
      projectType: 'library',
      root: 'projects/lib3',
      sourceRoot: 'projects/lib3/src',
      prefix: 'lib',
      targets: {
        build: {
          executor: '@angular-devkit/build-angular:ng-packagr',
          options: {
            project: 'projects/lib3/ng-package.json',
          },
          configurations: {
            production: {
              tsConfig: 'projects/lib3/tsconfig.lib.prod.json',
            },
            development: {
              tsConfig: 'projects/lib3/tsconfig.lib.json',
            },
          },
          defaultConfiguration: 'production',
        },
        test: {
          executor: '@angular-devkit/build-angular:karma',
          options: {
            main: 'projects/lib3/src/test.ts',
            tsConfig: 'projects/lib3/tsconfig.spec.json',
            karmaConfig: 'projects/lib3/karma.conf.js',
          },
        },
      },
    },
  },
};

const ngExampleInSrc = {
  workspacePath: '/git/angular-multiple-applications-example',
  // Results of cliTaskProvider.getProjects() from https://github.com/JoelViney/angular-multiple-applications-example commit 3d7d2627c57e7e6d4dc4ee78abcff25c6d29fbbe
  project: {
    'multi-application-example': {
      root: '',
      sourceRoot: 'src',
      projectType: 'application',
      targets: {
        build: {
          executor: '@angular-devkit/build-angular:browser',
          options: {
            outputPath: 'dist-application-a',
            index: 'src/application-a/index.html',
            main: 'src/application-a/main.ts',
            tsConfig: 'src/application-a/tsconfig.app.json',
            polyfills: 'src/application-a/polyfills.ts',
            assets: [
              'src/application-a/assets',
              'src/application-a/favicon.ico',
            ],
            styles: ['src/application-a/styles.css'],
            scripts: [],
          },
          configurations: {
            production: {
              optimization: true,
              outputHashing: 'all',
              sourceMap: false,
              extractCss: true,
              namedChunks: false,
              aot: true,
              extractLicenses: true,
              vendorChunk: false,
              buildOptimizer: true,
              fileReplacements: [
                {
                  replace: 'src/application-a/environments/environment.ts',
                  with: 'src/application-a/environments/environment.prod.ts',
                },
              ],
            },
          },
        },
        serve: {
          executor: '@angular-devkit/build-angular:dev-server',
          options: {
            browserTarget: 'multi-application-example:build',
          },
          configurations: {
            production: {
              browserTarget: 'multi-application-example:build:production',
            },
          },
        },
        'extract-i18n': {
          executor: '@angular-devkit/build-angular:extract-i18n',
          options: {
            browserTarget: 'multi-application-example:build',
          },
        },
        test: {
          executor: '@angular-devkit/build-angular:karma',
          options: {
            main: 'src/application-a/test.ts',
            karmaConfig: './karma.conf.js',
            polyfills: 'src/application-a/polyfills.ts',
            tsConfig: 'src/application-a/tsconfig.spec.json',
            scripts: [],
            styles: ['src/application-a/styles.css'],
            assets: [
              'src/application-a/assets',
              'src/application-a/favicon.ico',
            ],
          },
        },
        lint: {
          executor: '@angular-devkit/build-angular:tslint',
          options: {
            tsConfig: ['src/tsconfig.app.json', 'src/tsconfig.spec.json'],
            exclude: ['**/node_modules/**'],
          },
        },
      },
    },
    'multi-application-example-e2e': {
      root: '',
      sourceRoot: '',
      projectType: 'application',
      targets: {
        e2e: {
          executor: '@angular-devkit/build-angular:protractor',
          options: {
            protractorConfig: './protractor.conf.js',
            devServerTarget: 'multi-application-example:serve',
          },
        },
        lint: {
          executor: '@angular-devkit/build-angular:tslint',
          options: {
            tsConfig: ['e2e/tsconfig.e2e.json'],
            exclude: ['**/node_modules/**'],
          },
        },
      },
    },
    'multi-application-example1': {
      root: '',
      sourceRoot: 'src',
      projectType: 'application',
      targets: {
        build: {
          executor: '@angular-devkit/build-angular:browser',
          options: {
            outputPath: 'dist-application-b',
            index: 'src/application-b/index.html',
            main: 'src/application-b/main.ts',
            tsConfig: 'src/application-b/tsconfig.app.json',
            polyfills: 'src/application-b/polyfills.ts',
            assets: [
              'src/application-b/assets',
              'src/application-b/favicon.ico',
            ],
            styles: ['src/application-b/styles.css'],
            scripts: [],
          },
          configurations: {
            production: {
              optimization: true,
              outputHashing: 'all',
              sourceMap: false,
              extractCss: true,
              namedChunks: false,
              aot: true,
              extractLicenses: true,
              vendorChunk: false,
              buildOptimizer: true,
              fileReplacements: [
                {
                  replace: 'src/application-b/environments/environment.ts',
                  with: 'src/application-b/environments/environment.prod.ts',
                },
              ],
            },
          },
        },
        serve: {
          executor: '@angular-devkit/build-angular:dev-server',
          options: {
            browserTarget: 'multi-application-example1:build',
          },
          configurations: {
            production: {
              browserTarget: 'multi-application-example1:build:production',
            },
          },
        },
        'extract-i18n': {
          executor: '@angular-devkit/build-angular:extract-i18n',
          options: {
            browserTarget: 'multi-application-example1:build',
          },
        },
        test: {
          executor: '@angular-devkit/build-angular:karma',
          options: {
            main: 'src/application-b/test.ts',
            karmaConfig: './karma.conf.js',
            polyfills: 'src/application-b/polyfills.ts',
            tsConfig: 'src/application-b/tsconfig.spec.json',
            scripts: [],
            styles: ['src/application-b/styles.css'],
            assets: [
              'src/application-b/assets',
              'src/application-b/favicon.ico',
            ],
          },
        },
        lint: {
          executor: '@angular-devkit/build-angular:tslint',
          options: {
            tsConfig: ['src/tsconfig.app.json', 'src/tsconfig.spec.json'],
            exclude: ['**/node_modules/**'],
          },
        },
      },
    },
    'multi-application-example1-e2e': {
      root: '',
      sourceRoot: '',
      projectType: 'application',
      targets: {
        e2e: {
          executor: '@angular-devkit/build-angular:protractor',
          options: {
            protractorConfig: './protractor.conf.js',
            devServerTarget: 'multi-application-example1:serve',
          },
        },
        lint: {
          executor: '@angular-devkit/build-angular:tslint',
          options: {
            tsConfig: ['e2e/tsconfig.e2e.json'],
            exclude: ['**/node_modules/**'],
          },
        },
      },
    },
  },
};

const testRootChildren = async (
  expectedOutput: string[],
  treeView: TreeViewStrategy
) => {
  const rootElements = await treeView.getChildren();
  expect(rootElements).toHaveLength(expectedOutput.length);
  const paths = rootElements?.map((e) => e.label);
  expect(paths).toEqual(expectedOutput);
};

describe('Project View: TreeView', () => {
  describe('nx workspace', () => {
    it('should find root directories', async () => {
      jest
        .spyOn(nxWorkspaceModule, 'getNxWorkspaceProjects')
        .mockReturnValue(
          new Promise((resolve) => setTimeout(() => resolve(nxExample.project)))
        );
      jest
        .spyOn(vscodeUtilsModule, 'getWorkspacePath')
        .mockReturnValue(nxExample.workspacePath);
      // const viewProvider = createMockViewDataProvider(
      //   nxExample.workspacePath,
      //   nxExample.project
      // );
      const expectedOutput = ['apps', 'libs'];
      const treeView = createTreeViewStrategy();

      await testRootChildren(expectedOutput, treeView);
    });
  });

  describe('angular', () => {
    it('should find root directory "projects"', async () => {
      // const viewProvider = createMockViewDataProvider(
      //   ngExample.workspacePath,
      //   ngExample.project
      // );
      const expectedOutput = ['projects'];
      const treeView = createTreeViewStrategy();

      await testRootChildren(expectedOutput, treeView);
    });

    it('should use root placeholder for empty roots', async () => {
      // const viewProvider = createMockViewDataProvider(
      //   ngExampleInSrc.workspacePath,
      //   ngExampleInSrc.project
      // );
      const expectedOutput = ['<root>'];
      const treeView = createTreeViewStrategy();

      await testRootChildren(expectedOutput, treeView);
    });

    it('should find projects below root directory', async () => {
      // const viewProvider = createMockViewDataProvider(
      //   ngExampleInSrc.workspacePath,
      //   ngExampleInSrc.project
      // );
      const expectedOutput = [
        'multi-application-example',
        'multi-application-example-e2e',
        'multi-application-example1',
        'multi-application-example1-e2e',
      ];
      const treeView = createTreeViewStrategy();
      const [srcDir] = (await treeView.getChildren()) ?? [];

      const projects = await treeView.getChildren(srcDir);

      expect(projects).toHaveLength(expectedOutput.length);
      const paths = projects?.map((e) => e.label);
      expect(paths).toEqual(expectedOutput);
    });
  });
});

// type MockDataGetWorkspacePath = ReturnType<
//   ViewDataProvider['getWorkspacePath']
// >;
// type MockDataGetProjects = Awaited<ReturnType<ViewDataProvider['getProjects']>>;

// function createMockViewDataProvider(
//   workspacePath: MockDataGetWorkspacePath,
//   projects: unknown
// ): ViewDataProvider {
//   return {
//     getWorkspacePath: () => workspacePath,
//     getProjects: () =>
//       new Promise((resolve) =>
//         setTimeout(() => resolve(projects as MockDataGetProjects))
//       ),
//   };
// }
