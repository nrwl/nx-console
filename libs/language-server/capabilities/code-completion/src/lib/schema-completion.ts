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
  getNxJsonSchema,
  getPackageJsonSchema,
  getProjectJsonSchema,
  getWorkspaceJsonSchema,
} from '@nx-console/shared/json-schema';
import {
  ClientCapabilities,
  LanguageSettings,
} from 'vscode-json-languageservice';
let currentBaseLanguageSettings: LanguageSettings | undefined;

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

  const { workspace, nxVersion } = await nxWorkspace(workingPath, lspLogger);
  const collections = await getExecutors(workingPath);
  const workspaceSchema = getWorkspaceJsonSchema(collections);
  const projectSchema = getProjectJsonSchema(
    collections,
    workspace.targetDefaults,
    nxVersion
  );
  const packageSchema = getPackageJsonSchema(nxVersion);

  const nxSchema = getNxJsonSchema(collections, workspace.projects, nxVersion);
  currentBaseLanguageSettings = {
    schemas: [
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
    ],
  };

  configureJsonLanguageService(
    {
      schemaRequestService: getSchemaRequestService(['file']),
      workspaceContext,
      contributions: [],
      clientCapabilities: capabilities,
    },
    currentBaseLanguageSettings
  );
}
