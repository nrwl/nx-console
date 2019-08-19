export type Maybe<T> = T | null;

// ====================================================
// Documents
// ====================================================

export namespace NpmRun {
  export type Variables = {
    path: string;
    npmClient?: Maybe<string>;
    runCommand: string[];
  };

  export type Mutation = {
    __typename?: 'Mutation';

    runNpm: Maybe<RunNpm>;
  };

  export type RunNpm = {
    __typename?: 'CommandStarted';

    id: string;
  };
}

export namespace NpmScripts {
  export type Variables = {
    path: string;
    script: string;
  };

  export type Query = {
    __typename?: 'Query';

    workspace: Workspace;
  };

  export type Workspace = {
    __typename?: 'Workspace';

    npmScripts: NpmScripts[];
  };

  export type NpmScripts = {
    __typename?: 'NpmScript';

    name: string;

    npmClient: Maybe<string>;

    schema: Schema[];
  };

  export type Schema = {
    __typename?: 'Schema';

    name: string;

    enum: Maybe<string[]>;

    type: string;

    description: string;

    defaultValue: Maybe<string>;

    required: boolean;

    positional: boolean;
  };
}

export namespace Projects {
  export type Variables = {
    path: string;
    project: string;
    target: string;
  };

  export type Query = {
    __typename?: 'Query';

    workspace: Workspace;
  };

  export type Workspace = {
    __typename?: 'Workspace';

    projects: Projects[];
  };

  export type Projects = {
    __typename?: 'Project';

    name: string;

    root: string;

    projectType: string;

    architect: Architect[];
  };

  export type Architect = {
    __typename?: 'Architect';

    name: string;

    builder: string;

    options: Options;

    configurations: Configurations[];

    schema: Schema[];
  };

  export type Options = {
    __typename?: 'Options';

    defaultValues: DefaultValues[];
  };

  export type DefaultValues = {
    __typename?: 'FieldValue';

    name: string;

    defaultValue: Maybe<string>;
  };

  export type Configurations = {
    __typename?: 'ArchitectConfigurations';

    name: string;

    defaultValues: _DefaultValues[];
  };

  export type _DefaultValues = {
    __typename?: 'FieldValue';

    name: string;

    defaultValue: Maybe<string>;
  };

  export type Schema = {
    __typename?: 'Schema';

    name: string;

    enum: Maybe<string[]>;

    type: string;

    description: string;

    defaultValue: Maybe<string>;

    required: boolean;

    positional: boolean;
  };
}

export namespace RunNg {
  export type Variables = {
    path: string;
    runCommand: string[];
  };

  export type Mutation = {
    __typename?: 'Mutation';

    runNg: Maybe<RunNg>;
  };

  export type RunNg = {
    __typename?: 'CommandStarted';

    id: string;
  };
}

export namespace SchematicDocs {
  export type Variables = {
    path: string;
    collectionName: string;
    name: string;
  };

  export type Query = {
    __typename?: 'Query';

    workspace: Workspace;
  };

  export type Workspace = {
    __typename?: 'Workspace';

    docs: Docs;
  };

  export type Docs = {
    __typename?: 'Docs';

    schematicDocs: SchematicDocs[];
  };

  export type SchematicDocs = {
    __typename?: 'Doc';

    id: string;

    description: Maybe<string>;

    prop: Maybe<string>;
  };
}

export namespace WorkspaceAndProjects {
  export type Variables = {
    path: string;
  };

  export type Query = {
    __typename?: 'Query';

    workspace: Workspace;
  };

  export type Workspace = {
    __typename?: 'Workspace';

    npmScripts: NpmScripts[];

    projects: Projects[];
  };

  export type NpmScripts = {
    __typename?: 'NpmScript';

    name: string;
  };

  export type Projects = {
    __typename?: 'Project';

    name: string;

    root: string;

    projectType: string;

    architect: Architect[];
  };

  export type Architect = {
    __typename?: 'Architect';

    name: string;

    project: string;
  };
}

// ====================================================
// START: Apollo Angular template
// ====================================================

import { Injectable } from '@angular/core';
import * as Apollo from 'apollo-angular';

import gql from 'graphql-tag';

// ====================================================
// Apollo Services
// ====================================================

@Injectable({
  providedIn: 'root'
})
export class NpmRunGQL extends Apollo.Mutation<
  NpmRun.Mutation,
  NpmRun.Variables
> {
  document: any = gql`
    mutation NpmRun(
      $path: String!
      $npmClient: String
      $runCommand: [String!]!
    ) {
      runNpm(path: $path, npmClient: $npmClient, runCommand: $runCommand) {
        id
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class NpmScriptsGQL extends Apollo.Query<
  NpmScripts.Query,
  NpmScripts.Variables
> {
  document: any = gql`
    query NpmScripts($path: String!, $script: String!) {
      workspace(path: $path) {
        npmScripts(name: $script) {
          name
          npmClient
          schema {
            name
            enum
            type
            description
            defaultValue
            required
            positional
          }
        }
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class ProjectsGQL extends Apollo.Query<
  Projects.Query,
  Projects.Variables
> {
  document: any = gql`
    query Projects($path: String!, $project: String!, $target: String!) {
      workspace(path: $path) {
        projects(name: $project) {
          name
          root
          projectType
          architect(name: $target) {
            name
            builder
            options {
              defaultValues {
                name
                defaultValue
              }
            }
            configurations {
              name
              defaultValues {
                name
                defaultValue
              }
            }
            schema {
              name
              enum
              type
              description
              defaultValue
              required
              positional
            }
          }
        }
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class RunNgGQL extends Apollo.Mutation<RunNg.Mutation, RunNg.Variables> {
  document: any = gql`
    mutation RunNg($path: String!, $runCommand: [String!]!) {
      runNg(path: $path, runCommand: $runCommand) {
        id
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class SchematicDocsGQL extends Apollo.Query<
  SchematicDocs.Query,
  SchematicDocs.Variables
> {
  document: any = gql`
    query SchematicDocs(
      $path: String!
      $collectionName: String!
      $name: String!
    ) {
      workspace(path: $path) {
        docs {
          schematicDocs(collectionName: $collectionName, name: $name) {
            id
            description
            prop
          }
        }
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class WorkspaceAndProjectsGQL extends Apollo.Query<
  WorkspaceAndProjects.Query,
  WorkspaceAndProjects.Variables
> {
  document: any = gql`
    query WorkspaceAndProjects($path: String!) {
      workspace(path: $path) {
        npmScripts {
          name
        }
        projects {
          name
          root
          projectType
          architect {
            name
            project
          }
        }
      }
    }
  `;
}

// ====================================================
// END: Apollo Angular template
// ====================================================
