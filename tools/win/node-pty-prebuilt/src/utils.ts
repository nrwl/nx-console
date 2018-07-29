/**
 * Copyright (c) 2017, Daniel Imms (MIT License).
 */

export function assign(target: any, ...sources: any[]): any {
  sources.forEach(source =>
    Object.keys(source).forEach(key => (target[key] = source[key]))
  );
  return target;
}
