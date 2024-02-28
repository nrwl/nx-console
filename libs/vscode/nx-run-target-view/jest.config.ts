/* eslint-disable */
export default {
  displayName: 'vscode-nx-run-target-view',

  globals: {},
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../../coverage/libs/vscode/nx-run-target-view',
  testEnvironment: 'node',
  preset: '../../../jest.preset.js',
  passWithNoTests: true,
};
