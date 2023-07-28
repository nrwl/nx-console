import { Position, TextDocument } from 'vscode';
import type * as typescript from 'typescript';
import {
  isObjectLiteralExpression,
  isPropertyAssignment,
  isStringLiteral,
  parseJsonText,
} from 'typescript';

export interface ProjectLocations {
  [projectName: string]: {
    position: number;
    targets?: ProjectTargetLocation;
    projectPath?: string;
  };
}
export interface ProjectTargetLocation {
  [target: string]: {
    position: number;
    configurations?: ProjectTargetLocation;
  };
}

export function getProjectLocations(document: TextDocument, projectName = '') {
  const projectLocations: ProjectLocations = {};
  const json = parseJsonText('workspace.json', document.getText());
  const statement = json.statements[0];
  const projects = getProperties(statement.expression)?.find(
    (property) => getPropertyName(property) === 'projects'
  ) as typescript.PropertyAssignment | undefined;

  if (projects) {
    getProperties(projects.initializer)?.forEach((project) => {
      const projectName = getPropertyName(project);
      if (!projectName) {
        return;
      }

      if (project)
        if (isProjectPathConfig(project)) {
          projectLocations[projectName] = {
            position: project.getStart(json),
            projectPath: project.initializer.getText(json).replace(/"/g, ''),
          };
        } else {
          projectLocations[projectName] = {
            position: project.getStart(json),
            targets:
              getPositions(project, ['architect', 'targets'], json) ?? {},
          };
        }
    });
  } else {
    projectLocations[projectName] = {
      position: 0,
      targets:
        getPositions(statement.expression, ['architect', 'targets'], json) ??
        {},
    };
  }

  return projectLocations;
}
export function getTargetsPropertyLocation(
  document: TextDocument
): Position | undefined {
  const json = parseJsonText('project.json', document.getText());
  const statement = json.statements[0];

  const targetsProperty = getProperties(statement.expression)?.filter(
    (prop) => getPropertyName(prop) === 'targets'
  )?.[0];
  if (!targetsProperty) {
    return;
  }
  return document.positionAt(targetsProperty.getStart(json));
}

function getProperties(
  objectLiteral: typescript.Node
): typescript.NodeArray<typescript.ObjectLiteralElementLike> | undefined {
  if (isObjectLiteralExpression(objectLiteral)) {
    return objectLiteral.properties;
  } else if (isPropertyAssignment(objectLiteral)) {
    return getProperties(objectLiteral.initializer);
  }
}

function isProjectPathConfig(
  property: typescript.ObjectLiteralElementLike
): property is typescript.PropertyAssignment {
  return (
    isPropertyAssignment(property) && isStringLiteral(property.initializer)
  );
}

function getPropertyName(property: typescript.ObjectLiteralElementLike) {
  if (isPropertyAssignment(property) && isStringLiteral(property.name)) {
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
