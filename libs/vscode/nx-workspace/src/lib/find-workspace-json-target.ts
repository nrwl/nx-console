import { TextDocument } from 'vscode';
import { JSONVisitor, visit } from 'jsonc-parser';

export function findWorkspaceJsonTarget(
  document: TextDocument,
  project: string,
  target?: { name: string; configuration?: string }
): number {
  let scriptOffset = 0;
  let nestingLevel = 0;
  let inProjects = false;
  let inProject = false;
  let inTargets = false;
  let inExecutor = false;

  const visitor: JSONVisitor = {
    onError() {
      return scriptOffset;
    },
    onObjectEnd() {
      nestingLevel--;
    },
    onObjectBegin() {
      nestingLevel++;
    },
    onObjectProperty(property: string, offset: number) {
      if (scriptOffset) {
        return;
      }

      if (property === 'projects' && nestingLevel === 1) {
        inProjects = true;
      } else if (inProjects && nestingLevel === 2 && property === project) {
        inProject = true;
        if (!target) {
          scriptOffset = offset;
        }
      } else if (
        inProject &&
        nestingLevel === 3 &&
        (property === 'architect' || property === 'targets')
      ) {
        inTargets = true;
      } else if (inTargets && target) {
        if (property === target.name && nestingLevel === 4) {
          inExecutor = true;
          if (!target.configuration) {
            scriptOffset = offset;
          }
        } else if (
          inExecutor &&
          nestingLevel === 6 &&
          property === target.configuration
        ) {
          scriptOffset = offset;
        }
      }
    },
  };
  visit(document.getText(), visitor);

  return scriptOffset;
}

export function findWorkspaceJsonTargetAsync( document: TextDocument,
  project: string,
  target?: { name: string; configuration?: string }) {
  return Promise.resolve(findWorkspaceJsonTarget(document, project, target));
}
