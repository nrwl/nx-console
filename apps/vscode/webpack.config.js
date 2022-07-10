/**
 * @param {import('webpack').Configuration} config
 * @returns
 */
module.exports = function transformWebpack(config) {
  let stats = config.stats || {};
  stats.warnings = false;
  config.stats = stats;
  config.module?.rules?.push({
    test: /\.html$/,
    loader: 'html-loader',
  });
  return config;
};
