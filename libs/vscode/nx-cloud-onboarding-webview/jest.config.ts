/* eslint-disable */
export default {
  displayName: 'nx-cloud-onboarding-webview',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory:
    '../../../coverage/libs/vscode/nx-cloud-onboarding-webview',
  passWithNoTests: true,
};
