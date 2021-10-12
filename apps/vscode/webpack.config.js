module.exports = function transformWebpack(config) {
  let stats = config.stats || {};
  stats.warnings = false;
  config.stats = stats;

  return config;
};
