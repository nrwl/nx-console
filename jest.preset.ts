const nxPreset = require('@nrwl/jest/preset');
module.exports = {
  ...nxPreset,
  transformIgnorePatterns: ['node_modules/(?!(@types)/)'],
};
