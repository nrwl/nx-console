import { workspaceDependencyPath } from '@nx-console/shared-npm';
import {
  AITaskFixStatus,
  AITaskFixUserAction,
  CIPEExecutionStatus,
} from '@nx-console/shared-types';
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

export interface TaskInfo {
  taskId: string;
  runId: string;
  runUrl: string;
}

export interface CIInformationOutput {
  cipeStatus: CIPEExecutionStatus;
  cipeUrl: string;
  branch: string;
  commitSha: string | null;
  failedTasks: TaskInfo[];
  succeededTasks?: TaskInfo[];
  verifiedTaskIds: string[];
  selfHealingEnabled: boolean;
  selfHealingStatus: AITaskFixStatus | null;
  verificationStatus: AITaskFixStatus | null;
  userAction: AITaskFixUserAction | null;
  failureClassification: string | null;
  suggestedFixReasoning: string | null;
  suggestedFixDescription: string | null;
  suggestedFix: string | null;
  shortLink: string | null;
  couldAutoApplyTasks: boolean | null;
  autoApplySkipped: boolean | null;
  autoApplySkipReason: string | null;
  confidence: number | null;
  confidenceReasoning: string | null;
  selfHealingSkippedReason: string | null;
  selfHealingSkipMessage: string | null;
  error: string | null;
  hints?: string[];
  [key: string]: unknown;
}

export interface CITaskOutputOutput {
  taskId: string;
  terminalOutput: string | null;
  error: string | null;
  currentPage?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface UpdateSelfHealingFixOutput {
  success: boolean;
  message: string;
  aiFixId?: string | null;
  action?: string | null;
  shortLink?: string | null;
  hints?: string[];
  [key: string]: unknown;
}

export const updateSelfHealingFixOutputSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    aiFixId: { type: ['string', 'null'] },
    action: {
      type: ['string', 'null'],
      enum: ['APPLY', 'REJECT', 'RERUN_ENVIRONMENT_STATE', null],
    },
    shortLink: { type: ['string', 'null'] },
    hints: { type: 'array', items: { type: 'string' } },
  },
  required: ['success', 'message'],
};

export const ciInformationOutputSchema = {
  type: 'object',
  properties: {
    cipeStatus: {
      type: 'string',
      enum: [
        'NOT_STARTED',
        'IN_PROGRESS',
        'SUCCEEDED',
        'FAILED',
        'CANCELED',
        'TIMED_OUT',
      ],
    },
    cipeUrl: { type: 'string' },
    branch: { type: 'string' },
    commitSha: { type: ['string', 'null'] },
    failedTasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          runId: { type: 'string' },
          runUrl: { type: 'string' },
        },
      },
    },
    succeededTasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          runId: { type: 'string' },
          runUrl: { type: 'string' },
        },
      },
    },
    verifiedTaskIds: {
      type: 'array',
      items: { type: 'string' },
    },
    selfHealingEnabled: { type: 'boolean' },
    selfHealingStatus: {
      type: ['string', 'null'],
      enum: [
        'NOT_STARTED',
        'IN_PROGRESS',
        'COMPLETED',
        'FAILED',
        'NOT_EXECUTABLE',
        null,
      ],
    },
    verificationStatus: {
      type: ['string', 'null'],
      enum: [
        'NOT_STARTED',
        'IN_PROGRESS',
        'COMPLETED',
        'FAILED',
        'NOT_EXECUTABLE',
        null,
      ],
    },
    userAction: {
      type: ['string', 'null'],
      enum: [
        'NONE',
        'APPLIED',
        'REJECTED',
        'APPLIED_LOCALLY',
        'APPLIED_AUTOMATICALLY',
        null,
      ],
    },
    failureClassification: { type: ['string', 'null'] },
    suggestedFixReasoning: { type: ['string', 'null'] },
    suggestedFixDescription: { type: ['string', 'null'] },
    suggestedFix: { type: ['string', 'null'] },
    shortLink: { type: ['string', 'null'] },
    couldAutoApplyTasks: { type: ['boolean', 'null'] },
    autoApplySkipped: { type: ['boolean', 'null'] },
    autoApplySkipReason: { type: ['string', 'null'] },
    confidence: { type: ['number', 'null'] },
    confidenceReasoning: { type: ['string', 'null'] },
    selfHealingSkippedReason: { type: ['string', 'null'] },
    selfHealingSkipMessage: { type: ['string', 'null'] },
    error: { type: ['string', 'null'] },
    hints: { type: 'array', items: { type: 'string' } },
  },
};

export const ciTaskOutputOutputSchema = {
  type: 'object',
  properties: {
    taskId: { type: 'string' },
    terminalOutput: { type: ['string', 'null'] },
    error: { type: ['string', 'null'] },
    currentPage: { type: 'number' },
    totalPages: { type: 'number' },
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
    const projectSchema = relaxProjectSchema(JSON.parse(projectSchemaContent));

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

/**
 * Nx's project-schema.json describes hand-written project.json files and can lag
 * behind what Nx plugins put into the project graph (e.g. `dependsOn[].options`
 * from @nx/cypress 24 is in Nx's types but not in the schema). MCP clients
 * reject the whole tool result when structuredContent doesn't match the
 * outputSchema, so the borrowed schema must not forbid unknown properties.
 * Its `oneOf` branches only stay mutually exclusive through
 * `additionalProperties: false`, so they become `anyOf`.
 */
export function relaxProjectSchema<T>(schema: T): T {
  if (Array.isArray(schema)) {
    return schema.map((item) => relaxProjectSchema(item)) as T;
  }
  if (!schema || typeof schema !== 'object') {
    return schema;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'additionalProperties' && value === false) {
      continue;
    }
    result[key === 'oneOf' ? 'anyOf' : key] = relaxProjectSchema(value);
  }
  return result as T;
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
