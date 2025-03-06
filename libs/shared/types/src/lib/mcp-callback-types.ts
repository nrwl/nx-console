export type IdeCallbackMessage =
  | FocusProjectMessage
  | FocusTaskMessage
  | FullProjectGraphMessage;

export type FocusProjectMessage = {
  type: 'focus-project';
  payload: {
    projectName: string;
  };
};

export type FocusTaskMessage = {
  type: 'focus-task';
  payload: {
    projectName: string;
    taskName: string;
  };
};

export type FullProjectGraphMessage = {
  type: 'full-project-graph';
};
