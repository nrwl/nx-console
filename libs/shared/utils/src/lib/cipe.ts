import { CIPEExecutionStatus } from '@nx-console/shared-types';

export function isCompleteStatus(status: CIPEExecutionStatus): boolean {
  switch (status) {
    case 'SUCCEEDED':
      return true;
    case 'FAILED':
      return true;
    case 'CANCELED':
      return true;
    case 'TIMED_OUT':
      return true;
    default:
      return false;
  }
}

export function isFailedStatus(status: CIPEExecutionStatus): boolean {
  return status === 'FAILED' || status === 'CANCELED' || status === 'TIMED_OUT';
}
