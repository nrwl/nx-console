/* eslint-disable */
export default {
  displayName: 'vscode-webview',

  globals: {
    'ts-jest': { tsconfig: '<rootDir>/tsconfig.spec.json' },
  },
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../../coverage/libs/vscode/webview',
  testEnvironment: 'node',
  preset: '../../../jest.preset.js',
};
