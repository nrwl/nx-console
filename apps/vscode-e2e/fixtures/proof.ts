import { writeFileSync } from 'node:fs';
import type { VSCodeEvaluator } from './vscode-evaluator';

/**
 * A text file shown in an editor next to the UI under test, so a recording
 * carries the measured facts behind each assertion.
 */
export class ProofLog {
  private readonly lines: string[];

  constructor(
    private readonly evaluator: VSCodeEvaluator,
    private readonly file: string,
    heading: string[],
    private readonly pauseMs: number,
  ) {
    this.lines = [...heading];
  }

  get text(): string {
    return `${this.lines.join('\n')}\n`;
  }

  async show(line: string): Promise<void> {
    this.lines.push(line);
    const expected = this.text;
    writeFileSync(this.file, expected);
    const updated = await this.evaluator.evaluate(
      async (vscode, path: string, content: string) => {
        const document = await vscode.workspace.openTextDocument(
          vscode.Uri.file(path),
        );
        const editor = await vscode.window.showTextDocument(document, {
          preview: false,
          preserveFocus: true,
        });
        for (
          let attempt = 0;
          attempt < 50 && editor.document.getText() !== content;
          attempt++
        ) {
          await vscode.commands.executeCommand('workbench.action.files.revert');
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        const last = editor.document.lineCount - 1;
        editor.revealRange(
          new vscode.Range(last, 0, last, 0),
          vscode.TextEditorRevealType.InCenterIfOutsideViewport,
        );
        return editor.document.getText() === content;
      },
      this.file,
      expected,
    );
    if (!updated) {
      throw new Error(`The proof editor did not show "${line}"`);
    }
    if (this.pauseMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.pauseMs));
    }
  }
}
