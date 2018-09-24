/*
 * This configuration normalizes the one provided by user to ensure we can track the output correctly.
 */

module.exports = function(config: any) {
  const originalConfigPath =
    process.env.ANGULAR_CONSOLE_ORIGINAL_KARMA_CONFIG_PATH;
  if (originalConfigPath) {
    const original = require(originalConfigPath);

    original(config);

    const reporters: any[] = _getArrayValue('reporters', config);
    const filteredReporters = reporters.filter(r => r !== 'dots'); // Don't allow dots report to mess up reporting.

    config.set({
      reporters:
        filteredReporters.indexOf('progress') > -1
          ? filteredReporters
          : ['progress'].concat(filteredReporters)
    });
  }
};

function _getArrayValue(name: string, config: any) {
  const value = config[name];
  return Array.isArray(value) ? value : (value || '').split(',');
}
