import {
  configureJsonLanguageService,
  getLanguageModelCache,
} from '@nx-console/language-server-utils';
import { ClientCapabilities, TextDocument } from 'vscode-json-languageservice';
import { getDocumentLinks } from './get-document-links';

import { X_COMPLETION_TYPE } from '@nx-console/shared-json-schema';

import * as fs from '@nx-console/shared-file-system';
import { normalize } from 'path';
jest.mock(
  '@nx-console/shared-file-system',
  (): Partial<typeof fs> => ({
    fileExists: jest.fn(() => Promise.resolve(true)),
  }),
);

import * as nxWorkspaceInfo from '@nx-console/shared-nx-workspace-info';
jest.mock('@nx-console/shared-nx-workspace-info');

const languageService = configureJsonLanguageService(
  {
    clientCapabilities: ClientCapabilities.LATEST,
  },
  {},
);
const documentMapper = getLanguageModelCache();

const { document, jsonAst } = documentMapper.retrieve(
  TextDocument.create(
    'file:///project.json',
    'json',
    0,
    `
{
  "fileCompletion": "project/src/main.ts",
  "dirCompletion": "project/src"
}
    `,
  ),
);

it('should get all document links for properties that have a X_COMPLETION_TYPE (file type only)', async () => {
  const matchingSchemas = await languageService.getMatchingSchemas(
    document,
    jsonAst,
    {
      type: 'object',
      properties: {
        fileCompletion: {
          type: 'string',
          [X_COMPLETION_TYPE]: 'file',
        } as any,
        dirCompletion: {
          type: 'string',
          [X_COMPLETION_TYPE]: 'directory',
        } as any,
      },
    },
  );
  const documentLinks = await getDocumentLinks(
    '/workspace',
    jsonAst,
    document,
    matchingSchemas,
  );

  expect(documentLinks.map((link) => normalize(link.target ?? ''))).toEqual([
    normalize('/workspace/project/src/main.ts'),
  ]);

  documentMapper.dispose();
});

describe('project links', () => {
  const mockProjectGraph = {
    nodes: {
      'my-app': {
        data: {
          root: 'apps/my-app',
        },
      },
      'my-lib': {
        data: {
          root: 'libs/my-lib',
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (nxWorkspaceInfo.nxWorkspace as jest.Mock).mockResolvedValue({
      projectGraph: mockProjectGraph,
    });
  });

  it('should create links for valid projects in implicitDependencies', async () => {
    const documentMapper = getLanguageModelCache();
    const { document, jsonAst } = documentMapper.retrieve(
      TextDocument.create(
        'file:///project1.json',
        'json',
        0,
        `
{
  "implicitDependencies": ["my-app", "my-lib"]
}
        `,
      ),
    );

    const matchingSchemas = await languageService.getMatchingSchemas(
      document,
      jsonAst,
      {
        type: 'object',
        properties: {
          implicitDependencies: {
            type: 'array',
            items: {
              type: 'string',
              [X_COMPLETION_TYPE]: 'projects',
            } as any,
          },
        },
      },
    );

    const documentLinks = await getDocumentLinks(
      '/workspace',
      jsonAst,
      document,
      matchingSchemas,
    );

    expect(documentLinks).toHaveLength(2);
    expect(documentLinks[0].target).toContain('apps/my-app/project.json');
    expect(documentLinks[1].target).toContain('libs/my-lib/project.json');

    documentMapper.dispose();
  });

  it('should handle projects with ! prefix', async () => {
    const documentMapper = getLanguageModelCache();
    const { document, jsonAst } = documentMapper.retrieve(
      TextDocument.create(
        'file:///project2.json',
        'json',
        0,
        `
{
  "implicitDependencies": ["!my-app"]
}
        `,
      ),
    );

    const matchingSchemas = await languageService.getMatchingSchemas(
      document,
      jsonAst,
      {
        type: 'object',
        properties: {
          implicitDependencies: {
            type: 'array',
            items: {
              type: 'string',
              [X_COMPLETION_TYPE]: 'projects',
            } as any,
          },
        },
      },
    );

    const documentLinks = await getDocumentLinks(
      '/workspace',
      jsonAst,
      document,
      matchingSchemas,
    );

    expect(documentLinks).toHaveLength(1);
    expect(documentLinks[0].target).toContain('apps/my-app/project.json');

    documentMapper.dispose();
  });

  it('should not create links for invalid projects', async () => {
    const documentMapper = getLanguageModelCache();
    const { document, jsonAst } = documentMapper.retrieve(
      TextDocument.create(
        'file:///project3.json',
        'json',
        0,
        `
{
  "implicitDependencies": ["non-existent-project"]
}
        `,
      ),
    );

    const matchingSchemas = await languageService.getMatchingSchemas(
      document,
      jsonAst,
      {
        type: 'object',
        properties: {
          implicitDependencies: {
            type: 'array',
            items: {
              type: 'string',
              [X_COMPLETION_TYPE]: 'projects',
            } as any,
          },
        },
      },
    );

    const documentLinks = await getDocumentLinks(
      '/workspace',
      jsonAst,
      document,
      matchingSchemas,
    );

    expect(documentLinks).toHaveLength(0);

    documentMapper.dispose();
  });

  it('should link to package.json when project.json does not exist', async () => {
    (fs.fileExists as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('project.json')) {
        return Promise.resolve(false);
      }
      if (path.includes('package.json')) {
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    });

    const documentMapper = getLanguageModelCache();
    const { document, jsonAst } = documentMapper.retrieve(
      TextDocument.create(
        'file:///project4.json',
        'json',
        0,
        `
{
  "implicitDependencies": ["my-app"]
}
        `,
      ),
    );

    const matchingSchemas = await languageService.getMatchingSchemas(
      document,
      jsonAst,
      {
        type: 'object',
        properties: {
          implicitDependencies: {
            type: 'array',
            items: {
              type: 'string',
              [X_COMPLETION_TYPE]: 'projects',
            } as any,
          },
        },
      },
    );

    const documentLinks = await getDocumentLinks(
      '/workspace',
      jsonAst,
      document,
      matchingSchemas,
    );

    expect(documentLinks).toHaveLength(1);
    expect(documentLinks[0].target).toContain('apps/my-app/package.json');

    documentMapper.dispose();
  });
});
