import { isToolEnabled } from './tool-filter';
describe('isToolEnabled', () => {
  describe('when no filter is provided', () => {
    it('should enable all tools when filter is undefined', () => {
      expect(isToolEnabled('nx_docs', undefined)).toBe(true);
      expect(isToolEnabled('cloud_analytics', undefined)).toBe(true);
    });
    it('should enable all tools when filter is empty array', () => {
      expect(isToolEnabled('nx_docs', [])).toBe(true);
      expect(isToolEnabled('cloud_analytics', [])).toBe(true);
    });
  });
  describe('positive patterns', () => {
    it('should match exact tool names', () => {
      expect(isToolEnabled('nx_docs', ['nx_docs'])).toBe(true);
      expect(isToolEnabled('nx_workspace', ['nx_docs'])).toBe(false);
    });
    it('should match wildcard patterns', () => {
      expect(isToolEnabled('nx_docs', ['*'])).toBe(true);
      expect(isToolEnabled('cloud_analytics', ['*'])).toBe(true);
    });
    it('should match prefix patterns', () => {
      expect(isToolEnabled('nx_docs', ['nx_*'])).toBe(true);
      expect(isToolEnabled('nx_workspace', ['nx_*'])).toBe(true);
      expect(isToolEnabled('cloud_analytics', ['nx_*'])).toBe(false);
    });
    it('should match suffix patterns', () => {
      expect(isToolEnabled('cloud_analytics', ['*_analytics'])).toBe(true);
      expect(isToolEnabled('nx_docs', ['*_analytics'])).toBe(false);
    });
    it('should match any of multiple positive patterns', () => {
      expect(isToolEnabled('nx_docs', ['nx_docs', 'cloud_*'])).toBe(true);
      expect(isToolEnabled('cloud_analytics', ['nx_docs', 'cloud_*'])).toBe(
        true,
      );
      expect(isToolEnabled('other_tool', ['nx_docs', 'cloud_*'])).toBe(false);
    });
  });
  describe('negative patterns', () => {
    it('should exclude tools matching negative patterns', () => {
      expect(isToolEnabled('nx_docs', ['!nx_docs'])).toBe(false);
      expect(isToolEnabled('nx_workspace', ['!nx_docs'])).toBe(true);
    });
    it('should exclude tools matching negative wildcard patterns', () => {
      expect(isToolEnabled('cloud_analytics', ['!cloud_*'])).toBe(false);
      expect(isToolEnabled('nx_docs', ['!cloud_*'])).toBe(true);
    });
    it('should enable all tools except those matching negative patterns', () => {
      const filter = ['!nx_docs', '!cloud_analytics'];
      expect(isToolEnabled('nx_docs', filter)).toBe(false);
      expect(isToolEnabled('cloud_analytics', filter)).toBe(false);
      expect(isToolEnabled('nx_workspace', filter)).toBe(true);
      expect(isToolEnabled('other_tool', filter)).toBe(true);
    });
  });
  describe('combined positive and negative patterns', () => {
    it('should include matching positive and exclude matching negative', () => {
      const filter = ['nx_*', '!nx_docs'];
      expect(isToolEnabled('nx_workspace', filter)).toBe(true);
      expect(isToolEnabled('nx_project_details', filter)).toBe(true);
      expect(isToolEnabled('nx_docs', filter)).toBe(false);
      expect(isToolEnabled('cloud_analytics', filter)).toBe(false);
    });
    it('should prioritize negative patterns over positive patterns', () => {
      const filter = ['*', '!cloud_*'];
      expect(isToolEnabled('nx_docs', filter)).toBe(true);
      expect(isToolEnabled('cloud_analytics', filter)).toBe(false);
      expect(isToolEnabled('cloud_pipeline', filter)).toBe(false);
    });
    it('should handle complex filter combinations', () => {
      const filter = ['nx_*', 'cloud_analytics', '!nx_docs', '!nx_generators'];
      expect(isToolEnabled('nx_workspace', filter)).toBe(true);
      expect(isToolEnabled('nx_project_details', filter)).toBe(true);
      expect(isToolEnabled('nx_docs', filter)).toBe(false);
      expect(isToolEnabled('nx_generators', filter)).toBe(false);
      expect(isToolEnabled('cloud_analytics', filter)).toBe(true);
      expect(isToolEnabled('cloud_pipeline', filter)).toBe(false);
    });
  });
  describe('edge cases', () => {
    it('should handle tools with special characters in names', () => {
      expect(isToolEnabled('nx-docs', ['nx-*'])).toBe(true);
      expect(isToolEnabled('nx.docs', ['nx.*'])).toBe(true);
    });
    it('should be case-sensitive', () => {
      expect(isToolEnabled('NX_DOCS', ['nx_*'])).toBe(false);
      expect(isToolEnabled('nx_docs', ['NX_*'])).toBe(false);
    });
  });
});
