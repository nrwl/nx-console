module.exports = function transformWebpack(config, options) {
  // the default node webpack config has minimize: false when optimization is set to true
  delete config.optimization;
  return config;
};
