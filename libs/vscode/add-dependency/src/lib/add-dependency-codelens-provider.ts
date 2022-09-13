import { getWorkspacePath } from '@nx-console/vscode/utils';
import { join } from 'path';
import {
  isPropertyAssignment,
  isStringLiteral,
  ObjectLiteralElementLike,
  ObjectLiteralExpression,
  parseJsonText,
} from 'typescript';
import {
  CodeLens,
  CodeLensProvider,
  Command,
  ExtensionContext,
  languages,
  ProviderResult,
  Range,
  TextDocument,
} from 'vscode';

export class AddDependencyCodelensProvider implements CodeLensProvider {
  constructor(context: ExtensionContext) {
    this.registerAddDependencyCodeLensProvider(context);
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
        command: 'nxConsole.addDependency',
      };
      lenses.push(new CodeLens(new Range(pos, pos), command));
    }
    if (devDepProperty) {
      const pos = document.positionAt(devDepProperty.getStart(packageJson));
      const command: Command = {
        title: 'Add Dev Dependency',
        command: 'nxConsole.addDevDependency',
      };
      lenses.push(new CodeLens(new Range(pos, pos), command));
    }

    return lenses;
  }

  /**
   * Registers this as a CodeLensProvider.
   * @param context instance of ExtensionContext from activate
   */
  registerAddDependencyCodeLensProvider(context: ExtensionContext) {
    context.subscriptions.push(
      languages.registerCodeLensProvider({ pattern: '**/package.json' }, this)
    );
  }
}

function getPropertyName(property: ObjectLiteralElementLike) {
  if (isPropertyAssignment(property) && isStringLiteral(property.name)) {
    return property.name.text;
  }
}
