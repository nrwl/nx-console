import type { ProjectGraph } from 'nx/src/devkit-exports';
import { detectAtomizedTargets, getProjectGraphPrompt } from './project-graph';
describe('project-graph', () => {
  describe('getProjectGraphPrompt', () => {
    it('should truncate dependencies when more than 10 exist', () => {
      const projectGraph: ProjectGraph = {
        version: '6.0',
        nodes: {
          'test-project': {
            name: 'test-project',
            type: 'lib',
            data: {
              root: 'libs/test-project',
              targets: {
                build: {},
                test: {},
              },
            },
          },
        },
        dependencies: {
          'test-project': Array.from({ length: 15 }, (_, i) => ({
            source: 'test-project',
            target: `dep-${i}`,
            type: 'static',
          })),
        },
        externalNodes: {},
      };
      const result = getProjectGraphPrompt(projectGraph);
      expect(result).toContain(
        'deps:[dep-0,dep-1,dep-2,dep-3,dep-4,dep-5,dep-6,dep-7,...7 more]',
      );
    });
    it('should exclude external nodes from dependencies', () => {
      const projectGraph: ProjectGraph = {
        version: '6.0',
        nodes: {
          'test-project': {
            name: 'test-project',
            type: 'lib',
            data: {
              root: 'libs/test-project',
              targets: {
                build: {},
              },
            },
          },
        },
        dependencies: {
          'test-project': [
            {
              source: 'test-project',
              target: 'internal-dep',
              type: 'static',
            },
            {
              source: 'test-project',
              target: 'npm:external-package',
              type: 'static',
            },
          ],
        },
        externalNodes: {
          'npm:external-package': {
            name: 'npm:external-package',
            type: 'npm',
            data: {
              version: '1.0.0',
              packageName: 'external-package',
            },
          },
        },
      };
      const result = getProjectGraphPrompt(projectGraph);
      expect(result).toContain('deps:[internal-dep]');
      expect(result).not.toContain('npm:external-package');
    });
    it('should exclude atomized targets when root target exists', () => {
      const projectGraph: ProjectGraph = {
        version: '6.0',
        nodes: {
          'test-project': {
            name: 'test-project',
            type: 'lib',
            data: {
              root: 'libs/test-project',
              targets: {
                'e2e-ci': {},
                'e2e-ci--src/test1.cy.ts': {
                  metadata: { nonAtomizedTarget: 'e2e-ci' },
                },
                'e2e-ci--src/test2.cy.ts': {
                  metadata: { nonAtomizedTarget: 'e2e-ci' },
                },
                build: {},
              },
            },
          },
        },
        dependencies: {
          'test-project': [],
        },
        externalNodes: {},
      };
      const result = getProjectGraphPrompt(projectGraph);
      expect(result).toContain('targets:[e2e-ci,build]');
      expect(result).not.toContain('e2e-ci--src/test1.cy.ts');
      expect(result).not.toContain('e2e-ci--src/test2.cy.ts');
    });
    it('should exclude atomized targets when multiple root targes exist', () => {
      const projectGraph: ProjectGraph = {
        version: '6.0',
        nodes: {
          'test-project': {
            name: 'test-project',
            type: 'lib',
            data: {
              root: 'libs/test-project',
              targets: {
                'e2e-ci': {},
                'e2e-ci--src/test1.cy.ts': {
                  metadata: { nonAtomizedTarget: 'e2e-ci' },
                },
                'e2e-ci--src/test2.cy.ts': {
                  metadata: { nonAtomizedTarget: 'e2e-ci' },
                },
                'test-ci': {},
                'test-ci--src/test1.cy.ts': {
                  metadata: { nonAtomizedTarget: 'test-ci' },
                },
                'test-ci--src/test2.cy.ts': {
                  metadata: { nonAtomizedTarget: 'test-ci' },
                },
                build: {},
              },
            },
          },
        },
        dependencies: {
          'test-project': [],
        },
        externalNodes: {},
      };
      const result = getProjectGraphPrompt(projectGraph);
      expect(result).toContain('targets:[e2e-ci,test-ci,build]');
      expect(result).not.toContain('e2e-ci--src/test1.cy.ts');
      expect(result).not.toContain('e2e-ci--src/test2.cy.ts');
      expect(result).not.toContain('test-ci--src/test1.cy.ts');
      expect(result).not.toContain('test-ci--src/test2.cy.ts');
    });
    it('should exclude specific system targets', () => {
      const projectGraph: ProjectGraph = {
        version: '6.0',
        nodes: {
          'test-project': {
            name: 'test-project',
            type: 'lib',
            data: {
              root: 'libs/test-project',
              targets: {
                build: {},
                test: {},
                'nx-release-publish': {},
                nxProjectGraph: {},
                nxProjectReport: {},
              },
            },
          },
        },
        dependencies: {
          'test-project': [],
        },
        externalNodes: {},
      };
      const result = getProjectGraphPrompt(projectGraph);
      expect(result).toContain('targets:[build,test]');
      expect(result).not.toContain('nx-release-publish');
      expect(result).not.toContain('nxProjectGraph');
      expect(result).not.toContain('nxProjectReport');
    });
    it('should include metadata when present', () => {
      const projectGraph: ProjectGraph = {
        version: '6.0',
        nodes: {
          'test-project': {
            name: 'test-project',
            type: 'lib',
            data: {
              root: 'libs/test-project',
              targets: {
                build: {},
              },
              metadata: {
                technologies: ['react', 'typescript'],
                owners: {
                  '@team-alpha': { ownedFiles: [{ files: ['*'] }] },
                },
              },
              tags: ['scope:shared', 'type:lib'],
            },
          },
        },
        dependencies: {
          'test-project': [],
        },
        externalNodes: {},
      };
      const result = getProjectGraphPrompt(projectGraph);
      expect(result).toContain('technologies:[react,typescript]');
      expect(result).toContain('owners:[@team-alpha]');
      expect(result).toContain('tags:[scope:shared,type:lib]');
    });
    it('should handle empty dependencies gracefully', () => {
      const projectGraph: ProjectGraph = {
        version: '6.0',
        nodes: {
          'test-project': {
            name: 'test-project',
            type: 'lib',
            data: {
              root: 'libs/test-project',
              targets: {
                build: {},
              },
            },
          },
        },
        dependencies: {
          'test-project': [],
        },
        externalNodes: {},
      };
      const result = getProjectGraphPrompt(projectGraph);
      expect(result).not.toContain('deps:[]');
      expect(result).toContain('<test-project>');
      expect(result).toContain('</>');
    });
    describe('optimizations', () => {
      it('should skip technologies when skipTechnologies is true', () => {
        const projectGraph: ProjectGraph = {
          version: '6.0',
          nodes: {
            'test-project': {
              name: 'test-project',
              type: 'lib',
              data: {
                root: 'libs/test-project',
                targets: {
                  build: {},
                },
                metadata: {
                  technologies: ['react', 'typescript'],
                  owners: {
                    '@team-alpha': { ownedFiles: [{ files: ['*'] }] },
                  },
                },
                tags: ['scope:shared', 'type:lib'],
              },
            },
          },
          dependencies: {
            'test-project': [],
          },
          externalNodes: {},
        };
        const result = getProjectGraphPrompt(projectGraph, {
          skipTechnologies: true,
        });
        expect(result).not.toContain('technologies:[react,typescript]');
        expect(result).toContain('owners:[@team-alpha]');
        expect(result).toContain('tags:[scope:shared,type:lib]');
      });
      it('should skip owners when skipOwners is true', () => {
        const projectGraph: ProjectGraph = {
          version: '6.0',
          nodes: {
            'test-project': {
              name: 'test-project',
              type: 'lib',
              data: {
                root: 'libs/test-project',
                targets: {
                  build: {},
                },
                metadata: {
                  technologies: ['react', 'typescript'],
                  owners: {
                    '@team-alpha': { ownedFiles: [{ files: ['*'] }] },
                  },
                },
                tags: ['scope:shared', 'type:lib'],
              },
            },
          },
          dependencies: {
            'test-project': [],
          },
          externalNodes: {},
        };
        const result = getProjectGraphPrompt(projectGraph, {
          skipOwners: true,
        });
        expect(result).toContain('technologies:[react,typescript]');
        expect(result).not.toContain('owners:[@team-alpha]');
        expect(result).toContain('tags:[scope:shared,type:lib]');
      });
      it('should truncate targets when truncateTargets is true', () => {
        const projectGraph: ProjectGraph = {
          version: '6.0',
          nodes: {
            'test-project': {
              name: 'test-project',
              type: 'lib',
              data: {
                root: 'libs/test-project',
                targets: {
                  build: {},
                  test: {},
                  lint: {},
                  compile: {},
                  verify: {},
                  check: {},
                  format: {},
                  watch: {},
                  serve: {},
                  dev: {},
                  deploy: {},
                },
              },
            },
          },
          dependencies: {
            'test-project': [],
          },
          externalNodes: {},
        };
        const result = getProjectGraphPrompt(projectGraph, {
          truncateTargets: true,
        });
        expect(result).toContain('targets:[build,test');
        expect(result).not.toContain('deploy');
        expect(result).toContain('...3 more');
      });
    });
  });
  describe('detectAtomizedTargets', () => {
    it('should detect atomized targets correctly', () => {
      const targets = {
        'test-ci': {},
        'test-ci--Test1': { metadata: { nonAtomizedTarget: 'test-ci' } },
        'test-ci--Test2': { metadata: { nonAtomizedTarget: 'test-ci' } },
        'test-ci--Test3': { metadata: { nonAtomizedTarget: 'test-ci' } },
      };
      const result = detectAtomizedTargets(targets);
      expect(result.rootTargets).toEqual(new Set(['test-ci']));
      expect(result.atomizedTargetsMap.get('test-ci')).toEqual([
        'test-ci--Test1',
        'test-ci--Test2',
        'test-ci--Test3',
      ]);
      expect(result.targetsToExclude).toEqual([
        'test-ci--Test1',
        'test-ci--Test2',
        'test-ci--Test3',
      ]);
    });
    it('should handle multiple root targets', () => {
      const targets = {
        'test-ci': {},
        'test-ci--Test1': { metadata: { nonAtomizedTarget: 'test-ci' } },
        'test-ci--Test2': { metadata: { nonAtomizedTarget: 'test-ci' } },
        'e2e-ci': {},
        'e2e-ci--Test1': { metadata: { nonAtomizedTarget: 'e2e-ci' } },
        'e2e-ci--Test2': { metadata: { nonAtomizedTarget: 'e2e-ci' } },
      };
      const result = detectAtomizedTargets(targets);
      expect(result.rootTargets).toEqual(new Set(['test-ci', 'e2e-ci']));
      expect(result.atomizedTargetsMap.get('test-ci')).toEqual([
        'test-ci--Test1',
        'test-ci--Test2',
      ]);
      expect(result.atomizedTargetsMap.get('e2e-ci')).toEqual([
        'e2e-ci--Test1',
        'e2e-ci--Test2',
      ]);
      expect(result.targetsToExclude).toEqual([
        'test-ci--Test1',
        'test-ci--Test2',
        'e2e-ci--Test1',
        'e2e-ci--Test2',
      ]);
    });
    it('should handle empty targets', () => {
      const result = detectAtomizedTargets({});
      expect(result.rootTargets).toEqual(new Set());
      expect(result.atomizedTargetsMap.size).toBe(0);
      expect(result.targetsToExclude).toEqual([]);
    });
    it('should handle targets without atomized metadata', () => {
      const targets = {
        build: {},
        test: {},
        deploy: { metadata: { description: 'Deploy the app' } },
      };
      const result = detectAtomizedTargets(targets);
      expect(result.rootTargets).toEqual(new Set());
      expect(result.atomizedTargetsMap.size).toBe(0);
      expect(result.targetsToExclude).toEqual([]);
    });
    it('should not exclude nx:run-script targets in target groups', () => {
      // This test verifies the fix for the issue where nx:run-script targets
      // like 'deploy' and 'custom-hello' were incorrectly filtered out
      const targets = {
        'e2e-ci': {},
        'e2e-ci--src/test1.cy.ts': {
          metadata: { nonAtomizedTarget: 'e2e-ci' },
        },
        'e2e-ci--src/test2.cy.ts': {
          metadata: { nonAtomizedTarget: 'e2e-ci' },
        },
        deploy: {
          metadata: { description: 'Deploy script from package.json' },
        },
        'custom-hello': {},
      };
      const result = detectAtomizedTargets(targets);
      expect(result.rootTargets).toEqual(new Set(['e2e-ci']));
      expect(result.targetsToExclude).toEqual([
        'e2e-ci--src/test1.cy.ts',
        'e2e-ci--src/test2.cy.ts',
      ]);
      // deploy and custom-hello should NOT be excluded
      expect(result.targetsToExclude).not.toContain('deploy');
      expect(result.targetsToExclude).not.toContain('custom-hello');
    });
  });
});
