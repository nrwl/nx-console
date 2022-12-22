export type WebviewMessage = {
  command: string;

  id?: string;
  commandString?: string;
  runLinkId?: string;
};
export const SETUP_CLOUD_RUNNER_COMMAND = 'setup-cloud-runner';

export const RUN_FIRST_COMMAND_COMMAND = 'run-first-command';

export const LOGIN_COMMAND = 'login';

export const LOGIN_AND_CLAIM_COMMAND = 'login-and-claim';

export const CLAIM_COMMAND = 'claim';

export const SHOW_HELP_COMMAND = 'show-help';

export const REFRESH_COMMAND = 'refresh';

export const INSPECT_RUN_COMMAND = 'inspect-run';

export const SETUP_VCS_COMMAND = 'setup-vcs';

export const OPEN_WEBAPP_COMMAND = 'open-webapp';
