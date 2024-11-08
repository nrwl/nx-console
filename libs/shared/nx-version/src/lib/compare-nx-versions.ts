import { NxVersion } from '@nx-console/shared/nx-version';
import { gte as semverGte } from 'semver';

export function gte(a: NxVersion, b: string): boolean;
export function gte(a: string, b: NxVersion): boolean;
export function gte(a: string, b: string): boolean;
export function gte(a: NxVersion | string, b: NxVersion | string): boolean {
  if (typeof a !== 'string') {
    a = a.full;
  }
  if (typeof b !== 'string') {
    b = b.full;
  }
  if (a.startsWith('0.0.0-pr-')) {
    return true;
  }
  if (b.startsWith('0.0.0-pr-')) {
    return false;
  }
  return semverGte(a, b);
}
