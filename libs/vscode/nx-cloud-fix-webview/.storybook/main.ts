import type { StorybookConfig } from '@storybook/web-components-vite';

import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.@(mdx|stories.@(js|jsx|ts|tsx))'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },

  viteFinal: async (config) =>
    mergeConfig(config, {
      plugins: [nxViteTsPaths()],
      css: {
        postcss: {
          plugins: [
            // require('tailwindcss')({
            //   config: './libs/vscode/nx-cloud-fix-webview/tailwind.config.js',
            // }),
          ],
        },
      },
    }),
};

export default config;

// To customize your Vite configuration you can use the viteFinal field.
// Check https://storybook.js.org/docs/react/builders/vite#configuration
// and https://nx.dev/recipes/storybook/custom-builder-configs
