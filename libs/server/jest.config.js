module.exports = {
  preset: '../../jest.preset.js',
  coverageDirectory: '../../coverage/libs/server',
  globals: { 'ts-jest': { tsConfig: '<rootDir>/tsconfig.spec.json' } },
  displayName: 'server',
};
