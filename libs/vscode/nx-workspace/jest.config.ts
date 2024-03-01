/* eslint-disable */
export default {
  displayName: 'vscode-nx-workspace',

  globals: {},
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^@nx-console/vscode/(.+)$': '<rootDir>/libs/vscode/$1/src/index.ts',
  },
  coverageDirectory: '../../../coverage/libs/vscode/nx-workspace',
  testEnvironment: 'node',
  preset: '../../../jest.preset.js',
  passWithNoTests: true,
};
