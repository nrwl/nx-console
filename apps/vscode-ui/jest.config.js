module.exports = {
  name: 'vscode-ui',
  preset: '../../jest.config.js',
  coverageDirectory: '../../coverage/apps/vscode-ui',
  snapshotSerializers: [
    'jest-preset-angular/AngularSnapshotSerializer.js',
    'jest-preset-angular/HTMLCommentSerializer.js'
  ]
};
