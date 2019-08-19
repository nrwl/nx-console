export type Maybe<T> = T | null;

// ====================================================
// Documents
// ====================================================

export namespace Editors {
  export type Variables = {};

  export type Query = {
    __typename?: 'Query';

    editors: Editors[];
  };

  export type Editors = {
    __typename?: 'EditorSupport';

    name: string;

    icon: string;
  };
}

export namespace GetCommandInitial {
  export type Variables = {
    id: string;
    cols: number;
  };

  export type Query = {
    __typename?: 'Query';

    commands: Commands[];
  };

  export type Commands = {
    __typename?: 'CommandResponse';

    id: string;

    workspace: Maybe<string>;

    command: string;

    status: string;

    out: string;

    detailedStatus: Maybe<string>;
  };
}

export namespace GetCommand {
  export type Variables = {
    id: string;
    cols: number;
  };

  export type Query = {
    __typename?: 'Query';

    commands: Commands[];
  };

  export type Commands = {
    __typename?: 'CommandResponse';

    id: string;

    workspace: Maybe<string>;

    command: string;

    status: string;

    outChunk: string;

    detailedStatus: Maybe<string>;
  };
}

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

export namespace ListAllCommands {
  export type Variables = {};

  export type Query = {
    __typename?: 'Query';

    commands: Commands[];
  };

  export type Commands = {
    __typename?: 'CommandResponse';

    id: string;

    status: string;

    workspace: Maybe<string>;

    command: string;
  };
}

export namespace OpenDoc {
  export type Variables = {
    id: string;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    openDoc: Maybe<OpenDoc>;
  };

  export type OpenDoc = {
    __typename?: 'OpenDocResult';

    result: boolean;
  };
}

export namespace OpenInBrowser {
  export type Variables = {
    url: string;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    openInBrowser: Maybe<OpenInBrowser>;
  };

  export type OpenInBrowser = {
    __typename?: 'OpenInBrowserResult';

    result: boolean;
  };
}

export namespace OpenInEditor {
  export type Variables = {
    editor: string;
    path: string;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    openInEditor: Maybe<OpenInEditor>;
  };

  export type OpenInEditor = {
    __typename?: 'OpenInEditor';

    response: string;
  };
}

export namespace RemoveAllCommands {
  export type Variables = {};

  export type Mutation = {
    __typename?: 'Mutation';

    removeAllCommands: Maybe<RemoveAllCommands>;
  };

  export type RemoveAllCommands = {
    __typename?: 'RemoveResult';

    result: Maybe<boolean>;
  };
}

export namespace RemoveCommand {
  export type Variables = {
    id: string;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    removeCommand: Maybe<RemoveCommand>;
  };

  export type RemoveCommand = {
    __typename?: 'RemoveResult';

    result: Maybe<boolean>;
  };
}

export namespace RestartCommand {
  export type Variables = {
    id: string;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    restartCommand: Maybe<RestartCommand>;
  };

  export type RestartCommand = {
    __typename?: 'RemoveResult';

    result: Maybe<boolean>;
  };
}

export namespace Settings {
  export type Variables = {};

  export type Query = {
    __typename?: 'Query';

    settings: Settings;
  };

  export type Settings = {
    __typename?: 'Settings';

    isWsl: Maybe<boolean>;

    isWindows: Maybe<boolean>;

    useNvm: Maybe<boolean>;

    canCollectData: boolean;

    installNodeManually: Maybe<boolean>;

    enableDetailedStatus: Maybe<boolean>;

    channel: Maybe<string>;

    disableAnimations: Maybe<boolean>;

    isConnectUser: Maybe<boolean>;

    recent: Recent[];
  };

  export type Recent = {
    __typename?: 'WorkspaceDefinition';

    path: string;

    name: string;

    favorite: Maybe<boolean>;

    pinnedProjectNames: string[];
  };
}

export namespace ShowItemInFolder {
  export type Variables = {
    item: string;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    showItemInFolder: Maybe<ShowItemInFolder>;
  };

  export type ShowItemInFolder = {
    __typename?: 'ShowItemInFolderResult';

    result: boolean;
  };
}

export namespace StopCommand {
  export type Variables = {
    id: string;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    stopCommand: Maybe<StopCommand>;
  };

  export type StopCommand = {
    __typename?: 'StopResult';

    result: Maybe<boolean>;
  };
}

export namespace UpdateSettings {
  export type Variables = {
    data: string;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    updateSettings: UpdateSettings;
  };

  export type UpdateSettings = {
    __typename?: 'Settings';

    canCollectData: boolean;

    installNodeManually: Maybe<boolean>;

    enableDetailedStatus: Maybe<boolean>;

    isWsl: Maybe<boolean>;

    useNvm: Maybe<boolean>;

    channel: Maybe<string>;

    recent: Recent[];
  };

  export type Recent = {
    __typename?: 'WorkspaceDefinition';

    path: string;

    name: string;

    favorite: Maybe<boolean>;

    pinnedProjectNames: string[];
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
export class EditorsGQL extends Apollo.Query<Editors.Query, Editors.Variables> {
  document: any = gql`
    query Editors {
      editors {
        name
        icon
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class GetCommandInitialGQL extends Apollo.Query<
  GetCommandInitial.Query,
  GetCommandInitial.Variables
> {
  document: any = gql`
    query GetCommandInitial($id: String!, $cols: Int!) {
      commands(id: $id, cols: $cols) {
        id
        workspace
        command
        status
        out
        detailedStatus
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class GetCommandGQL extends Apollo.Query<
  GetCommand.Query,
  GetCommand.Variables
> {
  document: any = gql`
    query GetCommand($id: String!, $cols: Int!) {
      commands(id: $id, cols: $cols) {
        id
        workspace
        command
        status
        outChunk
        detailedStatus
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
@Injectable({
  providedIn: 'root'
})
export class ListAllCommandsGQL extends Apollo.Query<
  ListAllCommands.Query,
  ListAllCommands.Variables
> {
  document: any = gql`
    query ListAllCommands {
      commands {
        id
        status
        workspace
        command
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class OpenDocGQL extends Apollo.Mutation<
  OpenDoc.Mutation,
  OpenDoc.Variables
> {
  document: any = gql`
    mutation OpenDoc($id: String!) {
      openDoc(id: $id) {
        result
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class OpenInBrowserGQL extends Apollo.Mutation<
  OpenInBrowser.Mutation,
  OpenInBrowser.Variables
> {
  document: any = gql`
    mutation OpenInBrowser($url: String!) {
      openInBrowser(url: $url) {
        result
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class OpenInEditorGQL extends Apollo.Mutation<
  OpenInEditor.Mutation,
  OpenInEditor.Variables
> {
  document: any = gql`
    mutation OpenInEditor($editor: String!, $path: String!) {
      openInEditor(editor: $editor, path: $path) {
        response
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class RemoveAllCommandsGQL extends Apollo.Mutation<
  RemoveAllCommands.Mutation,
  RemoveAllCommands.Variables
> {
  document: any = gql`
    mutation RemoveAllCommands {
      removeAllCommands {
        result
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class RemoveCommandGQL extends Apollo.Mutation<
  RemoveCommand.Mutation,
  RemoveCommand.Variables
> {
  document: any = gql`
    mutation RemoveCommand($id: String!) {
      removeCommand(id: $id) {
        result
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class RestartCommandGQL extends Apollo.Mutation<
  RestartCommand.Mutation,
  RestartCommand.Variables
> {
  document: any = gql`
    mutation RestartCommand($id: String!) {
      restartCommand(id: $id) {
        result
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class SettingsGQL extends Apollo.Query<
  Settings.Query,
  Settings.Variables
> {
  document: any = gql`
    query Settings {
      settings {
        isWsl
        isWindows
        useNvm
        canCollectData
        installNodeManually
        enableDetailedStatus
        channel
        disableAnimations
        isConnectUser
        recent {
          path
          name
          favorite
          pinnedProjectNames
        }
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class ShowItemInFolderGQL extends Apollo.Mutation<
  ShowItemInFolder.Mutation,
  ShowItemInFolder.Variables
> {
  document: any = gql`
    mutation ShowItemInFolder($item: String!) {
      showItemInFolder(item: $item) {
        result
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class StopCommandGQL extends Apollo.Mutation<
  StopCommand.Mutation,
  StopCommand.Variables
> {
  document: any = gql`
    mutation StopCommand($id: String!) {
      stopCommand(id: $id) {
        result
      }
    }
  `;
}
@Injectable({
  providedIn: 'root'
})
export class UpdateSettingsGQL extends Apollo.Mutation<
  UpdateSettings.Mutation,
  UpdateSettings.Variables
> {
  document: any = gql`
    mutation UpdateSettings($data: String!) {
      updateSettings(data: $data) {
        canCollectData
        installNodeManually
        enableDetailedStatus
        isWsl
        useNvm
        channel
        recent {
          path
          name
          favorite
          pinnedProjectNames
        }
      }
    }
  `;
}

// ====================================================
// END: Apollo Angular template
// ====================================================
