import { NxVersion } from '@nx-console/nx-version';
import type { FileChange } from 'nx/src/devkit-exports';

export type MigrateViewData = {
  currentNxVersion?: NxVersion;
  latestNxVersion?: NxVersion;
  hasMigrationsJson?: boolean;
  migrationsJsonSection?: MigrationsJsonMetadata;
  hasPendingChanges?: boolean;
};

export type MigrationsJsonMetadata = {
  completedMigrations?: Record<string, SuccessfulMigration | FailedMigration>;
  runningMigrations?: string[];
  initialGitRef?: {
    ref: string;
    subject: string;
  };
  confirmedPackageUpdates?: boolean;
  targetVersion?: string;
};

export type SuccessfulMigration = {
  type: 'successful';
  name: string;
  changedFiles: Omit<FileChange, 'content'>[];
};

export type FailedMigration = {
  type: 'failed';
  name: string;
  error: string;
};
