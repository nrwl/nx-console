import { CollectionInfo } from '@nx-console/schema';

export function getProjectJsonSchema(collections: CollectionInfo[]) {
  const [builders, executors] = createBuildersAndExecutorsSchema(collections);
  const contents = createJsonSchema(builders, executors);
  return contents;
}

function createBuildersAndExecutorsSchema(
  collections: CollectionInfo[]
): [string, string] {
  const builders = collections
    .map(
      (collection) => `
{
  "if": {
    "properties": { "builder": { "const": "${collection.name}" } },
    "required": ["builder"]
  },
  "then": {
    "properties": {
      "options": {
        "$ref": "${collection.path}"
      },
      "configurations": {
        "additionalProperties": {
          "$ref": "${collection.path}",
          "required": []
        }
      }
    }
  }
}
`
    )
    .join(',');

  const executors = collections
    .map(
      (collection) => `
{
  "if": {
    "properties": { "executor": { "const": "${collection.name}" } },
    "required": ["executor"]
  },
  "then": {
    "properties": {
      "options": {
        "$ref": "${collection.path}"
      },
      "configurations": {
        "additionalProperties": {
          "$ref": "${collection.path}",
          "required": []
        }
      }
    }
  }
}
`
    )
    .join(',');

  return [builders, executors];
}

function createJsonSchema(builders: string, executors: string) {
  return `
  {
    "title": "JSON schema for Nx projects",
    "id": "https://nx.dev/project-schema",
    "type": "object",
    "properties": {
      "targets": {
        "description": "Configures all the targets which define what tasks you can run against the project",
        "additionalProperties": {
          "type": "object",
          "properties": {
            "executor": {
              "description": "The function that Nx will invoke when you run this target",
              "type": "string"
            },
            "options": {
              "type": "object"
            },
            "configurations": {
              "description": "provides extra sets of values that will be merged into the options map",
              "additionalProperties": {
                "type": "object"
              }
            }
          },
          "allOf": [
            ${executors}
          ]
        }
      }
    }
  }`;
}
