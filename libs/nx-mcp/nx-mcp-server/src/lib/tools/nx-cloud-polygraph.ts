import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  CLOUD_POLYGRAPH_CREATE_PRS,
  CLOUD_POLYGRAPH_DELEGATE,
  CLOUD_POLYGRAPH_INIT,
  CLOUD_POLYGRAPH_MARK_READY,
  CLOUD_POLYGRAPH_PUSH_BRANCH,
  CLOUD_POLYGRAPH_GET_SESSION,
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

const pushBranchSchema = z.object({
  sessionId: z.string().describe('The Polygraph session ID'),
  repoPath: z
    .string()
    .describe('Absolute file system path to the local git repository'),
  branch: z
    .string()
    .describe('Branch name to push to remote (e.g., "feature/my-changes")'),
});

function registerPushBranch(
  toolsFilter: string[] | undefined,
  logger: Logger,
  registry: ToolRegistry,
  nxCloudClient: any,
  workspacePath: string,
) {
  if (!isToolEnabled(CLOUD_POLYGRAPH_PUSH_BRANCH, toolsFilter)) {
    logger.debug?.(
      `Skipping ${CLOUD_POLYGRAPH_PUSH_BRANCH} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: CLOUD_POLYGRAPH_PUSH_BRANCH,
      description:
        'Push a local git branch to the remote repository. Use this after making commits in a delegated repository, before creating a PR. Requires an active Polygraph session.',
      inputSchema: pushBranchSchema.shape,
      annotations: {
        destructiveHint: false,
        readOnlyHint: false,
        openWorldHint: true,
      },
      handler: async (params): Promise<CallToolResult> => {
        const { sessionId, repoPath, branch } = params;

        try {
          const nxCloudUrl = await getNxCloudUrl(workspacePath);
          const authHeaders = await nxCloudAuthHeaders(workspacePath);

          const result = await nxCloudClient.polygraphPushBranch(logger, {
            repoPath,
            branch,
            sessionId,
            nxCloudUrl,
            authHeaders,
            workspacePath,
          });

          if (result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Successfully pushed branch "${branch}" to remote`,
                },
              ],
            };
          }
          return {
            content: [{ type: 'text', text: result.error }],
            isError: true,
          };
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

const createPRsSchema = z.object({
  sessionId: z.string().describe('The Polygraph session ID'),
  prs: z
    .array(
      z.object({
        owner: z.string().describe('GitHub repository owner'),
        repo: z.string().describe('GitHub repository name'),
        title: z.string().describe('PR title'),
        body: z
          .string()
          .describe(
            'PR description body (session metadata appended automatically)',
          ),
        branch: z.string().describe('Branch name that was pushed'),
      }),
    )
    .describe('Array of PR specifications to create'),
});

function registerCreatePRs(
  toolsFilter: string[] | undefined,
  logger: Logger,
  registry: ToolRegistry,
  nxCloudClient: any,
  workspacePath: string,
) {
  if (!isToolEnabled(CLOUD_POLYGRAPH_CREATE_PRS, toolsFilter)) {
    logger.debug?.(
      `Skipping ${CLOUD_POLYGRAPH_CREATE_PRS} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: CLOUD_POLYGRAPH_CREATE_PRS,
      description:
        'Create draft pull requests for one or more repositories in a Polygraph session. Each PR includes session metadata linking it to related PRs across repos. Branches must be pushed first using cloud_polygraph_push_branch.',
      inputSchema: createPRsSchema.shape,
      annotations: {
        destructiveHint: false,
        readOnlyHint: false,
        openWorldHint: true,
      },
      handler: async (params): Promise<CallToolResult> => {
        const { sessionId, prs } = params as z.infer<typeof createPRsSchema>;

        try {
          const nxCloudUrl = await getNxCloudUrl(workspacePath);
          const authHeaders = await nxCloudAuthHeaders(workspacePath);

          const result = await nxCloudClient.polygraphCreatePRs(logger, {
            sessionId,
            nxCloudUrl,
            authHeaders,
            workspacePath,
            prs: prs.map((pr) => ({
              title: pr.title,
              body: pr.body,
              headBranch: pr.branch,
              owner: pr.owner,
              repo: pr.repo,
            })),
          });

          if (result.success) {
            const successCount = result.results.filter(
              (r: any) => r.success,
            ).length;
            const totalCount = result.results.length;

            let output = `Created ${successCount}/${totalCount} PRs:\n`;
            for (const item of result.results) {
              if (item.success) {
                output += `- ${item.owner}/${item.repo}: ${item.url} (draft)\n`;
              } else {
                output += `- ${item.owner}/${item.repo}: FAILED - ${item.error}\n`;
              }
            }

            return {
              content: [{ type: 'text', text: output }],
            };
          }

          return {
            content: [{ type: 'text', text: result.error }],
            isError: true,
          };
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

const getSessionSchema = z.object({
  sessionId: z.string().describe('The Polygraph session ID'),
});

function registerGetSession(
  toolsFilter: string[] | undefined,
  logger: Logger,
  registry: ToolRegistry,
  nxCloudClient: any,
  workspacePath: string,
) {
  if (!isToolEnabled(CLOUD_POLYGRAPH_GET_SESSION, toolsFilter)) {
    logger.debug?.(
      `Skipping ${CLOUD_POLYGRAPH_GET_SESSION} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: CLOUD_POLYGRAPH_GET_SESSION,
      description:
        'Get the specified Polygraph session. Returns session url, status, and associated pull requests across repositories.',
      inputSchema: getSessionSchema.shape,
      annotations: {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: true,
      },
      handler: async (params): Promise<CallToolResult> => {
        const { sessionId } = params;

        try {
          const nxCloudUrl = await getNxCloudUrl(workspacePath);
          const authHeaders = await nxCloudAuthHeaders(workspacePath);

          const result = await nxCloudClient.polygraphGetSession(logger, {
            sessionId,
            nxCloudUrl,
            authHeaders,
          });

          if (result.success) {
            return {
              content: [{ type: 'text', text: JSON.stringify(result) }],
            };
          }

          return {
            content: [{ type: 'text', text: result.error }],
            isError: true,
          };
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

const markReadySchema = z.object({
  sessionId: z.string().describe('The Polygraph session ID'),
  prUrls: z
    .array(z.string())
    .describe('URLs of the pull requests to mark as ready for review'),
});

function registerMarkReady(
  toolsFilter: string[] | undefined,
  logger: Logger,
  registry: ToolRegistry,
  nxCloudClient: any,
  workspacePath: string,
) {
  if (!isToolEnabled(CLOUD_POLYGRAPH_MARK_READY, toolsFilter)) {
    logger.debug?.(
      `Skipping ${CLOUD_POLYGRAPH_MARK_READY} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: CLOUD_POLYGRAPH_MARK_READY,
      description:
        'Mark specified draft pull requests in a Polygraph session as ready for review. Provide PR URLs to transition from DRAFT to OPEN status. Use after cross-repo changes are verified.',
      inputSchema: markReadySchema.shape,
      annotations: {
        destructiveHint: false,
        readOnlyHint: false,
        openWorldHint: true,
      },
      handler: async (params): Promise<CallToolResult> => {
        const { sessionId, prUrls } = params;

        try {
          const nxCloudUrl = await getNxCloudUrl(workspacePath);
          const authHeaders = await nxCloudAuthHeaders(workspacePath);

          const result = await nxCloudClient.polygraphMarkReady(logger, {
            sessionId,
            nxCloudUrl,
            authHeaders,
            prUrls,
          });

          if (result.success) {
            const successCount = result.results.filter(
              (r: any) => r.success,
            ).length;
            const totalCount = result.results.length;

            let output = `Marked ${successCount}/${totalCount} PRs as ready:\n`;
            for (const item of result.results) {
              if (item.success) {
                output += `- ${item.url}: ready\n`;
              } else {
                output += `- ${item.url}: FAILED - ${item.error}\n`;
              }
            }

            return {
              content: [{ type: 'text', text: output }],
            };
          }

          return {
            content: [{ type: 'text', text: result.error }],
            isError: true,
          };
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

  // TODO(cammisuli): have a way to download the client automatically if not present
  if (nxCloudClient == null) {
    logger.log(
      'Polygraph tools not registered: could not load Nx Cloud light client',
    );
    return;
  }
  registerInit(toolsFilter, logger, registry, nxCloudClient, workspacePath);
  registerDelegate(toolsFilter, logger, registry, workspacePath, nxCloudClient);
  registerPushBranch(
    toolsFilter,
    logger,
    registry,
    nxCloudClient,
    workspacePath,
  );
  registerCreatePRs(
    toolsFilter,
    logger,
    registry,
    nxCloudClient,
    workspacePath,
  );
  registerGetSession(
    toolsFilter,
    logger,
    registry,
    nxCloudClient,
    workspacePath,
  );
  registerMarkReady(
    toolsFilter,
    logger,
    registry,
    nxCloudClient,
    workspacePath,
  );
}
