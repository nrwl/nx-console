import { WorkspaceJsonSchema } from './workspace-json-schema';

describe('WorkspaceJsonSchema', () => {
  it('should work', () => {
    expect(new WorkspaceJsonSchema({} as never)).toBeTruthy();
  });
});
