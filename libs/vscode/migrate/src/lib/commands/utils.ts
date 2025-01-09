import { importNxPackagePath } from '@nx-console/shared-npm';
import type { MigrationsJsonMetadata } from 'nx/src/command-line/migrate/migrate-ui-api';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as migrateUiApi from 'nx/src/command-line/migrate/migrate-ui-api';

export function modifyMigrationsJsonMetadata(
  modify: (
    migrationsJsonMetadata: MigrationsJsonMetadata,
  ) => MigrationsJsonMetadata,
) {
  const nxWorkspacePath = getNxWorkspacePath();
  const migrationsJsonPath = join(nxWorkspacePath, 'migrations.json');
  const migrationsJson = JSON.parse(readFileSync(migrationsJsonPath, 'utf-8'));
  migrationsJson['nx-console'] = modify(migrationsJson['nx-console']);
  writeFileSync(migrationsJsonPath, JSON.stringify(migrationsJson, null, 2));
}

export function readMigrationsJsonMetadata(): MigrationsJsonMetadata {
  const workspacePath = getNxWorkspacePath();
  const migrationsJsonPath = join(workspacePath, 'migrations.json');
  const migrationsJson = JSON.parse(readFileSync(migrationsJsonPath, 'utf-8'));
  return migrationsJson['nx-console'];
}

// tries importing the migrate ui from the local nx package but falls back to the bundled one
export async function importMigrateUIApi(workspacePath: string) {
  try {
    const migrateUiApi = await importNxPackagePath<
      typeof import('nx/src/command-line/migrate/migrate-ui-api')
    >(workspacePath, 'src/command-line/migrate/migrate-ui-api');
    return migrateUiApi;
  } catch (e) {
    // do nothing
  }
  return migrateUiApi;
}
