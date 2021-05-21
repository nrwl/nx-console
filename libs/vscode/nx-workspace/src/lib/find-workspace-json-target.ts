import { TextDocument } from 'vscode';
import { JSONVisitor, visit } from 'jsonc-parser';
import * as typescript from 'typescript';

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

export function findWorkspaceJsonTargetAsync(
  document: TextDocument,
  project: string,
  target?: { name: string; configuration?: string }
) {
  return Promise.resolve(findWorkspaceJsonTarget(document, project, target));
}

export interface ProjectLocations {
  [projectName: string]: ProjectTargetLocation;
}
export interface ProjectTargetLocation {
  [target: string]: {
    position: number;
    configurations?: ProjectTargetLocation;
  };
}

export function getProjectLocations(document: TextDocument) {
  const projectLocations: ProjectLocations = {};
  const json = typescript.parseJsonText('workspace.json', document.getText());
  const statement = json.statements[0];
  const projects = getProperties(statement.expression)?.find(
    (property) => getPropertyName(property) === 'projects'
  ) as typescript.PropertyAssignment | undefined;

  if (!projects) {
    return projectLocations;
  }

  getProperties(projects.initializer)?.forEach((project) => {
    const projectName = getPropertyName(project);
    if (!projectName) {
      return;
    }
    projectLocations[projectName] =
      getPositions(project, ['architect', 'targets'], json) ?? {};
  });

  return projectLocations;
}

function getProperties(
  objectLiteral: typescript.Node
): typescript.NodeArray<typescript.ObjectLiteralElementLike> | undefined {
  if (typescript.isObjectLiteralExpression(objectLiteral)) {
    return objectLiteral.properties;
  } else if (typescript.isPropertyAssignment(objectLiteral)) {
    return getProperties(objectLiteral.initializer);
  }
}

function getPropertyName(property: typescript.ObjectLiteralElementLike) {
  if (
    typescript.isPropertyAssignment(property) &&
    typescript.isStringLiteral(property.name)
  ) {
    return property.name.text;
  }
}

function getPositions(
  property: typescript.Node,
  properties: string[],
  document: typescript.JsonSourceFile
): ProjectTargetLocation | undefined {
  const objectLike = getProperties(property)?.find((prop) => {
    const propName = getPropertyName(prop);
    return properties.some((value) => propName === value);
  });

  if (!objectLike) {
    return undefined;
  }

  return getProperties(objectLike)?.reduce<ProjectTargetLocation>(
    (acc, prop) => {
      const propName = getPropertyName(prop);

      if (!propName) {
        return acc;
      }

      acc[propName] = {
        position: prop.getStart(document),
      };

      // get configuration positions
      const configs = getPositions(prop, ['configurations'], document);

      if (configs) {
        acc[propName].configurations = configs;
      }

      return acc;
    },
    {}
  );
}
