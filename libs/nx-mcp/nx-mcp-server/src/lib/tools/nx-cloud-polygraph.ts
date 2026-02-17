import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  CLOUD_POLYGRAPH_ASSOCIATE_PR,
  CLOUD_POLYGRAPH_CANDIDATES,
  CLOUD_POLYGRAPH_CHILD_STATUS,
  CLOUD_POLYGRAPH_CREATE_PRS,
  CLOUD_POLYGRAPH_DELEGATE,
  CLOUD_POLYGRAPH_INIT,
  CLOUD_POLYGRAPH_MARK_READY,
  CLOUD_POLYGRAPH_PUSH_BRANCH,
  CLOUD_POLYGRAPH_GET_SESSION,
  CLOUD_POLYGRAPH_STOP_CHILD,
} from '@nx-console/shared-llm-context';
import { Logger } from '@nx-console/shared-utils';
import { z } from 'zod';
import { isToolEnabled } from '../tool-filter';
import { ToolRegistry } from '../tool-registry';
import { randomUUID } from 'node:crypto';
import {
  getNxCloudId,
  getNxCloudUrl,
  nxCloudAuthHeaders,
} from '@nx-console/shared-nx-cloud';
import { ensureCloudLightClient } from './ensure-cloud-light-client';

const CLOUD_CLIENT_MISSING_RESULT: CallToolResult = {
  content: [
    {
      type: 'text',
      text: 'The Nx Cloud client bundle is missing. An automatic download was attempted but failed. Try running `npx nx@latest download-cloud-client` manually and check your network connection.',
    },
  ],
  isError: true,
};

const polygraphInitSchema = z.object({
  setSessionId: z
    .string()
    .optional()
    .describe(
      'Optional session ID to use. If provided, takes precedence over CLAUDE_CODE_SESSION_ID env var and random generation.',
    ),
  selectedWorkspaceIds: z
    .array(z.string())
    .optional()
    .describe(
      'Optional list of workspace IDs to include in the session. Use cloud_polygraph_candidates to discover available workspaces first. If omitted, all connected workspaces are included.',
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
  return { content: [{ type: 'text', text: result.message }] };
}

function registerInit(
  toolsFilter: string[] | undefined,
  logger: Logger,
  registry: ToolRegistry,
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
        const nxCloudClient = await ensureCloudLightClient(
          logger,
          workspacePath,
        );
        if (typeof nxCloudClient?.polygraphInit !== 'function') {
          return CLOUD_CLIENT_MISSING_RESULT;
        }

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
            selectedWorkspaceIds: params.selectedWorkspaceIds,
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
        const nxCloudClient = await ensureCloudLightClient(
          logger,
          workspacePath,
        );
        if (typeof nxCloudClient?.polygraphDelegate !== 'function') {
          return CLOUD_CLIENT_MISSING_RESULT;
        }

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
        const nxCloudClient = await ensureCloudLightClient(
          logger,
          workspacePath,
        );
        if (typeof nxCloudClient?.polygraphPushBranch !== 'function') {
          return CLOUD_CLIENT_MISSING_RESULT;
        }

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
  plan: z
    .string()
    .optional()
    .describe(
      'The plan/context for the Polygraph session. Saved to the session for future resumption.',
    ),
  agentSessionId: z
    .string()
    .optional()
    .describe(
      'The Claude agent session ID. Can be used to resume the session later with `claude --resume {agentSessionId}`.',
    ),
});

function registerCreatePRs(
  toolsFilter: string[] | undefined,
  logger: Logger,
  registry: ToolRegistry,
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
        const nxCloudClient = await ensureCloudLightClient(
          logger,
          workspacePath,
        );
        if (typeof nxCloudClient?.polygraphCreatePRs !== 'function') {
          return CLOUD_CLIENT_MISSING_RESULT;
        }

        const { sessionId, prs, plan, agentSessionId } = params as z.infer<
          typeof createPRsSchema
        >;

        try {
          const nxCloudUrl = await getNxCloudUrl(workspacePath);
          const authHeaders = await nxCloudAuthHeaders(workspacePath);

          const result = await nxCloudClient.polygraphCreatePRs(logger, {
            sessionId,
            nxCloudUrl,
            authHeaders,
            workspacePath,
            plan,
            agentSessionId,
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
        'Get the specified Polygraph session. Returns session url, status, plan, agentSessionId, and associated pull requests across repositories. The agentSessionId can be used to resume a Claude session with `claude --resume {agentSessionId}`.',
      inputSchema: getSessionSchema.shape,
      annotations: {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: true,
      },
      handler: async (params): Promise<CallToolResult> => {
        const nxCloudClient = await ensureCloudLightClient(
          logger,
          workspacePath,
        );
        if (typeof nxCloudClient?.polygraphGetSession !== 'function') {
          return CLOUD_CLIENT_MISSING_RESULT;
        }

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
  plan: z
    .string()
    .optional()
    .describe(
      'The plan/context for the Polygraph session. Saved to the session for future resumption.',
    ),
  agentSessionId: z
    .string()
    .optional()
    .describe(
      'The Claude agent session ID. Can be used to resume the session later with `claude --resume {agentSessionId}`.',
    ),
});

function registerMarkReady(
  toolsFilter: string[] | undefined,
  logger: Logger,
  registry: ToolRegistry,
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
        const nxCloudClient = await ensureCloudLightClient(
          logger,
          workspacePath,
        );
        if (typeof nxCloudClient?.polygraphMarkReady !== 'function') {
          return CLOUD_CLIENT_MISSING_RESULT;
        }

        const { sessionId, prUrls, plan, agentSessionId } = params;

        try {
          const nxCloudUrl = await getNxCloudUrl(workspacePath);
          const authHeaders = await nxCloudAuthHeaders(workspacePath);

          const result = await nxCloudClient.polygraphMarkReady(logger, {
            sessionId,
            nxCloudUrl,
            authHeaders,
            prUrls,
            plan,
            agentSessionId,
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

const stopChildSchema = z.object({
  sessionId: z.string().describe('The Polygraph session ID'),
  target: z.string().describe('Repository name or workspace ID to stop'),
});

function registerStopChild(
  toolsFilter: string[] | undefined,
  logger: Logger,
  registry: ToolRegistry,
  workspacePath: string,
) {
  if (!isToolEnabled(CLOUD_POLYGRAPH_STOP_CHILD, toolsFilter)) {
    logger.debug?.(
      `Skipping ${CLOUD_POLYGRAPH_STOP_CHILD} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: CLOUD_POLYGRAPH_STOP_CHILD,
      description:
        'Stop a running child agent in a Polygraph session. Use this to terminate a delegated task that is still running.',
      inputSchema: stopChildSchema.shape,
      annotations: {
        destructiveHint: true,
        readOnlyHint: false,
        openWorldHint: true,
      },
      handler: async (params): Promise<CallToolResult> => {
        const nxCloudClient = await ensureCloudLightClient(
          logger,
          workspacePath,
        );
        if (typeof nxCloudClient?.polygraphStopChild !== 'function') {
          return CLOUD_CLIENT_MISSING_RESULT;
        }
        try {
          const result = await nxCloudClient.polygraphStopChild(logger, {
            ...params,
            workspacePath,
          });

          if (result.success) {
            return {
              content: [{ type: 'text', text: result.output }],
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

const childStatusSchema = z.object({
  sessionId: z.string().describe('The Polygraph session ID'),
  target: z
    .string()
    .optional()
    .describe(
      'Specific repository name or workspace ID to check. If omitted, returns status for all children.',
    ),
  tail: z
    .number()
    .optional()
    .describe('Number of output lines to return (default 50)'),
});

function registerChildStatus(
  toolsFilter: string[] | undefined,
  logger: Logger,
  registry: ToolRegistry,
  workspacePath: string,
) {
  if (!isToolEnabled(CLOUD_POLYGRAPH_CHILD_STATUS, toolsFilter)) {
    logger.debug?.(
      `Skipping ${CLOUD_POLYGRAPH_CHILD_STATUS} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: CLOUD_POLYGRAPH_CHILD_STATUS,
      description:
        'Get the status and recent output of child agents in a Polygraph session. Use this to monitor progress of delegated tasks.',
      inputSchema: childStatusSchema.shape,
      annotations: {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: true,
      },
      handler: async (params): Promise<CallToolResult> => {
        const nxCloudClient = await ensureCloudLightClient(
          logger,
          workspacePath,
        );
        if (typeof nxCloudClient?.polygraphChildStatus !== 'function') {
          return CLOUD_CLIENT_MISSING_RESULT;
        }
        try {
          const result = await nxCloudClient.polygraphChildStatus(logger, {
            ...params,
            workspacePath,
          });

          if (result.success) {
            return {
              content: [
                { type: 'text', text: JSON.stringify(result.children) },
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

const associatePRSchema = z.object({
  sessionId: z.string().describe('The Polygraph session ID'),
  prUrl: z
    .string()
    .optional()
    .describe('URL of an existing pull request to associate with the session'),
  branch: z
    .string()
    .optional()
    .describe(
      'Branch name to find and associate PRs for. Used when prUrl is not provided.',
    ),
  plan: z
    .string()
    .optional()
    .describe(
      'The plan/context for the Polygraph session. Saved to the session for future resumption.',
    ),
  agentSessionId: z
    .string()
    .optional()
    .describe(
      'The Claude agent session ID. Can be used to resume the session later with `claude --resume {agentSessionId}`.',
    ),
});

function registerAssociatePR(
  toolsFilter: string[] | undefined,
  logger: Logger,
  registry: ToolRegistry,
  workspacePath: string,
) {
  if (!isToolEnabled(CLOUD_POLYGRAPH_ASSOCIATE_PR, toolsFilter)) {
    logger.debug?.(
      `Skipping ${CLOUD_POLYGRAPH_ASSOCIATE_PR} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: CLOUD_POLYGRAPH_ASSOCIATE_PR,
      description:
        'Associate an existing pull request with a Polygraph session. Use this to link PRs that were created outside of Polygraph (e.g., manually or by CI) to the current session. Provide either a prUrl or a branch name.',
      inputSchema: associatePRSchema.shape,
      annotations: {
        destructiveHint: false,
        readOnlyHint: false,
        openWorldHint: true,
      },
      handler: async (params): Promise<CallToolResult> => {
        const nxCloudClient = await ensureCloudLightClient(
          logger,
          workspacePath,
        );
        if (typeof nxCloudClient?.polygraphAssociatePR !== 'function') {
          return CLOUD_CLIENT_MISSING_RESULT;
        }

        const { sessionId, prUrl, branch, plan, agentSessionId } = params;

        try {
          const nxCloudUrl = await getNxCloudUrl(workspacePath);
          const authHeaders = await nxCloudAuthHeaders(workspacePath);

          const result = await nxCloudClient.polygraphAssociatePR(logger, {
            sessionId,
            nxCloudUrl,
            authHeaders,
            prUrl,
            branch,
            plan,
            agentSessionId,
          });

          if (result.success) {
            const prCount = result.prs?.length ?? 0;
            let output = `Associated ${prCount} PR(s) with session ${result.sessionId}:\n`;
            for (const pr of result.prs ?? []) {
              output += `- ${pr.title} [${pr.status}]: ${pr.url}\n`;
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

function registerCandidates(
  toolsFilter: string[] | undefined,
  logger: Logger,
  registry: ToolRegistry,
  workspacePath: string,
) {
  if (!isToolEnabled(CLOUD_POLYGRAPH_CANDIDATES, toolsFilter)) {
    logger.debug?.(
      `Skipping ${CLOUD_POLYGRAPH_CANDIDATES} - disabled by tools filter`,
    );
  } else {
    registry.registerTool({
      name: CLOUD_POLYGRAPH_CANDIDATES,
      description:
        'Discover candidate workspaces for a Polygraph session. Returns the initiator workspace and all connected workspaces with their descriptions and dependency graph relationships (distance, direction, path). Use this before cloud_polygraph_init to understand which repositories are available and optionally select a subset via selectedWorkspaceIds.',
      inputSchema: {},
      annotations: {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: true,
      },
      handler: async (): Promise<CallToolResult> => {
        const nxCloudClient = await ensureCloudLightClient(
          logger,
          workspacePath,
        );
        if (typeof nxCloudClient?.polygraphGetCandidates !== 'function') {
          return CLOUD_CLIENT_MISSING_RESULT;
        }

        try {
          const result = await nxCloudClient.polygraphGetCandidates(logger, {
            nxCloudUrl: await getNxCloudUrl(workspacePath),
            authHeaders: await nxCloudAuthHeaders(workspacePath),
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

export function registerPolygraphTools(
  workspacePath: string,
  registry: ToolRegistry,
  logger: Logger,
  toolsFilter?: string[],
) {
  registerCandidates(toolsFilter, logger, registry, workspacePath);
  registerInit(toolsFilter, logger, registry, workspacePath);
  registerDelegate(toolsFilter, logger, registry, workspacePath);
  registerPushBranch(toolsFilter, logger, registry, workspacePath);
  registerCreatePRs(toolsFilter, logger, registry, workspacePath);
  registerGetSession(toolsFilter, logger, registry, workspacePath);
  registerMarkReady(toolsFilter, logger, registry, workspacePath);
  registerStopChild(toolsFilter, logger, registry, workspacePath);
  registerChildStatus(toolsFilter, logger, registry, workspacePath);
  registerAssociatePR(toolsFilter, logger, registry, workspacePath);
}
