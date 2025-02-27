export type IdeCallbackMessage = FocusProjectMessage | FocusTaskMessage;

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
