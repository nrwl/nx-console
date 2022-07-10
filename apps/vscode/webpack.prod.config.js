/**
 * @param {import('webpack').Configuration} config
 * @returns
 */
module.exports = function transformWebpack(config) {
  // the default node webpack config has minimize: false when optimization is set to true
  config.output.filename = '[name].js';
  config.optimization = {
    minimize: true,
    concatenateModules: true,
    sideEffects: false,
    splitChunks: {
      chunks: 'all',
    },
  };

  config.module?.rules?.push({
    test: /\.html$/,
    loader: 'html-loader',
  });

  return config;
};
