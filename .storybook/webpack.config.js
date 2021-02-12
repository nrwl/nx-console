// Export a function. Accept the base config as the only param.
module.exports = async ({ config, mode }) => {
  // `mode` has a value of 'DEVELOPMENT' or 'PRODUCTION'
  // You can change the configuration based on that.
  // 'PRODUCTION' is used when building the static version of storybook.

  // Make whatever fine-grained changes you need
  config.module.rules.forEach((rule) => {
    (rule.use || []).forEach((parser) => {
      if (parser.loader === 'ts-loader') {
        parser.options = {
          ...parser.options,
          transpileOnly: false,
        };
      }
    });
  });

  // Return the altered config
  return config;
};
