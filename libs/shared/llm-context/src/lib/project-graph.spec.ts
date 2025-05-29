import type { ProjectGraph } from 'nx/src/devkit-exports';
import { getFilteredProjectGraphPrompt } from './project-graph';

describe('getFilteredProjectGraphPrompt', () => {
  const createMockProjectGraph = (projectCount: number): ProjectGraph => {
    const nodes: ProjectGraph['nodes'] = {};
    const dependencies: ProjectGraph['dependencies'] = {};

    for (let i = 0; i < projectCount; i++) {
      const projectName = `project-${i}`;
      nodes[projectName] = {
        name: projectName,
        type: i % 3 === 0 ? 'app' : 'lib',
        data: {
          root: i % 2 === 0 ? `apps/${projectName}` : `libs/${projectName}`,
          sourceRoot:
            i % 2 === 0 ? `apps/${projectName}/src` : `libs/${projectName}/src`,
          projectType: i % 3 === 0 ? 'application' : 'library',
          targets: {
            build: {
              executor: '@nx/js:build',
            },
            test: {
              executor: '@nx/jest:jest',
            },
          },
          tags: i % 4 === 0 ? ['shared'] : [],
        },
      };
      dependencies[projectName] = [];
    }

    return { nodes, dependencies };
  };

  describe('project limiting', () => {
    it('should limit projects to specified count', () => {
      const projectGraph = createMockProjectGraph(100);
      const result = getFilteredProjectGraphPrompt(projectGraph, {
        projectLimit: 10,
      });

      expect(result.includedProjects).toBe(10);
      expect(result.totalProjects).toBe(100);
      expect(result.wasFiltered).toBe(true);
      expect(result.content).toContain('Showing 10 of 100 projects');
    });

    it('should not filter when project count is under limit', () => {
      const projectGraph = createMockProjectGraph(5);
      const result = getFilteredProjectGraphPrompt(projectGraph, {
        projectLimit: 10,
      });

      expect(result.includedProjects).toBe(5);
      expect(result.totalProjects).toBe(5);
      expect(result.wasFiltered).toBe(false);
      expect(result.content).not.toContain('Showing');
    });

    it('should handle undefined limit by including all projects', () => {
      const projectGraph = createMockProjectGraph(50);
      const result = getFilteredProjectGraphPrompt(projectGraph, {});

      expect(result.includedProjects).toBe(50);
      expect(result.totalProjects).toBe(50);
      expect(result.wasFiltered).toBe(false);
    });
  });

  describe('project filtering by pattern', () => {
    it('should filter projects by glob pattern', () => {
      const projectGraph = createMockProjectGraph(20);
      const result = getFilteredProjectGraphPrompt(projectGraph, {
        projectFilter: 'libs/*',
      });

      expect(result.includedProjects).toBe(10); // Half are in libs/
      expect(result.totalProjects).toBe(20);
      expect(result.wasFiltered).toBe(true);
      expect(result.content).toContain('Filter: libs/*');
    });

    it('should handle multiple glob patterns', () => {
      const projectGraph = createMockProjectGraph(20);
      const result = getFilteredProjectGraphPrompt(projectGraph, {
        projectFilter: 'libs/*,apps/project-0',
      });

      expect(result.includedProjects).toBe(11); // 10 libs + 1 specific app
      expect(result.wasFiltered).toBe(true);
    });

    it('should combine limit and filter', () => {
      const projectGraph = createMockProjectGraph(30);
      const result = getFilteredProjectGraphPrompt(projectGraph, {
        projectFilter: 'libs/*',
        projectLimit: 5,
      });

      expect(result.includedProjects).toBe(5);
      expect(result.content).toContain('Filter: libs/*');
      expect(result.content).toContain('Showing 5 of');
    });
  });

  describe('output format', () => {
    it('should include filter summary at the beginning', () => {
      const projectGraph = createMockProjectGraph(100);
      const result = getFilteredProjectGraphPrompt(projectGraph, {
        projectLimit: 20,
        projectFilter: 'libs/*',
      });

      const lines = result.content.split('\n');
      expect(lines[0]).toContain('PROJECT GRAPH (FILTERED)');
      expect(lines[1]).toContain('Filter: libs/*');
      expect(lines[2]).toContain('Showing');
    });

    it('should sort projects alphabetically', () => {
      const projectGraph = createMockProjectGraph(5);
      const result = getFilteredProjectGraphPrompt(projectGraph, {});

      expect(result.content).toMatch(
        /project-0.*project-1.*project-2.*project-3.*project-4/s,
      );
    });

    it('should handle empty results gracefully', () => {
      const projectGraph = createMockProjectGraph(10);
      const result = getFilteredProjectGraphPrompt(projectGraph, {
        projectFilter: 'non-existent/*',
      });

      expect(result.includedProjects).toBe(0);
      expect(result.content).toContain('No projects match the filter criteria');
    });
  });
});
