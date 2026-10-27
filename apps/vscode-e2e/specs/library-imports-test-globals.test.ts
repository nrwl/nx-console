import { readdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { expect, test } from '../base-test';

test.use({ vscodeOptions: { fixture: 'jest-cypress-libraries' } });

const assertionError = "does not exist on type 'Assertion'";

// https://github.com/nrwl/nx-console/issues/2259
test('library imports keep Cypress globals out of Jest specs', async ({
  vscode,
}, testInfo) => {
  const { nxConsole, evaluator, workspacePath } = vscode;
  const proof = vscode.proof([
    'Library imports and Jest specs (#2259)',
    vscode.build,
    'nxConsole.enableLibraryImports: true (default)',
    'libs/cypress-utils/src/index.ts references Cypress types',
    '',
  ]);

  await nxConsole.openNxConsoleSidebar();
  await nxConsole.waitForNxConsoleReady();

  const specPath = `${workspacePath}/libs/util/src/lib/util.spec.ts`;

  // tsserver reports resolved paths (/private/tmp on macOS).
  const root = realpathSync(workspacePath);
  const cypressEntry = `${root}/libs/cypress-utils/src/index.ts`;
  const libConfig = `${root}/libs/util/tsconfig.lib.json`;
  const specConfig = `${root}/libs/util/tsconfig.spec.json`;
  const logsDir = join(
    dirname(
      await evaluator.evaluate(() => process.env['VSCODE_IPC_HOOK'] ?? ''),
    ),
    'logs',
  );
  // The plugin logs "updating project: <tsconfig>" followed by the root files
  // it adds to that project once it has a configuration. Keep the latest
  // entry per project.
  const addedRootFiles = (): Map<string, string[]> => {
    const added = new Map<string, string[]>();
    const logs = readdirSync(logsDir, { recursive: true, encoding: 'utf8' })
      .filter((file) => file.endsWith('tsserver.log'))
      .map((file) => join(logsDir, file));
    for (const log of logs) {
      let project: string | undefined;
      for (const line of readFileSync(log, 'utf8').split('\n')) {
        const updating = line.match(
          /NX Imports Plugin: updating project: (.+)$/,
        );
        if (updating) {
          project = updating[1].trim();
          continue;
        }
        const roots = line.match(
          /NX Imports Plugin: additional root files: (.+)$/,
        );
        if (roots && project) {
          added.set(project, JSON.parse(roots[1]));
        }
      }
    }
    return added;
  };

  const openBeside = (path: string) =>
    evaluator.evaluate(async (vscodeApi, file: string) => {
      const document = await vscodeApi.workspace.openTextDocument(
        vscodeApi.Uri.file(file),
      );
      await vscodeApi.window.showTextDocument(document, {
        viewColumn: vscodeApi.ViewColumn.Two,
        preserveFocus: true,
        preview: false,
      });
      await vscodeApi.commands.executeCommand(
        'workbench.actions.view.problems',
      );
    }, path);

  // tsserver loads a project before it applies a configuration that arrives
  // with it, which drops the added root files; a configuration sent to an
  // already loaded project keeps them. Restarting the TypeScript server with
  // the spec open (as users do, and as Nx Console does when the setting
  // changes) resends the configuration after the spec project loads.
  await openBeside(specPath);
  await expect
    .poll(() => addedRootFiles().has(specConfig), {
      timeout: 120_000,
      intervals: [2_000],
    })
    .toBe(true);
  await evaluator.evaluate((vscodeApi) =>
    vscodeApi.commands.executeCommand('typescript.restartTsServer'),
  );
  await new Promise((resolve) => setTimeout(resolve, 10_000));
  await openBeside(`${workspacePath}/libs/util/src/lib/util.ts`);
  await openBeside(specPath);

  // Library imports are active once the plugin has added the other library's
  // entry file to the util library's own TypeScript project.
  const libraryImportsActive = await expect
    .poll(
      () => {
        const added = addedRootFiles();
        // Both projects have received the plugin configuration.
        return added.has(specConfig) ? (added.get(libConfig) ?? []) : [];
      },
      {
        timeout: 120_000,
        intervals: [2_000],
      },
    )
    .toContain(cypressEntry)
    .then(
      () => true,
      () => false,
    );
  await proof.show(
    `Plugin added libs/cypress-utils/src/index.ts to libs/util/tsconfig.lib.json: ${libraryImportsActive}`,
  );
  expect(libraryImportsActive, 'library imports are active').toBe(true);

  const readDiagnostics = () =>
    evaluator.evaluate(
      (vscodeApi, path: string) =>
        vscodeApi.languages
          .getDiagnostics(vscodeApi.Uri.file(path))
          .map(
            (diagnostic) =>
              `${diagnostic.range.start.line + 1}: ${diagnostic.message.split('\n')[0]}`,
          ),
      specPath,
    );
  // tsserver re-checks an open file when it changes, as it does while a user
  // edits the spec. Add a comment line and wait for the semantic diagnostics.
  await evaluator.evaluate(async (vscodeApi, path: string) => {
    const uri = vscodeApi.Uri.file(path);
    const document = await vscodeApi.workspace.openTextDocument(uri);
    const edit = new vscodeApi.WorkspaceEdit();
    edit.insert(
      uri,
      document.lineAt(document.lineCount - 1).range.end,
      '// edited\n',
    );
    await vscodeApi.workspace.applyEdit(edit);
  }, specPath);
  let diagnostics: string[] = [];
  for (let attempt = 0; attempt < 15; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    diagnostics = await readDiagnostics();
    if (diagnostics.some((message) => message.includes(assertionError))) break;
  }
  const specIncludesCypress = (addedRootFiles().get(specConfig) ?? []).includes(
    cypressEntry,
  );
  await proof.show(
    `Plugin added libs/cypress-utils/src/index.ts to libs/util/tsconfig.spec.json: ${specIncludesCypress}`,
  );
  await proof.show(
    `Diagnostics in libs/util/src/lib/util.spec.ts: ${diagnostics.length ? '' : 'none'}`,
  );
  for (const diagnostic of diagnostics) {
    await proof.show(`  ${diagnostic}`);
  }
  expect
    .soft(specIncludesCypress, 'the spec project does not load Cypress')
    .toBe(false);
  expect
    .soft(
      diagnostics.filter((message) => message.includes(assertionError)),
      'Jest matchers resolve against Jest, not Chai',
    )
    .toEqual([]);

  await proof.show(
    testInfo.errors.length
      ? "RESULT: FAIL — Jest's expect resolves to Chai's Assertion in the spec"
      : 'RESULT: PASS — the spec type-checks against Jest',
  );
});
