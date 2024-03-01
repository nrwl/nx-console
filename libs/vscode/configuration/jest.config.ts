/* eslint-disable */
export default {
  displayName: 'vscode-configuration',

  globals: {},
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../../coverage/libs/vscode/configuration',
  testEnvironment: 'node',
  preset: '../../../jest.preset.js',
  passWithNoTests: true,
};
