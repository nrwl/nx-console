import { NxError } from '@nx-console/shared-types';

export function getMessageForError(error: NxError): string {
  if (error.message && error.cause?.message) {
    return `${error.message} \n ${error.cause.message}`;
  }
  if (
    (error.name === 'ProjectsWithNoNameError' ||
      error.name === 'MultipleProjectsWithSameNameError' ||
      error.name === 'ProjectWithExistingNameError') &&
    error.message
  ) {
    return error.message;
  }
  return error.stack ?? error.message ?? 'Unknown error';
}
