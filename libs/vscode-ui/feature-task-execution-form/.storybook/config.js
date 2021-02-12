import { configure, addDecorator } from '@storybook/angular';
import { withKnobs } from '@storybook/addon-knobs';
window.vscode = {
  postMessage: () => {},
};
addDecorator(withKnobs);
configure(require.context('../src/lib', true, /\.stories\.tsx?$/), module);
