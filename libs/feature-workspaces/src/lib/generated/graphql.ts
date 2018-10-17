/* tslint:disable */

export enum FileType {
  file = 'file',
  directory = 'directory',
  angularDirectory = 'angularDirectory'
}

export namespace BasicWorkspace {
  export type Variables = {
    path: string;
  };

  export type Query = {
    __typename?: 'Query';
    workspace: Workspace;
  };

  export type Workspace = {
    __typename?: 'Workspace';
    path: string;
    name: string;
  };
}

export namespace NgNew {
  export type Variables = {
    path: string;
    name: string;
    collection: string;
  };

  export type Mutation = {
    __typename?: 'Mutation';
    ngNew?: NgNew | null;
  };

  export type NgNew = {
    __typename?: 'CommandStarted';
    id: string;
  };
}

export namespace OpenWorkspace {
  export type Variables = {
    path: string;
  };

  export type Query = {
    __typename?: 'Query';
    workspace: Workspace;
  };

  export type Workspace = {
    __typename?: 'Workspace';
    name: string;
  };
}

export namespace SchematicCollections {
  export type Variables = {};

  export type Query = {
    __typename?: 'Query';
    schematicCollections?: (SchematicCollections | null)[] | null;
  };

  export type SchematicCollections = {
    __typename?: 'SchematicCollectionForNgNew';
    name: string;
    description: string;
  };
}

export namespace Workspace {
  export type Variables = {
    path: string;
  };

  export type Query = {
    __typename?: 'Query';
    workspace: Workspace;
  };

  export type Workspace = {
    __typename?: 'Workspace';
    name: string;
    path: string;
    dependencies?: (Dependencies | null)[] | null;
    projects?: (Projects | null)[] | null;
  };

  export type Dependencies = {
    __typename?: 'Dependencies';
    name: string;
    version: string;
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
  };
}

import { Injectable } from '@angular/core';

import * as Apollo from 'apollo-angular';

import gql from 'graphql-tag';

@Injectable({
  providedIn: 'root'
})
export class BasicWorkspaceGQL extends Apollo.Query<
  BasicWorkspace.Query,
  BasicWorkspace.Variables
> {
  document: any = gql`
    query BasicWorkspace($path: String!) {
      workspace(path: $path) {
        path
        name
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class NgNewGQL extends Apollo.Mutation<NgNew.Mutation, NgNew.Variables> {
  document: any = gql`
    mutation NgNew($path: String!, $name: String!, $collection: String!) {
      ngNew(path: $path, name: $name, collection: $collection) {
        id
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class OpenWorkspaceGQL extends Apollo.Query<
  OpenWorkspace.Query,
  OpenWorkspace.Variables
> {
  document: any = gql`
    query OpenWorkspace($path: String!) {
      workspace(path: $path) {
        name
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class SchematicCollectionsGQL extends Apollo.Query<
  SchematicCollections.Query,
  SchematicCollections.Variables
> {
  document: any = gql`
    query SchematicCollections {
      schematicCollections {
        name
        description
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class WorkspaceGQL extends Apollo.Query<
  Workspace.Query,
  Workspace.Variables
> {
  document: any = gql`
    query Workspace($path: String!) {
      workspace(path: $path) {
        name
        path
        dependencies {
          name
          version
        }
        projects {
          name
          root
          projectType
          architect {
            name
          }
        }
      }
    }
  `;
}
