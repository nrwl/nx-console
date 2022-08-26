/* eslint-disable */
export default {
  displayName: 'vscode-nx-workspace',

  globals: {
    'ts-jest': { tsconfig: '<rootDir>/tsconfig.spec.json' },
  },
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^@nx-console/vscode/(.+)$': '<rootDir>/libs/vscode/$1/src/index.ts',
  },
  coverageDirectory: '../../../coverage/libs/vscode/nx-workspace',
  testEnvironment: 'node',
  preset: '../../../jest.preset.js',
};
