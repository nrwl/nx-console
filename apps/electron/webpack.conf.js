module.exports = function transformWebpack(config) {
  config.resolve.mainFields = ['main'];
  return config;
};
