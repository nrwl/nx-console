export type Maybe<T> = T | null;

// ====================================================
// Documents
// ====================================================

export namespace GenerateUsingNmp {
  export type Variables = {
    path: string;
    genCommand: string[];
    dryRun: boolean;
    npmClient: string;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    generateUsingNpm: Maybe<GenerateUsingNpm>;
  };

  export type GenerateUsingNpm = {
    __typename?: 'CommandStarted';

    id: string;
  };
}

export namespace Generate {
  export type Variables = {
    path: string;
    genCommand: string[];
    dryRun: boolean;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    generate: Maybe<Generate>;
  };

  export type Generate = {
    __typename?: 'CommandStarted';

    id: string;
  };
}

export namespace SchematicCollectionsByName {
  export type Variables = {
    path: string;
    collection: string;
    schematic: string;
  };

  export type Query = {
    __typename?: 'Query';

    workspace: Workspace;
  };

  export type Workspace = {
    __typename?: 'Workspace';

    schematicCollections: SchematicCollections[];
  };

  export type SchematicCollections = {
    __typename?: 'SchematicCollection';

    schematics: Schematics[];
  };

  export type Schematics = {
    __typename?: 'Schematic';

    collection: string;

    name: string;

    description: string;

    npmScript: Maybe<string>;

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

export namespace SchematicCollections {
  export type Variables = {
    path: string;
  };

  export type Query = {
    __typename?: 'Query';

    workspace: Workspace;
  };

  export type Workspace = {
    __typename?: 'Workspace';

    schematicCollections: SchematicCollections[];
  };

  export type SchematicCollections = {
    __typename?: 'SchematicCollection';

    name: string;

    schematics: Schematics[];
  };

  export type Schematics = {
    __typename?: 'Schematic';

    name: string;

    description: string;

    collection: string;
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
export class GenerateUsingNmpGQL extends Apollo.Mutation<
  GenerateUsingNmp.Mutation,
  GenerateUsingNmp.Variables
> {
  document: any = gql`
    mutation GenerateUsingNmp(
      $path: String!
      $genCommand: [String!]!
      $dryRun: Boolean!
      $npmClient: String!
    ) {
      generateUsingNpm(
        path: $path
        genCommand: $genCommand
        dryRun: $dryRun
        npmClient: $npmClient
      ) {
        id
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class GenerateGQL extends Apollo.Mutation<
  Generate.Mutation,
  Generate.Variables
> {
  document: any = gql`
    mutation Generate(
      $path: String!
      $genCommand: [String!]!
      $dryRun: Boolean!
    ) {
      generate(path: $path, genCommand: $genCommand, dryRun: $dryRun) {
        id
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class SchematicCollectionsByNameGQL extends Apollo.Query<
  SchematicCollectionsByName.Query,
  SchematicCollectionsByName.Variables
> {
  document: any = gql`
    query SchematicCollectionsByName(
      $path: String!
      $collection: String!
      $schematic: String!
    ) {
      workspace(path: $path) {
        schematicCollections(name: $collection) {
          schematics(name: $schematic) {
            collection
            name
            description
            npmScript
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
export class SchematicCollectionsGQL extends Apollo.Query<
  SchematicCollections.Query,
  SchematicCollections.Variables
> {
  document: any = gql`
    query SchematicCollections($path: String!) {
      workspace(path: $path) {
        schematicCollections {
          name
          schematics {
            name
            description
            collection
          }
        }
      }
    }
  `;
}

// ====================================================
// END: Apollo Angular template
// ====================================================
