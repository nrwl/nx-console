/* eslint-disable */
export default {
  displayName: 'vscode-nx-commands-view',

  globals: {
    'ts-jest': { tsconfig: '<rootDir>/tsconfig.spec.json' },
  },
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../../coverage/libs/vscode/nx-commands-view',
  testEnvironment: 'node',
  preset: '../../../jest.preset.js',
};
