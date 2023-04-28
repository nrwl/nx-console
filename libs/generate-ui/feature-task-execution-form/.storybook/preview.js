window.acquireVsCodeApi = () => {
  return {
    postMessage: (message) => {
      console.log(message);
    },
    getState: () => {
      return undefined;
    },
    setState: (_) => {
      return _;
    },
  };
};
