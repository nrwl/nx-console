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

export namespace Commands {
  export type Variables = {
    id?: string | null;
  };

  export type Query = {
    __typename?: 'Query';

    commands?: (Commands | null)[] | null;
  };

  export type Commands = {
    __typename?: 'CommandResponse';

    command: string;

    status: string;

    outChunk: string;

    detailedStatus?: string | null;
  };
}

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
    id?: string | null;
  };

  export type Query = {
    __typename?: 'Query';

    commands?: (Commands | null)[] | null;
  };

  export type Commands = {
    __typename?: 'CommandResponse';

    id: string;

    type: string;

    workspace?: string | null;

    command: string;

    status: string;

    out: string;

    detailedStatus?: string | null;
  };
}

export namespace GetCommand {
  export type Variables = {
    id?: string | null;
  };

  export type Query = {
    __typename?: 'Query';

    commands?: (Commands | null)[] | null;
  };

  export type Commands = {
    __typename?: 'CommandResponse';

    id: string;

    type: string;

    workspace?: string | null;

    command: string;

    status: string;

    outChunk: string;

    detailedStatus?: string | null;
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

export namespace ListAllCommands {
  export type Variables = {};

  export type Query = {
    __typename?: 'Query';

    commands?: (Commands | null)[] | null;
  };

  export type Commands = {
    __typename?: 'CommandResponse';

    id: string;

    type: string;

    status: string;

    workspace?: string | null;

    command: string;
  };
}

export namespace ListFiles {
  export type Variables = {
    path: string;
    onlyDirectories?: boolean | null;
  };

  export type Query = {
    __typename?: 'Query';

    directory: Directory;
  };

  export type Directory = {
    __typename?: 'FilesType';

    path: string;

    exists: boolean;

    files?: (Files | null)[] | null;
  };

  export type Files = {
    __typename?: 'FileListType';

    name: string;

    type: FileType;
  };
}

export namespace OpenDoc {
  export type Variables = {
    id: string;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    openDoc?: OpenDoc | null;
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

    openInBrowser?: OpenInBrowser | null;
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

    openInEditor?: OpenInEditor | null;
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

    removeAllCommands?: RemoveAllCommands | null;
  };

  export type RemoveAllCommands = {
    __typename?: 'RemoveResult';

    result?: boolean | null;
  };
}

export namespace RemoveCommand {
  export type Variables = {
    id: string;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    removeCommand?: RemoveCommand | null;
  };

  export type RemoveCommand = {
    __typename?: 'RemoveResult';

    result?: boolean | null;
  };
}

export namespace RestartCommand {
  export type Variables = {
    id: string;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    restartCommand?: RestartCommand | null;
  };

  export type RestartCommand = {
    __typename?: 'RemoveResult';

    result?: boolean | null;
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

    canCollectData: boolean;

    installNodeManually?: boolean | null;

    enableDetailedStatus?: boolean | null;

    channel?: string | null;

    recent?: (Recent | null)[] | null;
  };

  export type Recent = {
    __typename?: 'WorkspaceDefinition';

    path: string;

    name: string;

    favorite?: boolean | null;
  };
}

export namespace ShowItemInFolder {
  export type Variables = {
    item: string;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    showItemInFolder?: ShowItemInFolder | null;
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

    stopCommand?: StopCommand | null;
  };

  export type StopCommand = {
    __typename?: 'StopResult';

    result?: boolean | null;
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

    installNodeManually?: boolean | null;

    enableDetailedStatus?: boolean | null;

    channel?: string | null;

    recent?: (Recent | null)[] | null;
  };

  export type Recent = {
    __typename?: 'WorkspaceDefinition';

    path: string;

    name: string;

    favorite?: boolean | null;
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
export class CommandsGQL extends Apollo.Query<
  Commands.Query,
  Commands.Variables
> {
  document: any = gql`
    query Commands($id: String) {
      commands(id: $id) {
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
    query GetCommandInitial($id: String) {
      commands(id: $id) {
        id
        type
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
    query GetCommand($id: String) {
      commands(id: $id) {
        id
        type
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
        type
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
export class ListFilesGQL extends Apollo.Query<
  ListFiles.Query,
  ListFiles.Variables
> {
  document: any = gql`
    query ListFiles($path: String!, $onlyDirectories: Boolean) {
      directory(path: $path, onlyDirectories: $onlyDirectories) {
        path
        exists
        files {
          name
          type
        }
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
        canCollectData
        installNodeManually
        enableDetailedStatus
        channel
        recent {
          path
          name
          favorite
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
        channel
        recent {
          path
          name
          favorite
        }
      }
    }
  `;
}

// ====================================================
// END: Apollo Angular template
// ====================================================
