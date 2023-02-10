const { composePlugins, withNx } = require('@nrwl/webpack');

module.exports = composePlugins(withNx(), (config) => {
  let stats = config.stats || {};
  stats.warnings = false;
  config.stats = stats;

  return config;
});
