/* eslint-disable */
export default {
  displayName: 'vscode-nx-cloud-view',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../coverage/libs/vscode/nx-cloud-view',
  passWithNoTests: true,
};
