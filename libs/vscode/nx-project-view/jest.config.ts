module.exports = {
  displayName: 'vscode-nx-project-view',

  globals: {
    'ts-jest': { tsconfig: '<rootDir>/tsconfig.spec.json' },
  },
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../../coverage/libs/vscode/nx-project-view',
  testEnvironment: 'node',
  preset: '../../../jest.preset.ts',
};
