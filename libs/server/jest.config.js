module.exports = {
  preset: '../../jest.preset.js',
  coverageDirectory: '../../coverage/libs/server',
  globals: { 'ts-jest': { tsconfig: '<rootDir>/tsconfig.spec.json' } },
  displayName: 'server',
  testEnvironment: 'node',
};
