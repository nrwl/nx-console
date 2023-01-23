import { addDecorator } from '@storybook/angular';
import { withKnobs } from '@storybook/addon-knobs';

addDecorator(withKnobs);

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
