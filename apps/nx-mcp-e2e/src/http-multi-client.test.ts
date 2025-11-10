import {
  cleanupNxWorkspace,
  defaultVersion,
  e2eCwd,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
  TestMCPClient,
} from '@nx-console/shared-e2e-utils';
import { spawn, ChildProcess } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { workspaceRoot } from 'nx/src/devkit-exports';

describe('HTTP Multi-Client', () => {
  let serverProcess: ChildProcess;
  const serverPort = 9922;
  const workspaceName = uniq('nx-mcp-http-test');
  const testWorkspacePath = join(e2eCwd, workspaceName);
  const serverPath = join(workspaceRoot, 'dist', 'apps', 'nx-mcp', 'main.js');

  // Helper to wait for HTTP server to be ready by polling
  async function waitForServerReady(
    port: number,
    timeoutMs = 60000,
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Try to connect to the server
        // this is not an official supported thing in the spec but it works for checkign aliveness
        const response = await fetch(`http://localhost:${port}/mcp`, {
          method: 'OPTIONS',
        });

        // If we get any response (even an error), the server is up
        console.log(`Server is ready on port ${port}`);
        return;
      } catch (error) {
        // Server not ready yet, wait and retry
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    throw new Error(`Timeout waiting for server to be ready on port ${port}`);
  }

  beforeAll(async () => {
    // Create workspace
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
    });

    // Start HTTP MCP server without workspace path
    // The workspace will be determined per-session based on requests
    serverProcess = spawn(
      'node',
      [serverPath, '--transport=http', `--port=${serverPort}`],
      {
        stdio: 'pipe',
        env: {
          ...process.env,
          NX_NO_CLOUD: 'true',
          MCP_AUTO_OPEN_ENABLED: 'false',
        },
        cwd: testWorkspacePath, // Set working directory to workspace
      },
    );

    // Log server output for debugging
    serverProcess.stdout?.on('data', (data) => {
      if (process.env['NX_VERBOSE_LOGGING']) {
        console.log(`[MCP Server] ${data.toString()}`);
      }
    });

    serverProcess.stderr?.on('data', (data) => {
      if (process.env['NX_VERBOSE_LOGGING']) {
        console.error(`[MCP Server Error] ${data.toString()}`);
      }
    });

    // Wait for server to be ready by polling the endpoint
    await waitForServerReady(serverPort);

    console.log(`MCP HTTP server confirmed ready on port ${serverPort}`);
  });

  afterAll(async () => {
    // Kill server
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      // Wait a bit for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
    }

    // Clean up workspace
    await cleanupNxWorkspace(testWorkspacePath, defaultVersion);
    rmSync(testWorkspacePath, { recursive: true, force: true });
  });

  it('should handle two simultaneous clients listing tools', async () => {
    const serverUrl = `http://localhost:${serverPort}/mcp`;

    // Create two test clients
    const client1 = new TestMCPClient(serverUrl, 'test-client-1');
    const client2 = new TestMCPClient(serverUrl, 'test-client-2');

    // Connect both clients in parallel
    await Promise.all([client1.connect(), client2.connect()]);

    // Make two simultaneous requests
    const [tools1, tools2] = await Promise.all([
      client1.listTools(),
      client2.listTools(),
    ]);

    // Verify both clients got valid responses
    expect(tools1).toBeDefined();
    expect(tools2).toBeDefined();

    const toolNames1 = tools1.map((tool: any) => tool.name);
    const toolNames2 = tools2.map((tool: any) => tool.name);

    // Both should have the same set of tools
    const expectedTools = [
      'nx_docs',
      'nx_available_plugins',
      'nx_workspace',
      'nx_workspace_path',
      'nx_project_details',
      'nx_generators',
      'nx_generator_schema',
    ];

    expect(toolNames1).toEqual(expectedTools);
    expect(toolNames2).toEqual(expectedTools);

    console.log('Both clients successfully connected and retrieved tools');

    // Disconnect both clients
    await Promise.all([client1.disconnect(), client2.disconnect()]);
  });

  it('should allow both clients to invoke tools and get results', async () => {
    const serverUrl = `http://localhost:${serverPort}/mcp`;

    // Create two test clients
    const client1 = new TestMCPClient(serverUrl, 'test-client-3');
    const client2 = new TestMCPClient(serverUrl, 'test-client-4');

    // Connect both clients in parallel
    await Promise.all([client1.connect(), client2.connect()]);

    // Make two simultaneous tool calls
    const [result1, result2] = await Promise.all([
      client1.callTool('nx_workspace_path', {}),
      client2.callTool('nx_workspace_path', {}),
    ]);

    // Verify both clients got valid tool results
    expect(result1.content).toBeDefined();
    expect(result2.content).toBeDefined();

    // The nx_workspace_path tool returns the workspace path as text
    expect(result1.content[0].type).toBe('text');
    expect(result1.content[0].text).toContain(testWorkspacePath);

    expect(result2.content[0].type).toBe('text');
    expect(result2.content[0].text).toContain(testWorkspacePath);

    console.log(
      'Both clients successfully invoked tools and received correct results',
    );

    // Disconnect both clients
    await Promise.all([client1.disconnect(), client2.disconnect()]);
  });
});
