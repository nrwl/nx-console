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

export interface SelfHealingContextOutput {
  branch: string | null;
  commitSha: string | null;
  aiFixId: string | null;
  suggestedFix: string | null;
  suggestedFixDescription: string | null;
  suggestedFixReasoning: string | null;
  suggestedFixStatus: string;
  prTitle: string | null;
  prBody: string | null;
  taskIds: string[] | null;
  taskOutputSummary: string | null;
  shortLink: string | null;
  [key: string]: unknown;
}

export const selfHealingContextOutputSchema = {
  type: 'object',
  properties: {
    branch: { type: ['string', 'null'] },
    commitSha: { type: ['string', 'null'] },
    aiFixId: { type: ['string', 'null'] },
    suggestedFix: { type: ['string', 'null'] },
    suggestedFixDescription: { type: ['string', 'null'] },
    suggestedFixReasoning: { type: ['string', 'null'] },
    suggestedFixStatus: { type: 'string' },
    prTitle: { type: ['string', 'null'] },
    prBody: { type: ['string', 'null'] },
    taskIds: {
      type: ['array', 'null'],
      items: { type: 'string' },
    },
    taskOutputSummary: { type: ['string', 'null'] },
    shortLink: { type: ['string', 'null'] },
  },
};

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
