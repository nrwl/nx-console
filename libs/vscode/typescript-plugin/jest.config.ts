/* eslint-disable */
export default {
  displayName: 'vscode-typescript-plugin',

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
  coverageDirectory: '../../../coverage/libs/vscode/typescript-plugin',
  preset: '../../../jest.preset.js',
  passWithNoTests: true,
};
