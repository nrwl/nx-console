import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  CLOUD_POLYGRAPH_DELEGATE,
  CLOUD_POLYGRAPH_INIT,
} from '@nx-console/shared-llm-context';
import { Logger } from '@nx-console/shared-utils';
import { z } from 'zod';
import { isToolEnabled } from '../tool-filter';
import { ToolRegistry } from '../tool-registry';
import { join } from 'path';
import { readdirSync, statSync } from 'fs';
import { randomUUID } from 'node:crypto';
import {
  getNxCloudId,
  getNxCloudUrl,
  nxCloudAuthHeaders,
} from '@nx-console/shared-nx-cloud';

const polygraphInitSchema = z.object({
  setSessionId: z
    .string()
    .optional()
    .describe(
      'Optional session ID to use. If provided, takes precedence over CLAUDE_CODE_SESSION_ID env var and random generation.',
    ),
});

const delegateToRepoSchema = z.object({
  sessionId: z.string().describe('The Polygraph session ID'),
  target: z.string().describe('Repository name or workspace ID to delegate to'),
  instruction: z.string().describe('Task instruction for the child agent'),
  context: z.string().optional().describe('Background context about the task'),
});

function initResultToCallToolResult(result: any): CallToolResult {
  if (result.success === false) {
    return { content: [{ type: 'text', text: result.error }], isError: true };
  }
  return { content: [{ type: 'text', text: result.clonesSummary }] };
}

function delegateResultToCallToolResult(result: any): CallToolResult {
  if (result.success === false) {
    return { content: [{ type: 'text', text: result.error }], isError: true };
  }
  return { content: [{ type: 'text', text: result.output }] };
}

function getCloudLightClient(logger: Logger, workspacePath: string): any {
  let cacheDir;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cacheDir = require(
      require.resolve('nx/src/devkit-exports', {
        paths: [`${workspacePath}/node_modules`],
      }),
    ).cacheDir;
  } catch (e: any) {
    if (process.env.NX_VERBOSE_LOGGING === 'true') {
      logger.log(`Could not read cache directory: ${e.message}`);
    }
    return null;
  }

  const cloudLocation = join(cacheDir, 'cloud');
  let lightClientBundle;
  try {
    const installedBundles = readdirSync(cloudLocation)
      .filter((potentialDirectory) => {
        return statSync(join(cloudLocation, potentialDirectory)).isDirectory();
      })
      .map((fileOrDirectory) => ({
        version: fileOrDirectory,
        fullPath: join(cloudLocation, fileOrDirectory),
      }));

    if (installedBundles.length === 0) {
      if (process.env.NX_VERBOSE_LOGGING === 'true') {
        logger.log(`No installed bundles`);
      }

      // No installed bundles
      return null;
    }

    lightClientBundle = installedBundles[0];
  } catch (e: any) {
    if (process.env.NX_VERBOSE_LOGGING === 'true') {
      logger.log('Could not read runner bundle path:', e.message);
    }
    return null;
  }

  let nxCloudClient;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    nxCloudClient = require(
      lightClientBundle.fullPath + '/lib/polygraph/polygraph-handlers.js',
    );
  } catch (e: any) {
    if (process.env.NX_VERBOSE_LOGGING === 'true') {
      logger.log(`Could not load Polygraph client: ${e.message}`);
    }
    return null;
  }
  return nxCloudClient;
}

function registerInit(
  toolsFilter: string[] | undefined,
  logger: Logger,
  registry: ToolRegistry,
  nxCloudClient: any,
  workspacePath: string,
) {
  if (!isToolEnabled(CLOUD_POLYGRAPH_INIT, toolsFilter)) {
    logger.debug?.(
      `Skipping ${CLOUD_POLYGRAPH_INIT} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: CLOUD_POLYGRAPH_INIT,
      description: 'Initialize Polygraph for the Nx Cloud workspace.',
      inputSchema: polygraphInitSchema.shape,
      annotations: {
        destructiveHint: false,
        readOnlyHint: false,
        openWorldHint: true,
      },
      handler: async (params): Promise<CallToolResult> => {
        const sessionId =
          params.setSessionId ??
          process.env.CLAUDE_CODE_SESSION_ID ??
          randomUUID();

        try {
          const result = await nxCloudClient.polygraphInit(logger, {
            sessionId,
            nxCloudId: await getNxCloudId(workspacePath),
            nxCloudUrl: await getNxCloudUrl(workspacePath),
            authHeaders: await nxCloudAuthHeaders(workspacePath),
            workspacePath,
          });
          return initResultToCallToolResult(result);
        } catch (e: any) {
          return {
            content: [{ type: 'text', text: e.message ?? String(e) }],
            isError: true,
          };
        }
      },
    });
  }
}

function registerDelegate(
  toolsFilter: string[] | undefined,
  logger: Logger,
  registry: ToolRegistry,
  workspacePath: string,
  nxCloudClient: any,
) {
  if (!isToolEnabled(CLOUD_POLYGRAPH_DELEGATE, toolsFilter)) {
    logger.debug?.(
      `Skipping ${CLOUD_POLYGRAPH_DELEGATE} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: CLOUD_POLYGRAPH_DELEGATE,
      description:
        'Delegate a task to a child Claude agent in a dependent repository. The child agent will execute the task in that repo and return the result. Use this after initializing a Polygraph session with cloud_polygraph_init.',
      inputSchema: delegateToRepoSchema.shape,
      annotations: {
        destructiveHint: false,
        readOnlyHint: false,
        openWorldHint: true,
      },
      handler: async (params): Promise<CallToolResult> => {
        try {
          const delegateParams = { ...params, workspacePath };
          logger.log(
            `polygraphDelegate args: ${JSON.stringify(Object.keys(delegateParams))}`,
          );
          logger.log(
            `nxCloudClient exports: ${nxCloudClient.polygraphDelegate.toString()}`,
          );
          const result = await nxCloudClient.polygraphDelegate(
            logger,
            delegateParams,
          );
          return delegateResultToCallToolResult(result);
        } catch (e: any) {
          return {
            content: [{ type: 'text', text: e.message ?? String(e) }],
            isError: true,
          };
        }
      },
    });
  }
}

export function registerPolygraphTools(
  workspacePath: string,
  registry: ToolRegistry,
  logger: Logger,
  toolsFilter?: string[],
) {
  const nxCloudClient = getCloudLightClient(logger, workspacePath);
  if (nxCloudClient == null) return;
  registerInit(toolsFilter, logger, registry, nxCloudClient, workspacePath);
  registerDelegate(toolsFilter, logger, registry, workspacePath, nxCloudClient);
}
