/* eslint-disable */
export default {
  displayName: 'shared-json-schema',

  globals: {},
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: 'test-output/jest/coverage',
  testEnvironment: 'node',
  preset: '../../../jest.preset.js',
  passWithNoTests: true,
};
