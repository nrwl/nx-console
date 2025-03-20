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
  packageManager?: PackageManager;
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

    const intercept: Partial<ts.LanguageService> = Object.create(null);

    const oldGetCompletionsAtPosition =
      languageService.getCompletionsAtPosition.bind(languageService);
    intercept.getCompletionsAtPosition = (
      fileName: string,
      position: number,
      options: ts.GetCompletionsAtPositionOptions | undefined,
    ) => {
      this.logger?.log(`getCompletionsAtPosition ${fileName}:${position}`);
      return oldGetCompletionsAtPosition(fileName, position, options);
    };

    return new Proxy(languageService, {
      get: (
        target: any,
        property: keyof ts.LanguageService & typeof isNxImportPlugin,
      ) => {
        if (property === isNxImportPlugin) {
          return true;
        }
        return intercept[property] || target[property];
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

  private patchGetPackageJsonsForAutoImport(project: ts.server.Project) {
    if (!(project as any).getPackageJsonsForAutoImport) {
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
        return packageJsons;
      }

      try {
        for (const packageJson of packageJsons) {
          for (const dependency of this.config.workspacePackages ?? []) {
            if (
              !packageJson.dependencies?.has(dependency) &&
              !packageJson.peerDependencies?.has(dependency)
            ) {
              packageJson.dependencies ??= new Map<string, string>();

              const version =
                packageJson.devDependencies?.get(dependency) ??
                (this.config.packageManager === 'pnpm' ? 'workspace:*' : '*');
              packageJson.dependencies.set(dependency, version);
            }
          }
        }
      } catch {
        // ignore
      }

      return packageJsons;
    };
  }

  private updateProject(project: ts.server.Project) {
    this.logger?.log('updating project: ' + project.getProjectName());
    const rootFiles = this.getRootFiles(project);
    rootFiles.forEach((file) => {
      project.addMissingFileRoot(this.typescript.server.toNormalizedPath(file));
    });

    // ensure the package json cache is invalidated
    if (!(project as any).onAutoImportProviderSettingsChanged) {
      this.logger?.log(`no project.onAutoImportProviderSettingsChanged`);
      return;
    }
    (project as any).onAutoImportProviderSettingsChanged();
  }
}
