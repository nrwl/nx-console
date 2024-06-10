/* eslint-disable */
export default {
  displayName: 'nxls-e2e',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  testTimeout: 600000,
  globalSetup: './global-setup.ts',
};
