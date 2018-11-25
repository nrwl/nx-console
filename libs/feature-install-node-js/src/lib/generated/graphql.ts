/* tslint:disable */

// ====================================================
// START: Typescript template
// ====================================================

// ====================================================
// Enums
// ====================================================

export enum FileType {
  file = 'file',
  directory = 'directory',
  angularDirectory = 'angularDirectory'
}

// ====================================================
// END: Typescript template
// ====================================================

// ====================================================
// Documents
// ====================================================

export namespace InstallNodeJsStatus {
  export type Variables = {};

  export type Query = {
    __typename?: 'Query';

    installNodeJsStatus?: InstallNodeJsStatus | null;
  };

  export type InstallNodeJsStatus = {
    __typename?: 'InstallNodeJsStatus';

    downloadPercentage?: number | null;

    downloadSpeed?: number | null;

    success?: boolean | null;

    cancelled?: boolean | null;

    error?: string | null;
  };
}

export namespace InstallNodeJs {
  export type Variables = {};

  export type Mutation = {
    __typename?: 'Mutation';

    installNodeJs?: InstallNodeJs | null;
  };

  export type InstallNodeJs = {
    __typename?: 'InstallNodeJsStatus';

    cancelled?: boolean | null;
  };
}

export namespace IsNodejsInstalled {
  export type Variables = {};

  export type Query = {
    __typename?: 'Query';

    isNodejsInstalled?: IsNodejsInstalled | null;
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
export class InstallNodeJsStatusGQL extends Apollo.Query<
  InstallNodeJsStatus.Query,
  InstallNodeJsStatus.Variables
> {
  document: any = gql`
    query InstallNodeJsStatus {
      installNodeJsStatus {
        downloadPercentage
        downloadSpeed
        success
        cancelled
        error
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class InstallNodeJsGQL extends Apollo.Mutation<
  InstallNodeJs.Mutation,
  InstallNodeJs.Variables
> {
  document: any = gql`
    mutation InstallNodeJs {
      installNodeJs {
        cancelled
      }
    }
  `;
}
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
