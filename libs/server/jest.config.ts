module.exports = {
  coverageDirectory: '../../coverage/libs/server',
  globals: { 'ts-jest': { tsconfig: '<rootDir>/tsconfig.spec.json' } },
  displayName: 'server',
  testEnvironment: 'node',
  preset: '../../jest.preset.ts',
};
