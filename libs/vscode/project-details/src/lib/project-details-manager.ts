import { getProjectByPath } from '@nx-console/vscode/nx-workspace';
import { showNoProjectAtPathMessage } from '@nx-console/vscode/utils';
import {
  ExtensionContext,
  TextDocument,
  Uri,
  ViewColumn,
  window,
} from 'vscode';
import { ProjectDetailsPreview } from './project-details-preview';
import {
  isPropertyAssignment,
  isStringLiteral,
  parseJsonText,
} from 'typescript';
import {
  getProperties,
  getPropertyName,
} from '@nx-console/vscode/nx-config-decoration';

export class ProjectDetailsManager {
  private previews: Map<string, ProjectDetailsPreview> = new Map();

  constructor(private context: ExtensionContext) {}

  async openProjectDetailsToSide(
    document: TextDocument,
    expandedTarget?: string
  ) {
    const project = await getProjectNameFromUri(document);
    console.log('got project');
    if (!project) {
      return;
    }

    let preview = this.previews.get(project.root);
    if (!preview) {
      if (!project.name) {
        return;
      }
      preview = new ProjectDetailsPreview(
        project.name,
        this.context,
        expandedTarget
      );
      preview.onDispose(() => {
        this.previews.delete(project.root);
      });
      this.previews.set(project.root, preview);
    }

    preview.reveal(ViewColumn.Beside);
  }
}

async function getProjectNameFromUri(
  document: TextDocument
): Promise<{ name?: string; root: string } | undefined> {
  if (document.fileName.endsWith('project.json')) {
    try {
      JSON.parse(document.getText());
    } catch (e) {
      window.showErrorMessage(
        `Error parsing ${document.fileName}. Please make sure the JSON is valid. `
      );
      return;
    }
    const json = parseJsonText(document.fileName, document.getText());

    const properties = getProperties(json.statements[0].expression);

    let name: string | undefined = undefined;
    const nameProperty = properties?.find(
      (prop) => getPropertyName(prop) === 'name'
    );

    if (
      nameProperty &&
      isPropertyAssignment(nameProperty) &&
      isStringLiteral(nameProperty.initializer)
    ) {
      name = nameProperty.initializer.text;
    }
    const sourceRootProperty = properties?.find(
      (prop) => getPropertyName(prop) === 'sourceRoot'
    );
    if (
      sourceRootProperty &&
      isPropertyAssignment(sourceRootProperty) &&
      isStringLiteral(sourceRootProperty.initializer)
    ) {
      return {
        root: sourceRootProperty.initializer.text,
        name,
      };
    }
  }
  const project = await getProjectByPath(document.uri.path);
  if (!project) {
    showNoProjectAtPathMessage(document.uri.path);
  }
  return;
}
