export type Maybe<T> = T | null;

// ====================================================
// Documents
// ====================================================

export namespace IsNodejsInstalled {
  export type Variables = {};

  export type Query = {
    __typename?: 'Query';

    isNodejsInstalled: Maybe<IsNodejsInstalled>;
  };

  export type IsNodejsInstalled = {
    __typename?: 'IsNodeInstalledResult';

    result: boolean;
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
export class IsNodejsInstalledGQL extends Apollo.Query<
  IsNodejsInstalled.Query,
  IsNodejsInstalled.Variables
> {
  document: any = gql`
    query IsNodejsInstalled {
      isNodejsInstalled {
        result
      }
    }
  `;
}

// ====================================================
// END: Apollo Angular template
// ====================================================
