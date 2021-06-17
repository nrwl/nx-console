module.exports = {
  preset: '../../jest.preset.js',
  coverageDirectory: '../../coverage/libs/server',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  globals: { 'ts-jest': { tsconfig: '<rootDir>/tsconfig.spec.json' } },
  displayName: 'server',
  testEnvironment: 'node',
};
