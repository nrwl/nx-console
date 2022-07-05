export default {
  displayName: 'vscode-nx-run-target-view',

  globals: {
    'ts-jest': { tsconfig: '<rootDir>/tsconfig.spec.json' },
  },
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../../coverage/libs/vscode/nx-run-target-view',
  testEnvironment: 'node',
  preset: '../../../jest.preset.js',
};
