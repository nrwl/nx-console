import * as assert from 'assert';
import * as sinon from 'sinon';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Executes the nxConsole.generate commmand and prompts to select a schematic', (done) => {
    const showQuickPickSpy = sinon.spy(vscode.window, 'showQuickPick');

      vscode.commands.executeCommand('nx.generate')
      .then(
        () => {
          assert(showQuickPickSpy.callCount);
          done();
        },
        (rejected) => {
          console.log(rejected);
          assert(false);
        }
      );

  });
});
