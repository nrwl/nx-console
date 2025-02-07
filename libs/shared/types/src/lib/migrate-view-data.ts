import { NxVersion } from '@nx-console/nx-version';
import type { MigrationsJsonMetadata } from 'nx/src/command-line/migrate/migrate-ui-api';

export type MigrateViewData = {
  currentNxVersion?: NxVersion;
  latestNxVersion?: NxVersion;
  hasMigrationsJson?: boolean;
  migrationsJsonSection?: MigrationsJsonMetadata;
  hasPendingChanges?: boolean;
};
