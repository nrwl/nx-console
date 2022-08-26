/* eslint-disable */
export default {
  displayName: 'vscode-tasks',

  globals: {
    'ts-jest': { tsconfig: '<rootDir>/tsconfig.spec.json' },
  },
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../../coverage/libs/vscode/tasks',
  testEnvironment: 'node',
  preset: '../../../jest.preset.js',
};
