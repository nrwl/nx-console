import { Logger } from '@nx-console/shared/schema';
import { exec } from 'node:child_process';
import {
  detectPackageManager,
  getPackageManagerCommand,
} from 'nx/src/utils/package-manager';

export async function nxReset(workspacePath: string, logger: Logger) {
  logger.log('Resetting workspace with `nx reset`');
  const packageManagerCommands = getPackageManagerCommand(
    detectPackageManager(workspacePath)
  );
  return new Promise<void>((res, rej) => {
    exec(
      `${packageManagerCommands.exec} nx reset`,
      {
        cwd: workspacePath,
      },
      (err) => {
        if (err) {
          rej(err);
        } else {
          res();
        }
      }
    );
  }).then(() => {
    return new Promise<void>((res, rej) => {
      logger.log('Starting Nx daemon');
      exec(
        `${packageManagerCommands.exec} nx daemon --start`,
        {
          cwd: workspacePath,
        },
        (err) => {
          if (err) {
            rej(err);
          } else {
            res();
          }
        }
      );
    });
  });
}
