/* eslint-disable */
export default {
  displayName: 'vscode-configuration',

  globals: {
    'ts-jest': { tsconfig: '<rootDir>/tsconfig.spec.json' },
  },
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../../coverage/libs/vscode/configuration',
  testEnvironment: 'node',
  preset: '../../../jest.preset.js',
};
