import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '../base-test';

test.use({
  vscodeOptions: {
    fixture: 'depends-on',
    workspacePath: process.env.DEPENDSON_WORKSPACE,
    userSettings: { 'editor.wordBasedSuggestions': 'off' },
  },
});

test('dependsOn filters exact entries independently of dependency targets', async ({
  vscode,
}, testInfo) => {
  const { evaluator, nxConsole, page, workspacePath } = vscode;
  await nxConsole.openNxConsoleSidebar();
  await nxConsole.waitForNxConsoleReady();

  for (const file of [
    'apps/app/project.json',
    'nx.json',
    'packages/pkg/package.json',
  ]) {
    const config = JSON.parse(readFileSync(join(workspacePath, file), 'utf8'));
    const targets =
      file === 'nx.json'
        ? (config.targetDefaults ??= { build: {} })
        : file.endsWith('package.json')
          ? config.nx.targets
          : config.targets;
    for (const [name, dependsOn] of [
      ['plain-first', ['test', '']],
      ['caret-first', ['^test', '']],
      ['both', ['test', '^test', '']],
      ['object', [{ target: '', dependencies: true }]],
    ] as const) {
      targets.build.dependsOn = dependsOn;
      const text = JSON.stringify(config, null, 2);
      await page.keyboard.press('Escape');
      await evaluator.evaluate(
        async (v, path, text) => {
          const doc = await v.workspace.openTextDocument(v.Uri.file(path));
          const edit = new v.WorkspaceEdit();
          edit.replace(
            doc.uri,
            new v.Range(
              doc.positionAt(0),
              doc.positionAt(doc.getText().length),
            ),
            text,
          );
          await v.workspace.applyEdit(edit);
          const editor = await v.window.showTextDocument(doc, {
            preview: false,
          });
          const offset = text.indexOf('""', text.indexOf('"dependsOn"')) + 1;
          const position = doc.positionAt(offset);
          editor.selection = new v.Selection(position, position);
          editor.revealRange(editor.selection, v.TextEditorRevealType.InCenter);
        },
        join(workspacePath, file),
        text,
      );
      const labels = await evaluator.evaluate(async (v) => {
        const editor = v.window.activeTextEditor!;
        const result = await v.commands.executeCommand<
          import('vscode').CompletionList
        >(
          'vscode.executeCompletionItemProvider',
          editor.document.uri,
          editor.selection.active,
        );
        void v.commands.executeCommand('editor.action.triggerSuggest');
        return (
          result?.items.map((item) =>
            typeof item.label === 'string' ? item.label : item.label.label,
          ) ?? []
        );
      });
      await expect(page.locator('.suggest-widget.visible')).toBeVisible();
      await page.waitForTimeout(1800);
      const evidence = `${file.replaceAll('/', '-')}-${name}`;
      writeFileSync(
        testInfo.outputPath(`${evidence}.json`),
        JSON.stringify(labels, null, 2),
      );
      await page.screenshot({ path: testInfo.outputPath(`${evidence}.png`) });
      if (name === 'plain-first' || name === 'both') {
        expect.soft(labels, evidence).not.toContain('"test"');
      } else {
        expect.soft(labels, evidence).toContain('"test"');
      }
      if (name === 'plain-first') {
        expect.soft(labels, evidence).toContain('"^test"');
      } else {
        expect.soft(labels, evidence).not.toContain('"^test"');
      }
      expect.soft(labels, evidence).toContain('"build"');
    }
  }
});
