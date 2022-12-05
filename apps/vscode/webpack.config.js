module.exports = function transformWebpack(config) {
  let stats = config.stats || {}
  stats.warnings = false;
  config.stats = stats;

  config.module.rules.push({
    test: /\.d.ts?$/,
    loader: 'esbuild-loader',
    options: {
      loader: 'ts', 
      target: 'es2015'
    }
  });

  return config;
};