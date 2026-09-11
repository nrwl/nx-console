import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { workspaceRoot } from 'nx/src/devkit-exports';
import {
  connectIde,
  readSession,
  type ConnectedIde,
  type IdeSession,
} from '../fixtures/ide';
import { EXTENSION_ID } from '../fixtures/vscode-e2e-runtime';

export interface AutomationScriptContext extends ConnectedIde {
  session: IdeSession;
  outputDir: string;
}

const usage = `Usage: yarn nx run vscode-e2e:automation -- <command>

  inspect               Save inspection.txt, ui.html and screenshot.png (default)
  capture               Save a screenshot
  eval "<function>"     Run (vscode) => ... in the extension host and print the result
  run <script.ts>       Run a module whose default export receives { page, evaluator, nxConsole, session, outputDir }`;

async function inspect(
  ide: ConnectedIde,
  session: IdeSession,
  outputDir: string,
) {
  const host = await ide.evaluator.evaluate((vscode, id: string) => {
    const extension = vscode.extensions.getExtension(id);
    return {
      vscodeVersion: vscode.version,
      extensionVersion: extension?.packageJSON.version as string | undefined,
      extensionActive: extension?.isActive ?? false,
      workspaceFolders: (vscode.workspace.workspaceFolders ?? []).map(
        (folder) => folder.uri.fsPath,
      ),
      activeEditor: vscode.window.activeTextEditor?.document.uri.fsPath,
      projectViewingStyle: vscode.workspace
        .getConfiguration('nxConsole')
        .get<string>('projectViewingStyle'),
    };
  }, EXTENSION_ID);
  const ui = await ide.page.evaluate(() => ({
    title: document.title,
    sidebarRows: Array.from(
      document.querySelectorAll('.sidebar .monaco-list-row'),
    ).map((row) => {
      const depth = Number(row.getAttribute('aria-level') ?? '1') - 1;
      const expanded = row.getAttribute('aria-expanded');
      const state =
        expanded === null
          ? ''
          : expanded === 'true'
            ? ' [expanded]'
            : ' [collapsed]';
      return `${'  '.repeat(depth)}${row.getAttribute('aria-label')}${state}`;
    }),
    notifications: Array.from(
      document.querySelectorAll('.notification-list-item-message'),
    ).map((message) => message.textContent?.trim() ?? ''),
  }));

  const lines = [
    `Window: ${ui.title}`,
    `VS Code: ${host.vscodeVersion}`,
    `Nx Console: ${host.extensionVersion} (${host.extensionActive ? 'active' : 'inactive'}, ${session.extension.source})`,
    `Workspace: ${host.workspaceFolders.join(', ')}${session.fixture ? ` (fixture "${session.fixture}")` : ''}`,
    `Projects view style: ${host.projectViewingStyle}`,
    `Active editor: ${host.activeEditor ?? 'none'}`,
    '',
    'Sidebar rows (rendered):',
    ...ui.sidebarRows.map((row) => `  ${row}`),
    '',
    'Notifications:',
    ...(ui.notifications.length
      ? ui.notifications.map((message) => `  ${message}`)
      : ['  none']),
  ];
  writeFileSync(join(outputDir, 'inspection.txt'), `${lines.join('\n')}\n`);
  writeFileSync(join(outputDir, 'ui.html'), await ide.page.content());
  await ide.page.screenshot({ path: join(outputDir, 'screenshot.png') });
  console.log(lines.join('\n'));
  console.log(
    `\nSaved inspection.txt, ui.html and screenshot.png in ${outputDir}`,
  );
}

async function main() {
  const [command = 'inspect', ...rest] = process.argv.slice(2);
  if (command === 'help' || command === '--help') {
    console.log(usage);
    return;
  }
  const session = readSession();
  if (!session) {
    throw new Error(
      'No automation IDE is running for this worktree. Start one with yarn nx run vscode-e2e:automation-ide.',
    );
  }
  const outputDir = join(
    workspaceRoot,
    'dist/apps/vscode-e2e/automation',
    `${command}-${new Date().toISOString().replace(/[:.]/g, '-')}`,
  );
  const ide = await connectIde(session);
  try {
    switch (command) {
      case 'inspect':
        mkdirSync(outputDir, { recursive: true });
        await inspect(ide, session, outputDir);
        break;
      case 'capture': {
        mkdirSync(outputDir, { recursive: true });
        const path = join(outputDir, 'screenshot.png');
        await ide.page.screenshot({ path });
        console.log(path);
        break;
      }
      case 'eval': {
        const source = rest.join(' ');
        if (!source) throw new Error(usage);
        // The evaluator serializes functions to source text, so a source string is sent unchanged.
        const result = await ide.evaluator.evaluate(
          source as unknown as () => unknown,
        );
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case 'run': {
        if (!rest[0]) throw new Error(usage);
        mkdirSync(outputDir, { recursive: true });
        const module = require(resolve(rest[0]));
        const script = (module.default ?? module) as (
          context: AutomationScriptContext,
        ) => unknown;
        const result = await script({ ...ide, session, outputDir });
        if (result !== undefined) console.log(JSON.stringify(result, null, 2));
        console.log(`Output directory: ${outputDir}`);
        break;
      }
      default:
        throw new Error(`Unknown command "${command}".\n\n${usage}`);
    }
  } finally {
    await ide.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
