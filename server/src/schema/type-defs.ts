import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  schema {
    query: Database
    mutation: Mutation
  }

  type Architect {
    name: String!
    project: String!
    builder: String!
    configurations: [ArchitectConfigurations]
    schema: [ArchitectSchema]
  }

  type ArchitectConfigurations {
    name: String!
  }

  type ArchitectSchema {
    name: String!
    type: String!
    description: String
    defaultValue: String
    required: Boolean!
    positional: Boolean!
    enum: [String]
  }

  type CommandResult {
    command: String
    status: String!
    out: String!
  }

  type CommandStarted {
    command: String!
  }

  type CompletionResultType {
    value: String!
    display: String
  }

  type CompletionsTypes {
    files(input: String): [CompletionResultType]
    projects(input: String): [CompletionResultType]
    localModules(input: String): [CompletionResultType]
    absoluteModules(input: String): [CompletionResultType]
  }

  type Database {
    settings: Settings!
    schematicCollections: [SchematicCollectionForNgNew]
    workspace(path: String!): Workspace!
    editors: [EditorSupport]
    availableExtensions(name: String): [Extension]
    commandStatus: CommandResult
    directory(
      path: String
      onlyDirectories: Boolean
      showHidden: Boolean
    ): FilesType!
  }

  type Dependencies {
    name: String!
    version: String!
  }

  type EditorSupport {
    name: String!
    icon: String!
  }

  type Extension {
    name: String!
    description: String
    detailedDescription: String
  }

  type FileListType {
    name: String!
    type: FileType!
  }

  type FilesType {
    path: String!
    files: [FileListType]
  }

  enum FileType {
    file
    directory
    angularDirectory
  }

  type Mutation {
    ngAdd(path: String!, name: String!): CommandStarted
    ngNew(path: String!, name: String!, collection: String!): CommandStarted
    generate(
      path: String!
      genCommand: [String]
      dryRun: Boolean!
    ): CommandStarted
    runNg(path: String!, runCommand: [String]): CommandStarted
    runNpm(
      path: String!
      npmClient: String!
      runCommand: [String]
    ): CommandStarted
    stop: StopResult
    openInEditor(editor: String!, path: String!): OpenInEditor
    updateSettings(data: String!): Settings!
  }

  type NpmScript {
    name: String!
    npmClient: String!
    schema: [ArchitectSchema]
  }

  type OpenInEditor {
    response: String!
  }

  type Project {
    name: String!
    root: String!
    projectType: String!
    architect(name: String): [Architect]
  }

  type Schematic {
    collection: String!
    name: String!
    description: String
    schema: [SchematicSchema]
  }

  type SchematicCollection {
    name: String!
    schematics(name: String): [Schematic]
  }

  type SchematicCollectionForNgNew {
    name: String!
    description: String!
  }

  type SchematicSchema {
    name: String!
    type: String!
    description: String
    defaultValue: String
    required: Boolean!
    positional: Boolean!
    enum: [String]
  }

  type StopResult {
    result: Boolean
  }

  type WorkspaceDefinition {
    path: String!
    name: String!
    favorite: Boolean
  }

  type Settings {
    canCollectData: Boolean!
    recent: [WorkspaceDefinition]
  }

  type Workspace {
    name: String!
    path: String!
    dependencies: [Dependencies]
    extensions: [Extension]
    schematicCollections(name: String): [SchematicCollection]
    npmScripts(name: String): [NpmScript]
    projects(name: String): [Project]
    completions: CompletionsTypes
  }
`;
