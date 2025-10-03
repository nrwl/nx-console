const { composePlugins, withNx } = require('@nx/webpack');

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), (config) => {
  // Note: This was added by an Nx migration. Webpack builds are required to have a corresponding Webpack config file.
  // See: https://nx.dev/recipes/webpack/webpack-config-setup
  return {
    ...config,
    module: {
      ...config.module,
      rules: [
        {
          test: /libs\/shared\/npm\/src\/lib\/[^/]+-dependencies/,
          loader: 'string-replace-loader',
          options: {
            search: 'require[(]([^\'"])',
            replace: '__non_webpack_require__($1',
            flags: 'g',
          },
        },
        ...config.module?.rules,
      ],
    },
  };
});
