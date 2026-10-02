import {
  configureJsonLanguageService,
  getSchemaRequestService,
  lspLogger,
} from '@nx-console/language-server-utils';
import { getProjectByRoot } from '@nx-console/language-server-workspace';
import { readAndParseJson } from '@nx-console/shared-file-system';
import {
  CompletionType,
  getNxJsonSchema,
  getProjectJsonSchema,
  implicitDependencies,
  mergeWithInstalledSchema,
  namedInputs,
  tags,
} from '@nx-console/shared-json-schema';
import { findNxPackagePath } from '@nx-console/shared-npm';
import {
  getExecutors,
  getNxVersion,
  nxWorkspace,
} from '@nx-console/shared-nx-workspace-info';
import { CollectionInfo } from '@nx-console/shared-schema';
import { NxWorkspace } from '@nx-console/shared-types';
import { readFile } from 'fs/promises';
import { platform } from 'os';
import { join } from 'path';
import {
  ClientCapabilities,
  JSONSchema,
  SchemaConfiguration,
} from 'vscode-json-languageservice';
import { URI, Utils } from 'vscode-uri';

let currentBaseSchemas: SchemaConfiguration[] = [];
let currentExecutors: CollectionInfo[] | undefined;
let currentNxWorkspace: NxWorkspace | undefined;

function createBaseSchemas(
  projectJsonSchema: JSONSchema,
  packageJsonSchema: JSONSchema,
  nxSchema: JSONSchema,
): SchemaConfiguration[] {
  return [
    {
      uri: 'nx://schemas/project',
      fileMatch: ['**/project.json'],
      schema: projectJsonSchema,
    },
    {
      uri: 'nx://schemas/package',
      fileMatch: ['**/package.json'],
      schema: packageJsonSchema,
    },
    {
      uri: 'nx://schemas/nx',
      fileMatch: ['**/nx.json'],
      schema: nxSchema,
    },
  ];
}

export async function configureSchemas(
  workingPath: string | undefined,
  capabilities: ClientCapabilities | undefined,
  options?: { deferred?: boolean },
) {
  if (!workingPath) {
    lspLogger.log('No workspace path provided');
    return;
  }

  // we want to be able to provide schemas before the project graph is available
  // use empty executors and project nodes since getExecutors needs the project graph
  if (options?.deferred) {
    const nxVersion = await getNxVersion(workingPath);
    currentExecutors = [];

    const projectJsonSchema = mergeWithInstalledSchema(
      await readInstalledProjectSchema(workingPath),
      getProjectJsonSchema(currentExecutors, {}, nxVersion),
    );
    const packageJsonSchema = getPackageJsonSchema(projectJsonSchema);
    const nxSchema = await getNxJsonSchema(
      currentExecutors,
      {},
      nxVersion,
      workingPath,
    );

    currentBaseSchemas = createBaseSchemas(
      projectJsonSchema,
      packageJsonSchema,
      nxSchema,
    );

    _configureJsonLanguageService(
      capabilities,
      getProjectSchemas(),
      currentBaseSchemas,
    );
    return;
  }

  currentNxWorkspace = await nxWorkspace(workingPath, lspLogger);
  const { nxVersion, nxJson, projectGraph } = currentNxWorkspace;

  currentExecutors = await getExecutors(workingPath);
  const projectJsonSchema = mergeWithInstalledSchema(
    await readInstalledProjectSchema(workingPath),
    getProjectJsonSchema(currentExecutors, nxJson.targetDefaults, nxVersion),
  );

  const packageJsonSchema = getPackageJsonSchema(projectJsonSchema);

  const nxSchema = await getNxJsonSchema(
    currentExecutors,
    projectGraph.nodes,
    nxVersion,
    workingPath,
  );

  currentBaseSchemas = createBaseSchemas(
    projectJsonSchema,
    packageJsonSchema,
    nxSchema,
  );

  // recalculate project-specific schemas
  for (const key of projectSchemas.keys()) {
    const projectSchema = await getProjectSchema(key, workingPath);
    if (!projectSchema) {
      continue;
    }
    projectSchemas.set(key, projectSchema);
  }
  _configureJsonLanguageService(
    capabilities,
    getProjectSchemas(),
    currentBaseSchemas,
  );
}

const projectSchemas: Map<string, SchemaConfiguration> = new Map();

export function projectSchemaIsRegistered(projectRoot: string): boolean {
  return projectSchemas.has(projectRoot);
}

function getProjectSchemas(): SchemaConfiguration[] {
  return Array.from(projectSchemas.values());
}

/**
 * Configures the language server with a new schema for the current project.
 * This will reuse workspace info set by `configureSchemas` if available
 */
export async function configureSchemaForProject(
  projectRootPath: string,
  workingPath: string | undefined,
  capabilities: ClientCapabilities | undefined,
) {
  const projectSchema = await getProjectSchema(projectRootPath, workingPath);
  if (!projectSchema) {
    return;
  }

  projectSchemas.set(projectRootPath, projectSchema);

  _configureJsonLanguageService(
    capabilities,
    getProjectSchemas(),
    currentBaseSchemas,
  );
}

async function getProjectSchema(
  projectRootPath: string,
  workingPath: string | undefined,
): Promise<SchemaConfiguration | undefined> {
  if (!workingPath) {
    lspLogger.log(
      `No workspace path provided when configuring schema for ${projectRootPath}`,
    );
    return;
  }
  if (!currentNxWorkspace) {
    currentNxWorkspace = await nxWorkspace(workingPath, lspLogger);
  }
  if (!currentExecutors) {
    currentExecutors = await getExecutors(workingPath);
  }

  const project = await getProjectByRoot(projectRootPath, workingPath);
  if (!project) {
    return;
  }

  const { nxVersion } = currentNxWorkspace;

  const targetsProperties: Record<string, any> = {};
  Object.entries(project.targets ?? {}).forEach(([key, target]) => {
    const executor = target.executor ?? 'nx:run-commands';
    const matchingCollection = currentExecutors?.find(
      (e) => e.name === executor,
    );
    if (!matchingCollection) {
      return;
    }
    const schemaRef =
      platform() === 'win32'
        ? matchingCollection.schemaPath
        : `file://${matchingCollection.schemaPath}`;

    targetsProperties[key] = {
      properties: {
        options: {
          $ref: schemaRef,
        },
        configurations: {
          additionalProperties: {
            $ref: schemaRef,
            required: [],
          },
        },
      },
    };
  });

  return {
    uri: `nx://schemas/project-${project.name}`,
    fileMatch: [join(workingPath, projectRootPath, 'project.json')],
    schema: {
      type: 'object',
      properties: {
        sourceRoot: {
          type: 'string',
          'x-completion-type': CompletionType.directory,
        },
        implicitDependencies,
        tags,
        namedInputs: namedInputs(nxVersion),
        targets: {
          type: 'object',
          properties: targetsProperties,
        },
      },
    },
  };
}

/**
 * Nx ships the authoritative project.json schema with the installed package. It describes every
 * property of the file, while the schema built here only describes the parts that need workspace
 * knowledge - executors, project names, target names, inputs. Reading the installed one keeps the
 * two in step with whichever Nx version the workspace has.
 */
async function readInstalledProjectSchema(
  workspacePath: string,
): Promise<JSONSchema | undefined> {
  try {
    const schemaPath = await findNxPackagePath(
      workspacePath,
      join('schemas', 'project-schema.json'),
    );
    if (!schemaPath) {
      return undefined;
    }
    return await readAndParseJson(schemaPath);
  } catch (e) {
    lspLogger.log(`Unable to read the installed project.json schema: ${e}`);
    return undefined;
  }
}

function getPackageJsonSchema(projectJsonSchema: JSONSchema): JSONSchema {
  return {
    type: 'object',
    properties: {
      nx: projectJsonSchema,
    },
  };
}

function _configureJsonLanguageService(
  capabilities: ClientCapabilities | undefined,
  projectSchemas: SchemaConfiguration[],
  baseSchemas: SchemaConfiguration[],
) {
  configureJsonLanguageService(
    {
      schemaRequestService: getSchemaRequestService(['file']),
      workspaceContext: workspaceContextService,
      contributions: [],
      clientCapabilities: capabilities,
    },
    {
      schemas: [...projectSchemas, ...baseSchemas],
    },
  );
}
const workspaceContextService = {
  resolveRelativePath: (relativePath: string, resource: string) => {
    const base = resource.substring(0, resource.lastIndexOf('/') + 1);
    return Utils.resolvePath(URI.parse(base), relativePath).toString();
  },
};
