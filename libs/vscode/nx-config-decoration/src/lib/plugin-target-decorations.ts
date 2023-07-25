import {
  ObjectLiteralElementLike,
  ObjectLiteralExpression,
  isPropertyAssignment,
  isStringLiteral,
  parseJsonText,
} from 'typescript';
import typescript = require('typescript');
import {
  CancellationToken,
  ExtensionContext,
  FileDecoration,
  FileDecorationProvider,
  ProviderResult,
  TextEditor,
  ThemeColor,
  Uri,
  window,
  Range,
} from 'vscode';

const pluginTargetDecorationType = window.createTextEditorDecorationType({
  isWholeLine: true,
});

export function updatePluginTargetDecorationsOnEditorChange(
  context: ExtensionContext
) {
  window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor) {
        // updateDecorations(editor);
      }
    },
    null,
    context.subscriptions
  );
}

function updateDecorations(editor: TextEditor) {
  if (!editor.document.fileName.endsWith('project.json')) {
    return;
  }
  const projectJson = parseJsonText(
    editor.document.fileName,
    editor.document.getText()
  );
  const projectJsonObject = projectJson.statements[0]
    .expression as ObjectLiteralExpression;
  const targetsProperty = projectJsonObject.properties.find(
    (property) => getPropertyName(property) === 'targets'
  );

  if (!targetsProperty) {
    return;
  }
  const firstChild = getProperties(targetsProperty)?.[0];

  if (!firstChild) {
    return;
  }

  const position = editor.document.positionAt(firstChild.getStart(projectJson));
  editor.setDecorations(pluginTargetDecorationType, [
    {
      range: new Range(position, position),
      renderOptions: {
        before: {
          contentText: 'aaaaaa',
          backgroundColor: 'red',
        },
      },
    },
  ]);
}

function getPropertyName(
  property: ObjectLiteralElementLike
): string | undefined {
  if (isPropertyAssignment(property) && isStringLiteral(property.name)) {
    return property.name.text;
  }
}

function getProperties(
  objectLiteral: typescript.Node
): typescript.NodeArray<typescript.ObjectLiteralElementLike> | undefined {
  if (typescript.isObjectLiteralExpression(objectLiteral)) {
    return objectLiteral.properties;
  } else if (isPropertyAssignment(objectLiteral)) {
    return getProperties(objectLiteral.initializer);
  }
}
