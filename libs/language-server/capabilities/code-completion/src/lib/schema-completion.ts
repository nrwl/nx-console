import {
  configureJsonLanguageService,
  getSchemaRequestService,
  lspLogger,
} from '@nx-console/language-server/utils';
import {
  getExecutors,
  nxWorkspace,
} from '@nx-console/language-server/workspace';
import {
  CompletionType,
  getNxJsonSchema,
  getPackageJsonSchema,
  getProjectJsonSchema,
  getWorkspaceJsonSchema,
  implicitDependencies,
  namedInputs,
  tags,
} from '@nx-console/shared/json-schema';
import { CollectionInfo } from '@nx-console/shared/schema';
import { NxWorkspace } from '@nx-console/shared/types';
import { platform } from 'os';
import {
  ClientCapabilities,
  SchemaConfiguration,
} from 'vscode-json-languageservice';

let currentBaseSchemas: SchemaConfiguration[] = [];
let currentExecutors: CollectionInfo[] | undefined;
let currentNxWorkspace: NxWorkspace | undefined;

export async function configureSchemas(
  workingPath: string | undefined,
  workspaceContext: {
    resolveRelativePath: (relativePath: string, resource: string) => string;
  },
  capabilities: ClientCapabilities | undefined
) {
  if (!workingPath) {
    lspLogger.log('No workspace path provided');
    return;
  }

  currentNxWorkspace = await nxWorkspace(workingPath, lspLogger);
  const { nxVersion, workspace } = currentNxWorkspace;

  currentExecutors = await getExecutors(workingPath);
  const workspaceSchema = getWorkspaceJsonSchema(currentExecutors);
  const projectSchema = getProjectJsonSchema(
    currentExecutors,
    workspace.targetDefaults,
    nxVersion
  );
  const packageSchema = getPackageJsonSchema(nxVersion);

  const nxSchema = getNxJsonSchema(
    currentExecutors,
    workspace.projects,
    nxVersion
  );

  currentBaseSchemas = [
    {
      uri: 'nx://schemas/workspace',
      fileMatch: ['**/workspace.json'],
      schema: workspaceSchema,
    },
    {
      uri: 'nx://schemas/project',
      fileMatch: ['**/project.json'],
      schema: projectSchema,
    },
    {
      uri: 'nx://schemas/package',
      fileMatch: ['**/package.json'],
      schema: packageSchema,
    },
    {
      uri: 'nx://schemas/nx',
      fileMatch: ['**/nx.json'],
      schema: nxSchema,
    },
  ];

  // recalculate project-specific schemas
  for (const key in projectSchemas.keys()) {
    const projectSchema = await getProjectSchema(key, workingPath);
    if (!projectSchema) {
      continue;
    }
    projectSchemas.set(key, projectSchema);
  }
  _configureJsonLanguageService(
    workspaceContext,
    capabilities,
    getProjectSchemas(),
    currentBaseSchemas
  );
}

const projectSchemas: Map<string, SchemaConfiguration> = new Map();

export function projectSchemaIsRegistered(projectName: string): boolean {
  return projectSchemas.has(projectName);
}

function getProjectSchemas(): SchemaConfiguration[] {
  return Array.from(projectSchemas.values());
}

/**
 * Configures the language server with a new schema for the current project.
 * This will reuse workspace info set by `configureSchemas` if available
 */
export async function configureSchemaForProject(
  projectName: string,
  workingPath: string | undefined,
  workspaceContext: {
    resolveRelativePath: (relativePath: string, resource: string) => string;
  },
  capabilities: ClientCapabilities | undefined
) {
  const projectSchema = await getProjectSchema(projectName, workingPath);
  if (!projectSchema) {
    return;
  }

  projectSchemas.set(projectName, projectSchema);

  _configureJsonLanguageService(
    workspaceContext,
    capabilities,
    getProjectSchemas(),
    currentBaseSchemas
  );
}

async function getProjectSchema(
  projectName: string,
  workingPath: string | undefined
): Promise<SchemaConfiguration | undefined> {
  if (!workingPath) {
    lspLogger.log(
      `No workspace path provided when configuring schema for ${projectName}`
    );
    return;
  }
  if (!currentNxWorkspace) {
    currentNxWorkspace = await nxWorkspace(workingPath, lspLogger);
  }
  if (!currentExecutors) {
    currentExecutors = await getExecutors(workingPath);
  }

  const { nxVersion, workspace } = currentNxWorkspace;

  const targetsProperties: Record<string, any> = {};
  Object.entries(workspace.projects[projectName]?.targets ?? {}).forEach(
    ([key, target]) => {
      const executor = target.executor ?? 'nx:run-commands';
      const matchingCollection = currentExecutors?.find(
        (e) => e.name === executor
      );
      if (!matchingCollection) {
        return;
      }
      const schemaRef =
        platform() === 'win32'
          ? matchingCollection?.path
          : `file://${matchingCollection?.path}`;

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
    }
  );
  return {
    uri: `nx://schemas/project-${projectName}`,
    fileMatch: [`**/${projectName}/project.json`],
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

function _configureJsonLanguageService(
  workspaceContext: {
    resolveRelativePath: (relativePath: string, resource: string) => string;
  },
  capabilities: ClientCapabilities | undefined,
  projectSchemas: SchemaConfiguration[],
  baseSchemas: SchemaConfiguration[]
) {
  configureJsonLanguageService(
    {
      schemaRequestService: getSchemaRequestService(['file']),
      workspaceContext,
      contributions: [],
      clientCapabilities: capabilities,
    },
    {
      schemas: [...projectSchemas, ...baseSchemas],
    }
  );
}
