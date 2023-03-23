/* eslint-disable */
export default {
  displayName: 'vscode-verify',

  globals: {},
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../../coverage/libs/vscode/verify',
  testEnvironment: 'node',
  preset: '../../../jest.preset.js',
};
