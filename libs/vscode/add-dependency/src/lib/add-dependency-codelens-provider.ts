import {
  NxCodeLensProvider,
  getWorkspacePath,
  registerCodeLensProvider,
} from '@nx-console/vscode/utils';
import { join } from 'path';
import {
  isPropertyAssignment,
  isStringLiteral,
  ObjectLiteralElementLike,
  ObjectLiteralExpression,
  parseJsonText,
} from 'typescript';
import { CodeLens, Command, ProviderResult, Range, TextDocument } from 'vscode';
import {
  ADD_DEPENDENCY_COMMAND,
  ADD_DEV_DEPENDENCY_COMMAND,
} from './vscode-add-dependency';

export class AddDependencyCodelensProvider implements NxCodeLensProvider {
  CODELENS_PATTERN = { pattern: '**/package.json' };

  constructor() {
    registerCodeLensProvider(this);
  }

  provideCodeLenses(document: TextDocument): ProviderResult<CodeLens[]> {
    const workspacePath = getWorkspacePath();
    if (document.uri.path !== join(workspacePath, 'package.json')) {
      return;
    }

    const packageJson = parseJsonText('package.json', document.getText());
    const packageJsonObject = packageJson.statements[0]
      .expression as ObjectLiteralExpression;

    const depProperty = packageJsonObject.properties.find(
      (property) => getPropertyName(property) === 'dependencies'
    );
    const devDepProperty = packageJsonObject.properties.find(
      (property) => getPropertyName(property) === 'devDependencies'
    );

    const lenses: CodeLens[] = [];
    if (depProperty) {
      const pos = document.positionAt(depProperty.getStart(packageJson));
      const command: Command = {
        title: 'Add Dependency',
        command: ADD_DEPENDENCY_COMMAND,
      };
      lenses.push(new CodeLens(new Range(pos, pos), command));
    }
    if (devDepProperty) {
      const pos = document.positionAt(devDepProperty.getStart(packageJson));
      const command: Command = {
        title: 'Add Dev Dependency',
        command: ADD_DEV_DEPENDENCY_COMMAND,
      };
      lenses.push(new CodeLens(new Range(pos, pos), command));
    }

    return lenses;
  }
}

function getPropertyName(property: ObjectLiteralElementLike) {
  if (isPropertyAssignment(property) && isStringLiteral(property.name)) {
    return property.name.text;
  }
}
