import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  McpError,
  ErrorCode,
  CallToolResult,
  GetTaskRequestSchema,
  GetTaskPayloadRequestSchema,
  ListTasksRequestSchema,
  CancelTaskRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  InMemoryTaskStore,
  CreateTaskOptions,
} from '@modelcontextprotocol/sdk/experimental';
import { ZodRawShape, z, toJSONSchema } from 'zod';

type SchemaInput = ZodRawShape | Record<string, unknown>;

function isZodShape(input: SchemaInput): input is ZodRawShape {
  return Object.values(input).some(
    (v) =>
      v &&
      typeof v === 'object' &&
      'parse' in v &&
      typeof v.parse === 'function',
  );
}

function toJsonSchema(
  input: SchemaInput | undefined,
): Record<string, unknown> | undefined {
  if (!input) return undefined;
  if (isZodShape(input)) {
    const { $schema, ...schema } = toJSONSchema(z.object(input)) as Record<
      string,
      unknown
    >;
    return schema;
  }
  return input;
}

export interface ToolExecution {
  taskSupport?: 'forbidden' | 'optional' | 'required';
}

export interface TaskHandlerContext {
  taskId: string;
  updateStatus: (statusMessage: string) => void;
  sendProgress: (
    progress: number,
    total: number | null,
    message: string,
  ) => void;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema?: SchemaInput;
  outputSchema?: SchemaInput;
  execution?: ToolExecution;
  annotations?: {
    destructiveHint?: boolean;
    readOnlyHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  handler: (
    args: Record<string, unknown>,
    context?: TaskHandlerContext,
  ) => Promise<CallToolResult>;
  enabled?: boolean;
}

interface StoredTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  execution?: ToolExecution;
  annotations?: ToolDefinition['annotations'];
  handler: (
    args: Record<string, unknown>,
    context?: TaskHandlerContext,
  ) => Promise<CallToolResult>;
  enabled: boolean;
}

interface TaskRecord {
  progressToken?: string | number;
  resultPromise?: {
    resolve: (result: CallToolResult) => void;
    reject: (error: Error) => void;
  };
}

const EMPTY_OBJECT_SCHEMA = { type: 'object', properties: {} };
const DEFAULT_TASK_TTL = 600000; // 10 minutes
const DEFAULT_POLL_INTERVAL = 60000; // 60 seconds
const TASK_CLEANUP_INTERVAL = 60000; // 1 minute

export class ToolRegistry {
  private tools: Map<string, StoredTool> = new Map();
  private handlersInitialized = false;
  private taskStore: InMemoryTaskStore;
  private taskRecords: Map<string, TaskRecord> = new Map();
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(private server: Server) {
    this.taskStore = new InMemoryTaskStore();
    this.startTaskCleanup();
  }

  registerTool(tool: ToolDefinition): void {
    const storedTool: StoredTool = {
      name: tool.name,
      description: tool.description,
      inputSchema: toJsonSchema(tool.inputSchema) ?? EMPTY_OBJECT_SCHEMA,
      outputSchema: toJsonSchema(tool.outputSchema),
      execution: tool.execution,
      annotations: tool.annotations,
      handler: tool.handler,
      enabled: tool.enabled ?? true,
    };
    this.tools.set(tool.name, storedTool);
    this.ensureHandlersInitialized();
  }

  enableTool(name: string): void {
    const tool = this.tools.get(name);
    if (tool) tool.enabled = true;
  }

  disableTool(name: string): void {
    const tool = this.tools.get(name);
    if (tool) tool.enabled = false;
  }

  updateTaskStatus(taskId: string, statusMessage: string): void {
    this.taskStore.updateTaskStatus(taskId, 'working', statusMessage);

    this.server.notification({
      method: 'notifications/tasks/status',
      params: {
        taskId,
        status: 'working',
        statusMessage,
        lastUpdatedAt: new Date().toISOString(),
      },
    });
  }

  sendTaskProgress(
    taskId: string,
    progress: number,
    total: number | null,
    message: string,
  ): void {
    const record = this.taskRecords.get(taskId);
    const progressToken = record?.progressToken;
    if (!progressToken) return;

    this.server.notification({
      method: 'notifications/progress',
      params: {
        progressToken,
        progress,
        total: total ?? undefined,
        message,
      },
    });
  }

  sendProgressNotification(
    progressToken: string | number,
    progress: number,
    total: number | null,
    message: string,
  ): void {
    this.server.notification({
      method: 'notifications/progress',
      params: {
        progressToken,
        progress,
        total: total ?? undefined,
        message,
      },
    });
  }

  cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.taskStore.cleanup();
  }

  private startTaskCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      for (const taskId of this.taskRecords.keys()) {
        this.taskStore.getTask(taskId).then((task) => {
          if (!task) {
            this.taskRecords.delete(taskId);
          }
        });
      }
    }, TASK_CLEANUP_INTERVAL);
  }

  private ensureHandlersInitialized(): void {
    if (this.handlersInitialized) return;

    this.server.registerCapabilities({
      tools: { listChanged: true },
      tasks: {
        list: {},
        cancel: {},
        requests: { tools: { call: {} } },
      },
    });

    this.server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: Array.from(this.tools.values())
        .filter((t) => t.enabled)
        .map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          outputSchema: t.outputSchema,
          ...(t.execution ? { execution: t.execution } : {}),
          annotations: t.annotations,
        })),
    }));

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request, extra) => {
        const tool = this.tools.get(request.params.name);
        if (!tool) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Tool ${request.params.name} not found`,
          );
        }
        if (!tool.enabled) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Tool ${request.params.name} is disabled`,
          );
        }

        const args = request.params.arguments ?? {};
        const meta = request.params._meta as
          | Record<string, unknown>
          | undefined;
        const hasTaskRequest = !!meta?.task;
        const progressToken = meta?.progressToken as
          | string
          | number
          | undefined;
        const toolSupportsTask =
          tool.execution?.taskSupport &&
          tool.execution.taskSupport !== 'forbidden';

        // Task-augmented mode
        if (hasTaskRequest && toolSupportsTask) {
          const taskParams: CreateTaskOptions = {
            ttl: DEFAULT_TASK_TTL,
            pollInterval: DEFAULT_POLL_INTERVAL,
          };

          const task = await this.taskStore.createTask(
            taskParams,
            extra.requestId,
            request as never,
          );

          this.taskRecords.set(task.taskId, {
            progressToken,
          });

          // Run handler async — don't await
          (async () => {
            try {
              const ctx: TaskHandlerContext = {
                taskId: task.taskId,
                updateStatus: (msg) => this.updateTaskStatus(task.taskId, msg),
                sendProgress: (p, t, msg) =>
                  this.sendTaskProgress(task.taskId, p, t, msg),
              };
              const result = await tool.handler(args, ctx);
              await this.taskStore.storeTaskResult(
                task.taskId,
                'completed',
                result,
              );

              this.server.notification({
                method: 'notifications/tasks/status',
                params: {
                  taskId: task.taskId,
                  status: 'completed',
                  lastUpdatedAt: new Date().toISOString(),
                },
              });

              const record = this.taskRecords.get(task.taskId);
              if (record?.resultPromise) {
                record.resultPromise.resolve(result);
              }
            } catch (e) {
              const errorMsg = e instanceof Error ? e.message : String(e);
              await this.taskStore.updateTaskStatus(
                task.taskId,
                'failed',
                errorMsg,
              );

              const errorResult: CallToolResult = {
                content: [{ type: 'text', text: `Error: ${errorMsg}` }],
                isError: true,
              };
              await this.taskStore.storeTaskResult(
                task.taskId,
                'failed',
                errorResult,
              );

              this.server.notification({
                method: 'notifications/tasks/status',
                params: {
                  taskId: task.taskId,
                  status: 'failed',
                  statusMessage: errorMsg,
                  lastUpdatedAt: new Date().toISOString(),
                },
              });

              const record = this.taskRecords.get(task.taskId);
              if (record?.resultPromise) {
                record.resultPromise.reject(
                  e instanceof Error ? e : new Error(errorMsg),
                );
              }
            }
          })();

          // Return CreateTaskResult immediately
          return { task } as unknown as CallToolResult;
        }

        // Non-task mode with progress token: send progress notifications
        if (progressToken && toolSupportsTask) {
          const ctx: TaskHandlerContext = {
            taskId: '',
            updateStatus: (msg) => {
              this.sendProgressNotification(progressToken, 0, null, msg);
            },
            sendProgress: (p, t, msg) => {
              this.sendProgressNotification(progressToken, p, t, msg);
            },
          };
          return tool.handler(args, ctx);
        }

        return tool.handler(args);
      },
    );

    // tasks/get handler
    this.server.setRequestHandler(GetTaskRequestSchema, async (request) => {
      const taskId = request.params.taskId;
      const task = await this.taskStore.getTask(taskId);
      if (!task) {
        throw new McpError(ErrorCode.InvalidParams, `Task ${taskId} not found`);
      }
      return task as unknown as Record<string, unknown>;
    });

    // tasks/result handler
    this.server.setRequestHandler(
      GetTaskPayloadRequestSchema,
      async (request) => {
        const taskId = request.params.taskId;
        const task = await this.taskStore.getTask(taskId);
        if (!task) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Task ${taskId} not found`,
          );
        }

        const isTerminal =
          task.status === 'completed' ||
          task.status === 'failed' ||
          task.status === 'cancelled';

        if (isTerminal) {
          return this.taskStore.getTaskResult(taskId) as Promise<
            Record<string, unknown>
          >;
        }

        // Wait for terminal state
        return new Promise<Record<string, unknown>>((resolve, reject) => {
          const record = this.taskRecords.get(taskId) ?? {};
          record.resultPromise = {
            resolve: (result) =>
              resolve(result as unknown as Record<string, unknown>),
            reject,
          };
          this.taskRecords.set(taskId, record);
        });
      },
    );

    // tasks/list handler
    this.server.setRequestHandler(ListTasksRequestSchema, async (request) => {
      const cursor = (request.params as Record<string, unknown>)?.cursor as
        | string
        | undefined;
      return this.taskStore.listTasks(cursor) as Promise<
        Record<string, unknown>
      >;
    });

    // tasks/cancel handler
    this.server.setRequestHandler(CancelTaskRequestSchema, async (request) => {
      const taskId = request.params.taskId;
      const task = await this.taskStore.getTask(taskId);
      if (!task) {
        throw new McpError(ErrorCode.InvalidParams, `Task ${taskId} not found`);
      }

      const isTerminal =
        task.status === 'completed' ||
        task.status === 'failed' ||
        task.status === 'cancelled';

      if (isTerminal) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Task ${taskId} is already in terminal state: ${task.status}`,
        );
      }

      await this.taskStore.updateTaskStatus(taskId, 'cancelled');

      this.server.notification({
        method: 'notifications/tasks/status',
        params: {
          taskId,
          status: 'cancelled',
          lastUpdatedAt: new Date().toISOString(),
        },
      });

      return {};
    });

    this.handlersInitialized = true;
  }

  sendToolListChanged(): void {
    this.server.notification({ method: 'notifications/tools/list_changed' });
  }
}
