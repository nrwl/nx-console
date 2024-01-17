import {
  isObjectLiteralExpression,
  isPropertyAssignment,
  isStringLiteral,
} from 'typescript';
import type * as typescript from 'typescript';

export function getProperties(
  objectLiteral: typescript.Node
): typescript.NodeArray<typescript.ObjectLiteralElementLike> | undefined {
  if (isObjectLiteralExpression(objectLiteral)) {
    return objectLiteral.properties;
  } else if (isPropertyAssignment(objectLiteral)) {
    return getProperties(objectLiteral.initializer);
  }
}

export function getPropertyName(property: typescript.ObjectLiteralElementLike) {
  if (isPropertyAssignment(property) && isStringLiteral(property.name)) {
    return property.name.text;
  }
}
