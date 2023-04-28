const rootMain = require('../../../../.storybook/main');
module.exports = rootMain;
module.exports.core = {
  builder: {
    name: '@storybook/builder-webpack5',
  },
};
module.exports.stories = [
  '../src/lib/**/*.stories.mdx',
  '../src/lib/**/*.stories.@(js|jsx|ts|tsx)',
];
module.exports.addons = [...rootMain.addons, '@storybook/addon-essentials'];
