import { dirname } from 'node:path';
import type { PackageManager } from 'nx/src/utils/package-manager';
import type ts from 'typescript/lib/tsserverlibrary';
import type { Logger } from './logger';

export type RootFileInfo = {
  mainFile: string;
  directory: string;
};

export interface Configuration {
  additionalRootFiles?: RootFileInfo[];
  packageManager?: PackageManager | 'yarn-classic';
  workspacePackages?: string[];
}

const isNxImportPlugin = Symbol('__isNxImportPlugin__');

export class NxImportsPlugin {
  logger: Logger | undefined;
  config: Configuration = {};
  projects = new Map<string, ts.server.Project>();

  constructor(private readonly typescript: typeof ts) {}

  addProject(project: ts.server.Project) {
    this.logger?.log('addProject ' + project.getProjectName());
    if (this.projects.has(project.getProjectName())) {
      this.logger?.log('project already tracked ' + project.getProjectName());
      return;
    }
    this.projects.set(project.getProjectName(), project);
    this.patchGetPackageJsonsForAutoImport(project);
    this.updateProject(project);
  }

  decorate(languageService: ts.LanguageService) {
    this.logger?.log('decorate');
    if ((languageService as any)[isNxImportPlugin]) {
      // Already decorated
      return;
    }

    // We currently don't need to modify the language service, so we simply
    // return the decorated language service as recommended by the tsserver
    // docs: https://github.com/microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin#decorator-creation
    return new Proxy(languageService, {
      get: (
        target: any,
        property: keyof ts.LanguageService & typeof isNxImportPlugin,
      ) => {
        if (property === isNxImportPlugin) {
          return true;
        }
        return target[property];
      },
    });
  }

  setConfig(config: Configuration) {
    this.logger?.log('setting configuration ' + JSON.stringify(config));
    this.config = config;

    this.projects.forEach((project) => {
      this.updateProject(project);
    });
  }

  /**
   * Get any additional root files to add to the project.
   */
  private getRootFiles(project: ts.server.Project): string[] {
    this.logger?.log('get root files: ' + JSON.stringify(this.config));
    const additionalRootFiles = this.config.additionalRootFiles || [];

    if (additionalRootFiles.length === 0) {
      return [];
    }

    const projectDirectory = dirname(project.getProjectName());
    this.logger?.log(`project directory: ${projectDirectory}`);

    const filteredAdditionalRootFiles = additionalRootFiles
      .filter(({ directory }) => {
        return !projectDirectory.startsWith(directory);
      })
      .map(({ mainFile }) => mainFile);
    this.logger?.log(
      `additional root files: ${JSON.stringify(filteredAdditionalRootFiles)}`,
    );

    return filteredAdditionalRootFiles;
  }

  /**
   * Patches the ts.server.Project.getPackageJsonsForAutoImport method to add
   * workspace packages as dependencies if they are not already present.
   */
  private patchGetPackageJsonsForAutoImport(project: ts.server.Project) {
    if (!(project as any).getPackageJsonsForAutoImport) {
      // no getPackageJsonsForAutoImport method, the internal implementation
      // might have changed, return early to avoid crashing the tsserver
      this.logger?.log(`no project.getPackageJsonsForAutoImport`);
      return;
    }

    const originalGetPackageJsonsForAutoImport = (
      project as any
    ).getPackageJsonsForAutoImport.bind(project);
    (project as any).getPackageJsonsForAutoImport = (...args: any[]) => {
      this.logger?.log(
        `getPackageJsonsForAutoImport: ${JSON.stringify(this.config.workspacePackages)}`,
      );
      const packageJsons = originalGetPackageJsonsForAutoImport(...args);

      if (!this.config.workspacePackages?.length) {
        // no workspace packages to add, return the original result
        return packageJsons;
      }

      try {
        // npm and yarn classic don't support the workspace protocol
        const defaultVersion = ['npm', 'yarn-classic'].includes(
          this.config.packageManager,
        )
          ? '*'
          : 'workspace:*';

        for (const packageJson of packageJsons) {
          for (const dependency of this.config.workspacePackages ?? []) {
            if (
              !packageJson.dependencies?.has(dependency) &&
              !packageJson.peerDependencies?.has(dependency)
            ) {
              packageJson.dependencies ??= new Map<string, string>();

              const version =
                packageJson.devDependencies?.get(dependency) ?? defaultVersion;
              packageJson.dependencies.set(dependency, version);
            }
          }
        }
      } catch (e) {
        this.logger?.log(
          `error setting workspace packages as dependencies: ${e}`,
        );
      }

      return packageJsons;
    };
  }

  /**
   * Add any additional root files to the project and invalidate the package
   * json cache.
   */
  private updateProject(project: ts.server.Project) {
    this.logger?.log('updating project: ' + project.getProjectName());
    const rootFiles = this.getRootFiles(project);
    rootFiles.forEach((file) => {
      project.addMissingFileRoot(this.typescript.server.toNormalizedPath(file));
    });

    // ensure the package json cache is invalidated
    if (!(project as any).onAutoImportProviderSettingsChanged) {
      // no onAutoImportProviderSettingsChanged method, the internal implementation
      // might have changed, return early to avoid crashing the tsserver
      this.logger?.log(`no project.onAutoImportProviderSettingsChanged`);
      return;
    }
    (project as any).onAutoImportProviderSettingsChanged();
  }
}
