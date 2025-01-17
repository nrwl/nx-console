import { NxVersion } from '@nx-console/nx-version';

export type MigrateViewData = {
  currentNxVersion?: NxVersion;
  latestNxVersion?: NxVersion;
  hasMigrationsJson?: boolean;
  migrationsJsonSection?: any;
  hasPendingChanges?: boolean;
};
