import {
  Server,
  ProtocolError,
  CallToolResult,
  ProtocolErrorCode,
  Tool,
} from '@modelcontextprotocol/server';
import { ZodRawShape, z, toJSONSchema } from 'zod';

type SchemaInput = ZodRawShape | Record<string, unknown>;
type ToolInputSchema = Tool['inputSchema'];
type ToolOutputSchema = NonNullable<Tool['outputSchema']>;

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
): ToolInputSchema | undefined {
  if (!input) return undefined;
  if (isZodShape(input)) {
    const { $schema, ...schema } = toJSONSchema(z.object(input)) as Record<
      string,
      unknown
    >;
    return schema as ToolInputSchema;
  }
  return input as ToolInputSchema;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema?: SchemaInput;
  outputSchema?: SchemaInput;
  annotations?: {
    destructiveHint?: boolean;
    readOnlyHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  handler: (args: Record<string, unknown>) => Promise<CallToolResult>;
  enabled?: boolean;
}

interface StoredTool {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  outputSchema?: ToolOutputSchema;
  annotations?: ToolDefinition['annotations'];
  handler: (args: Record<string, unknown>) => Promise<CallToolResult>;
  enabled: boolean;
}

const EMPTY_OBJECT_SCHEMA: ToolInputSchema = {
  type: 'object',
  properties: {},
};

export class ToolRegistry {
  private tools: Map<string, StoredTool> = new Map();
  private handlersInitialized = false;

  constructor(private server: Server) {}

  registerTool(tool: ToolDefinition): void {
    const storedTool: StoredTool = {
      name: tool.name,
      description: tool.description,
      inputSchema: toJsonSchema(tool.inputSchema) ?? EMPTY_OBJECT_SCHEMA,
      outputSchema: toJsonSchema(tool.outputSchema),
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

  private ensureHandlersInitialized(): void {
    if (this.handlersInitialized) return;

    this.server.registerCapabilities({ tools: { listChanged: true } });

    this.server.setRequestHandler('tools/list', () => ({
      tools: Array.from(this.tools.values())
        .filter((t) => t.enabled)
        .map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          outputSchema: t.outputSchema,
          annotations: t.annotations,
        })),
    }));

    this.server.setRequestHandler('tools/call', async (request) => {
      const tool = this.tools.get(request.params.name);
      if (!tool) {
        throw new ProtocolError(
          ProtocolErrorCode.InvalidParams,
          `Tool ${request.params.name} not found`,
        );
      }
      if (!tool.enabled) {
        throw new ProtocolError(
          ProtocolErrorCode.InvalidParams,
          `Tool ${request.params.name} is disabled`,
        );
      }
      return tool.handler(request.params.arguments ?? {});
    });

    this.handlersInitialized = true;
  }

  sendToolListChanged(): void {
    this.server.notification({ method: 'notifications/tools/list_changed' });
  }
}
