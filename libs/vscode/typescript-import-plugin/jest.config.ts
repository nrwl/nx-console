/* eslint-disable */
module.exports = {
  displayName: 'vscode-typescript-import-plugin',

  globals: {},
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        isolatedModules: true,
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../../coverage/libs/vscode/typescript-import-plugin',
  preset: '../../../jest.preset.js',
  passWithNoTests: true,
};
