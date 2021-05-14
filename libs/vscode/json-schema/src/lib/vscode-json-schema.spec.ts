import { vscodeJsonSchema } from './vscode-json-schema';

describe('vscodeJsonSchema', () => {
  it('should work', () => {
    expect(vscodeJsonSchema()).toEqual('vscode-json-schema');
  });
});
