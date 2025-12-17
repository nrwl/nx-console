import { workspaceDependencyPath } from '@nx-console/shared-npm';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface NxOutputSchemas {
  nxWorkspaceOutputSchema: Record<string, unknown>;
  nxProjectDetailsOutputSchema: Record<string, unknown>;
}

export interface NxWorkspaceOutput {
  projects: Array<{ name: string } & Record<string, unknown>>;
  dependencies: Record<string, Array<{ target: string; type?: string }>>;
  nxJson?: Record<string, unknown>;
  errors?: Array<{ message: string }>;
  [key: string]: unknown;
}

export interface NxProjectDetailsOutput {
  name: string;
  projectDependencies: string[];
  externalDependencies: string[];
  [key: string]: unknown;
}

export async function loadNxOutputSchemas(
  workspacePath: string,
): Promise<NxOutputSchemas> {
  const nxPath = await workspaceDependencyPath(workspacePath, 'nx');
  if (!nxPath) {
    return getFallbackSchemas();
  }

  try {
    const projectSchemaPath = join(nxPath, 'schemas', 'project-schema.json');
    const projectSchemaContent = await readFile(projectSchemaPath, 'utf-8');
    const projectSchema = JSON.parse(projectSchemaContent);

    const nxWorkspaceOutputSchema = {
      type: 'object',
      properties: {
        projects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              ...projectSchema.properties,
            },
          },
        },
        dependencies: {
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: { type: 'object' },
          },
        },
        nxJson: { type: 'object', additionalProperties: true },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: { message: { type: 'string' } },
          },
        },
      },
      definitions: projectSchema.definitions,
    };

    const nxProjectDetailsOutputSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        ...projectSchema.properties,
        projectDependencies: { type: 'array', items: { type: 'string' } },
        externalDependencies: { type: 'array', items: { type: 'string' } },
      },
      definitions: projectSchema.definitions,
    };

    return { nxWorkspaceOutputSchema, nxProjectDetailsOutputSchema };
  } catch {
    return getFallbackSchemas();
  }
}

function getFallbackSchemas(): NxOutputSchemas {
  return {
    nxWorkspaceOutputSchema: { type: 'object', additionalProperties: true },
    nxProjectDetailsOutputSchema: {
      type: 'object',
      additionalProperties: true,
    },
  };
}
