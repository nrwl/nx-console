import {
  createInvokeMCPInspectorCLI,
  e2eCwd,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
  waitFor,
} from '@nx-console/shared-e2e-utils';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { TestJsonRpcServer } from './utils/test-json-rpc-server';
import { execSync } from 'node:child_process';

describe('IDE Communication', () => {
  let invokeMCPInspectorCLI: Awaited<
    ReturnType<typeof createInvokeMCPInspectorCLI>
  >;
  let testServer: TestJsonRpcServer;
  const workspaceName = uniq('nx-mcp-ide-test');
  const testWorkspacePath = join(e2eCwd, workspaceName);

  beforeAll(async () => {
    // Create test workspace
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
    });

    // Start test JSON-RPC server
    testServer = new TestJsonRpcServer(testWorkspacePath);
    await testServer.start();

    // Create MCP inspector CLI
    invokeMCPInspectorCLI = await createInvokeMCPInspectorCLI(
      e2eCwd,
      workspaceName,
    );

    // Wait for the server to potentially detect IDE connection
    // The server does periodic monitoring every 10 seconds for up to 5 times
    await waitFor(12000);
  });

  afterAll(async () => {
    // Stop test server
    if (testServer) {
      testServer.stop();
    }

    // Clean up workspace
    rmSync(testWorkspacePath, { recursive: true, force: true });
  });

  beforeEach(() => {
    // Clear messages before each test
    testServer.clearMessages();
  });

  it('should send message to IDE server when using nx_visualize_graph tool', async () => {
    // Execute nx_visualize_graph tool which should trigger IDE communication
    const result = invokeMCPInspectorCLI(
      testWorkspacePath,
      '--method',
      'tools/call',
      '--tool-name',
      'nx_visualize_graph',
      '--tool-arg',
      'visualizationType=full-project-graph',
    );

    // Wait a bit for message to be processed
    await waitFor(500);

    // Check that we received the expected IDE RPC messages
    const messages = testServer.getReceivedMessages();

    // Should have received a showFullProjectGraph notification
    const graphMessage = messages.find(
      (m) => m.method === 'ide/showFullProjectGraph',
    );
    expect(graphMessage).toBeDefined();
    expect(result).toBeDefined();
  });
});
