/* tslint:disable */

export enum FileType {
  file = 'file',
  directory = 'directory',
  angularDirectory = 'angularDirectory'
}

export namespace NpmRun {
  export type Variables = {
    path: string;
    npmClient: string;
    runCommand: (string | null)[];
  };

  export type Mutation = {
    __typename?: 'Mutation';
    runNpm?: RunNpm | null;
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
    npmScripts?: (NpmScripts | null)[] | null;
  };

  export type NpmScripts = {
    __typename?: 'NpmScript';
    name: string;
    npmClient: string;
    schema?: (Schema | null)[] | null;
  };

  export type Schema = {
    __typename?: 'ArchitectSchema';
    name: string;
    enum?: (string | null)[] | null;
    type: string;
    description?: string | null;
    defaultValue?: string | null;
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
    projects?: (Projects | null)[] | null;
  };

  export type Projects = {
    __typename?: 'Project';
    name: string;
    root: string;
    projectType: string;
    architect?: (Architect | null)[] | null;
  };

  export type Architect = {
    __typename?: 'Architect';
    name: string;
    builder: string;
    configurations?: (Configurations | null)[] | null;
    schema?: (Schema | null)[] | null;
  };

  export type Configurations = {
    __typename?: 'ArchitectConfigurations';
    name: string;
  };

  export type Schema = {
    __typename?: 'ArchitectSchema';
    name: string;
    enum?: (string | null)[] | null;
    type: string;
    description?: string | null;
    defaultValue?: string | null;
    required: boolean;
    positional: boolean;
  };
}

export namespace RunNg {
  export type Variables = {
    path: string;
    runCommand: (string | null)[];
  };

  export type Mutation = {
    __typename?: 'Mutation';
    runNg?: RunNg | null;
  };

  export type RunNg = {
    __typename?: 'CommandStarted';
    id: string;
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
    npmScripts?: (NpmScripts | null)[] | null;
    projects?: (Projects | null)[] | null;
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
    architect?: (Architect | null)[] | null;
  };

  export type Architect = {
    __typename?: 'Architect';
    name: string;
    project: string;
  };
}

import { Injectable } from '@angular/core';

import * as Apollo from 'apollo-angular';

import gql from 'graphql-tag';

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
      $npmClient: String!
      $runCommand: [String]!
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
            configurations {
              name
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
    mutation RunNg($path: String!, $runCommand: [String]!) {
      runNg(path: $path, runCommand: $runCommand) {
        id
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
