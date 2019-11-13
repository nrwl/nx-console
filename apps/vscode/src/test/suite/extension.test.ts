// import * as assert from 'assert';
import { after, before } from 'mocha';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { mockShowQuickPick } from '../test-util';
import { WorkspaceTreeItem } from '../../app/workspace-tree/workspace-tree-item';
import { NgTaskQuickPickItem } from '../../app/ng-task/ng-task-quick-pick-item';

suite('Extension Test Suite', () => {
  const extensionPath = path.resolve(__dirname, '../../../');
  const workspacePath = path.resolve(__dirname, '../../../../../../tmp/proj');
  const angularJson = JSON.parse(
    fs.readFileSync(path.join(workspacePath, 'angular.json')).toString()
  );
  let dispose: () => void;

  before(() => {
    dispose = mockShowQuickPick(() =>
      Promise.resolve(
        new NgTaskQuickPickItem(
          'proj',
          angularJson.projects.proj.architect.build,
          'build',
          'proj'
        )
      )
    );
  });

  after(() => {
    if (dispose) {
      dispose();
    }
    vscode.window.showInformationMessage('All tests done!');
  });

  test('Should prompt for data collection', async () => {
    const workspaceTreeItem = new WorkspaceTreeItem(
      workspacePath,
      `Test`,
      extensionPath
    );
    vscode.commands.executeCommand(
      'angularConsole.revealWebViewPanel',
      workspaceTreeItem
    );

    // TODO: Make some assertions here...
    
    await sleep(20000);
  });

  function sleep(t: number) {
    return new Promise(res => setTimeout(res, t));
  }
});
