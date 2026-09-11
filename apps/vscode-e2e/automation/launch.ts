import {
  appendFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { resolveExtension } from '../fixtures/extension';
import {
  AUTOMATION_IDE_DIR,
  RUNNER_PATH,
  SESSION_FILE,
  connectIde,
  getPersistentSandboxDir,
  launchIde,
  prepareVSCode,
  readSession,
  writeSession,
} from '../fixtures/ide';
import { workspaceFixtures } from '../fixtures/workspaces';

function readOption(args: string[], name: string): string | undefined {
  const index = args.findIndex(
    (arg) => arg === `--${name}` || arg.startsWith(`--${name}=`),
  );
  if (index === -1) return undefined;
  const arg = args[index];
  return arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : args[index + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const workspace = readOption(args, 'workspace');
  const fixture = workspace
    ? undefined
    : (readOption(args, 'fixture') ?? 'demo');
  if (fixture && !workspaceFixtures[fixture]) {
    throw new Error(
      `Unknown fixture "${fixture}". Available: ${Object.keys(workspaceFixtures).join(', ')}`,
    );
  }
  const running = readSession();
  if (running) {
    throw new Error(
      `An automation IDE is already running for this worktree (pid ${running.pid}). Close it first.`,
    );
  }
  if (!existsSync(RUNNER_PATH)) {
    throw new Error(
      `Missing ${RUNNER_PATH}. Start the IDE through yarn nx run vscode-e2e:automation-ide.`,
    );
  }

  mkdirSync(AUTOMATION_IDE_DIR, { recursive: true });
  const logFile = join(AUTOMATION_IDE_DIR, 'ide.log');
  writeFileSync(logFile, '');
  const log = (text: string) =>
    appendFileSync(logFile, text.endsWith('\n') ? text : `${text}\n`);

  const { executable, vscodeVersion } = await prepareVSCode();
  const extension = await resolveExtension();
  const ide = await launchIde({
    sandboxDir: getPersistentSandboxDir(),
    executable,
    vscodeVersion,
    extension,
    fixture,
    workspacePath: workspace ? resolve(workspace) : undefined,
    log,
  });

  let stopping: Promise<void> | undefined;
  const shutdown = (code: number) => {
    stopping ??= (async () => {
      rmSync(SESSION_FILE, { force: true });
      for (const error of await ide.stop()) console.error(error);
      process.exit(code);
    })();
    return stopping;
  };
  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
  ide.process.once('exit', () => shutdown(0));

  try {
    const connected = await connectIde(ide.session);
    await connected.disconnect();
  } catch (error) {
    console.error(error);
    await shutdown(1);
    return;
  }
  writeSession(ide.session);

  console.log(
    [
      `VS Code ${vscodeVersion} automation IDE is running (pid ${ide.session.pid}).`,
      `Nx Console: ${extension.version} (${extension.source}) from ${extension.path}`,
      `Workspace: ${ide.session.workspacePath}${fixture ? ` (fixture "${fixture}")` : ''}`,
      `Log: ${logFile}`,
      '',
      'Inspect it:              yarn nx run vscode-e2e:automation',
      'Run a scenario on it:    VSCODE_E2E_ATTACH=1 yarn nx run vscode-e2e:e2e -- <spec file filter>',
      'Stop it:                 Ctrl+C here, or close the VS Code window.',
    ].join('\n'),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
