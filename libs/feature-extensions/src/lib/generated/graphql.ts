export type Maybe<T> = T | null;

// ====================================================
// Documents
// ====================================================

export namespace NgAdd {
  export type Variables = {
    path: string;
    name: string;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    ngAdd: Maybe<NgAdd>;
  };

  export type NgAdd = {
    __typename?: 'CommandStarted';

    id: string;
  };
}

export namespace WorkspaceAndExtensionsByName {
  export type Variables = {
    path: string;
    name: string;
  };

  export type Query = {
    __typename?: 'Query';

    workspace: Workspace;

    availableExtensions: AvailableExtensions[];
  };

  export type Workspace = {
    __typename?: 'Workspace';

    extensions: Extensions[];
  };

  export type Extensions = {
    __typename?: 'Extension';

    name: string;
  };

  export type AvailableExtensions = {
    __typename?: 'Extension';

    name: string;

    description: string;

    detailedDescription: Maybe<string>;
  };
}

export namespace WorkspaceAndExtensions {
  export type Variables = {
    path: string;
  };

  export type Query = {
    __typename?: 'Query';

    workspace: Workspace;

    availableExtensions: AvailableExtensions[];
  };

  export type Workspace = {
    __typename?: 'Workspace';

    extensions: Extensions[];
  };

  export type Extensions = {
    __typename?: 'Extension';

    name: string;
  };

  export type AvailableExtensions = {
    __typename?: 'Extension';

    name: string;

    description: string;
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
export class NgAddGQL extends Apollo.Mutation<NgAdd.Mutation, NgAdd.Variables> {
  document: any = gql`
    mutation NgAdd($path: String!, $name: String!) {
      ngAdd(path: $path, name: $name) {
        id
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class WorkspaceAndExtensionsByNameGQL extends Apollo.Query<
  WorkspaceAndExtensionsByName.Query,
  WorkspaceAndExtensionsByName.Variables
> {
  document: any = gql`
    query WorkspaceAndExtensionsByName($path: String!, $name: String!) {
      workspace(path: $path) {
        extensions {
          name
        }
      }
      availableExtensions(name: $name) {
        name
        description
        detailedDescription
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class WorkspaceAndExtensionsGQL extends Apollo.Query<
  WorkspaceAndExtensions.Query,
  WorkspaceAndExtensions.Variables
> {
  document: any = gql`
    query WorkspaceAndExtensions($path: String!) {
      workspace(path: $path) {
        extensions {
          name
        }
      }
      availableExtensions {
        name
        description
      }
    }
  `;
}

// ====================================================
// END: Apollo Angular template
// ====================================================
