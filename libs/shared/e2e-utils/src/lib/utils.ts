import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readJsonFile, workspaceRoot } from 'nx/src/devkit-exports';

export const defaultVersion =
  process.env['NXLS_E2E_DEFAULT_VERSION'] ?? '20.0.3';

export const e2eCwd = join(
  process.platform === 'darwin' ? join('/', 'private', tmpdir()) : tmpdir(),
  'nx-console-e2e',
);
export type NewWorkspaceOptions = {
  preset?: string;
  bundler?: string;
  e2eTestRunner?: string;
  style?: string;
  appName?: string;
  framework?: string;
};

export const simpleReactWorkspaceOptions: NewWorkspaceOptions = {
  preset: 'react-standalone',
  bundler: 'vite',
  e2eTestRunner: 'cypress',
  style: 'css',
};

export function newWorkspace({
  name = uniq('workspace'),
  packageManager = 'npm',
  version,
  options,
  verbose,
  env,
}: {
  name?: string;
  packageManager?: 'npm' | 'pnpm' | 'yarn';
  preset?: string;
  version?: string;
  options: NewWorkspaceOptions;
  verbose?: boolean;
  env?: NodeJS.ProcessEnv;
}) {
  if (verbose === undefined) {
    verbose = !!process.env['CI'] || !!process.env['NX_VERBOSE_LOGGING'];
  }
  if (!version) {
    version = defaultVersion;
  }

  if (!existsSync(e2eCwd)) {
    mkdirSync(e2eCwd, {
      recursive: true,
    });
  }

  let command = `npx create-nx-workspace@${version} ${name} `;
  Object.entries(options).forEach(([key, value]) => {
    command += `--${key}="${value}" `;
  });
  command += `--nxCloud=skip --pm=${packageManager} --no-interactive`;

  if (verbose) {
    console.log(
      `Creating new workspace ${name} with ${command} at ${new Date().toISOString()}`,
    );
  }

  const _env = {
    CI: 'true',
    NX_CLOUD_API: 'https://staging.nx.app', // create-nx-workspace invocations are tracked and we don't want to skew the stats through e2es
    ...(env ?? process.env),
  } as NodeJS.ProcessEnv;

  // we need to make sure to not enable plugin isolation for nx 18 because it causes issues
  if (version.startsWith('18')) {
    delete _env['NX_ISOLATE_PLUGINS'];
  }

  const create = execSync(command, {
    cwd: e2eCwd,
    stdio: verbose ? 'inherit' : 'pipe',
    env: _env,
    encoding: 'utf-8',
  });

  return create;
}

export function uniq(prefix: string) {
  return `${prefix}${Math.floor(Math.random() * 10000000)}`;
}

export function modifyJsonFile(filePath: string, callback: (data: any) => any) {
  let jsonData = JSON.parse(readFileSync(filePath, 'utf-8'));
  jsonData = callback(jsonData);
  writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
}

export async function waitFor(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isWindows() {
  return process.platform === 'win32';
}

export async function createInvokeMCPInspectorCLI(
  e2eCwd: string,
  workspaceName: string,
) {
  const serverPath = join(workspaceRoot, 'dist', 'apps', 'nx-mcp', 'main.js');

  /**
   * We have a HUGE range of major versions of commander that are dependend upon by our dev dependencies. The mcp-inspector package
   * cannot run currently based on our dep tree.
   *
   * I tried multiple combinations of yarn resolution configurations to try and get this to work but the only way was to ensure that the
   * main commander package that is installed at the root of node_modules is correct for mcp-inspector and that then breaks other things
   * like cypress.
   *
   * Ultimately, I am giving up and going with installing the mcp inspector package into the test workspace directly and invoking it from there.
   */
  const mcpInspectorVersion = readJsonFile(join(workspaceRoot, 'package.json'))
    .devDependencies['@modelcontextprotocol/inspector'];
  execSync(
    `npm install -D @modelcontextprotocol/inspector@${mcpInspectorVersion}`,
    {
      cwd: e2eCwd,
    },
  );
  const mcpInspectorCommand = `npx mcp-inspector --cli node ${serverPath}`;

  return (...args: string[]) => {
    const command = `${mcpInspectorCommand} ${args.join(' ')}`;

    if (process.env['NX_VERBOSE_LOGGING']) {
      console.log(`Executing command: ${command}`);
    }
    return JSON.parse(
      execSync(command, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10, // 10MB
        cwd: join(e2eCwd, workspaceName),
        env: {
          ...process.env,
          NX_NO_CLOUD: 'true',
        },
      }),
    );
  };
}

export async function cleanupNxWorkspace(workspacePath: string, version?: string) {
  console.log(`[DEBUG] Cleaning up Nx workspace: ${workspacePath}`);
  
  try {
    // Stop the Nx daemon to ensure all plugin workers are terminated
    execSync(`npx nx@${version ?? defaultVersion} daemon --stop`, {
      cwd: workspacePath,
      timeout: 10000,
      stdio: 'pipe',
    });
    console.log(`[DEBUG] Successfully stopped Nx daemon for workspace: ${workspacePath}`);
  } catch (error) {
    console.log(`[DEBUG] Failed to stop Nx daemon: ${(error as Error).message}`);
  }

  if (isWindows()) {
    // Kill any remaining Node.js processes that might have handles to the workspace
    try {
      const processes = execSync('wmic process where "name=\'node.exe\'" get ProcessId,CommandLine /format:csv', {
        encoding: 'utf8',
        timeout: 10000,
      });
      
      const lines = processes.split('\n').filter(line => line.trim() && !line.startsWith('Node,'));
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 3) {
          const pid = parts[2]?.trim();
          const commandLine = parts[1]?.trim();
          
          if (pid && commandLine && commandLine.includes(workspacePath)) {
            try {
              console.log(`[DEBUG] Killing Node.js process ${pid} with command: ${commandLine}`);
              execSync(`taskkill /pid ${pid} /T /F`, {
                timeout: 5000,
                stdio: 'pipe',
              });
            } catch (killError) {
              console.log(`[DEBUG] Failed to kill process ${pid}: ${(killError as Error).message}`);
            }
          }
        }
      }
    } catch (error) {
      console.log(`[DEBUG] Failed to cleanup processes: ${(error as Error).message}`);
    }

    // Wait a bit for processes to fully terminate
    try {
      execSync('timeout /t 2 /nobreak >nul 2>&1', { stdio: 'ignore' });
    } catch {
      // Ignore timeout command errors
    }
  }
}

export function logWindowsFileLocks(dirPath: string) {
  if (!isWindows() || !existsSync(dirPath)) {
    console.log(`[DEBUG] Not Windows or directory doesn't exist: ${dirPath}`);
    return;
  }

  console.log(`[DEBUG] Checking for file locks on directory: ${dirPath}`);

  // List all Node.js processes with command lines to identify what they're doing
  try {
    const nodeProcesses = execSync(
      'wmic process where "name=\'node.exe\'" get ProcessId,CommandLine,ParentProcessId /format:csv',
      {
        encoding: 'utf8',
        timeout: 10000,
      },
    );
    console.log(
      `[DEBUG] Node.js processes with command lines:\n${nodeProcesses}`,
    );
  } catch (error) {
    console.log(
      `[DEBUG] Failed to get Node.js process details: ${(error as Error).message}`,
    );
  }

  // Use PowerShell to find processes with open file handles using Get-Process and file system access
  try {
    const psScript = `
    $targetPath = "${dirPath.replace(/\\/g, '\\\\')}"
    Write-Host "Searching for processes with handles to: $targetPath"
    
    # Get all processes and check their modules
    Get-Process | ForEach-Object {
      $proc = $_
      try {
        if ($proc.Modules) {
          $matchingModules = $proc.Modules | Where-Object { $_.FileName -like "*$targetPath*" }
          if ($matchingModules) {
            Write-Host "Process $($proc.ProcessName) (PID: $($proc.Id)) has modules in target directory:"
            $matchingModules | ForEach-Object { Write-Host "  $($_.FileName)" }
          }
        }
      } catch {
        # Ignore access denied errors for system processes
      }
    }
    
    # Also check current working directories
    Get-WmiObject Win32_Process | Where-Object { $_.Name -eq "node.exe" } | ForEach-Object {
      if ($_.CommandLine -and $_.CommandLine.Contains($targetPath)) {
        Write-Host "Node process PID $($_.ProcessId) has target path in command line: $($_.CommandLine)"
      }
    }
    `;

    const psOutput = execSync(`powershell.exe -Command "${psScript}"`, {
      encoding: 'utf8',
      timeout: 15000,
    });
    console.log(`[DEBUG] PowerShell handle search:\n${psOutput}`);
  } catch (error) {
    console.log(
      `[DEBUG] PowerShell handle search failed: ${(error as Error).message}`,
    );
  }

  // Try using openfiles command to show open files (requires admin privileges)
  try {
    const openFiles = execSync(
      `openfiles /query /fo csv | findstr /i "${dirPath}"`,
      {
        encoding: 'utf8',
        timeout: 10000,
      },
    );
    if (openFiles.trim()) {
      console.log(`[DEBUG] Open files in target directory:\n${openFiles}`);
    } else {
      console.log(
        `[DEBUG] No open files found in target directory (or no admin privileges)`,
      );
    }
  } catch (error) {
    console.log(
      `[DEBUG] Failed to query open files: ${(error as Error).message}`,
    );
  }

  // List directory contents with detailed info
  try {
    const dirContents = execSync(`dir "${dirPath}" /a /s`, {
      encoding: 'utf8',
      timeout: 10000,
    });
    console.log(
      `[DEBUG] Directory contents (first 2000 chars):\n${dirContents.substring(0, 2000)}`,
    );
  } catch (error) {
    console.log(
      `[DEBUG] Failed to list directory contents: ${(error as Error).message}`,
    );
  }

  // Check for .git directory which might have locks
  try {
    const gitDir = join(dirPath, '.git');
    if (existsSync(gitDir)) {
      console.log(`[DEBUG] .git directory exists, checking for lock files:`);
      const gitFiles = execSync(`dir "${gitDir}" /s /b | findstr /i lock`, {
        encoding: 'utf8',
        timeout: 5000,
      });
      if (gitFiles.trim()) {
        console.log(`[DEBUG] Git lock files found:\n${gitFiles}`);
      } else {
        console.log(`[DEBUG] No git lock files found`);
      }
    }
  } catch (error) {
    console.log(
      `[DEBUG] Failed to check git locks: ${(error as Error).message}`,
    );
  }
}
