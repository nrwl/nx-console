export enum FileType {
  File = 'file',
  Directory = 'directory',
  AngularDirectory = 'angularDirectory'
}

// ====================================================
// Types
// ====================================================

export interface Database {
  settings: Settings;

  schematicCollections?: (SchematicCollectionForNgNew | null)[] | null;

  workspace: Workspace;

  editors: EditorSupport[];

  availableExtensions?: (Extension | null)[] | null;

  installNodeJsStatus?: InstallNodeJsStatus | null;

  isNodejsInstalled?: IsNodeInstalledResult | null;

  directory: FilesType;

  commands?: (CommandResponse | null)[] | null;
}

export interface Settings {
  canCollectData: boolean;

  showSupportPlugin?: boolean | null;

  installNodeManually?: boolean | null;

  enableDetailedStatus?: boolean | null;

  channel?: string | null;

  recent?: (WorkspaceDefinition | null)[] | null;
}

export interface WorkspaceDefinition {
  path: string;

  name: string;

  favorite?: boolean | null;
}

export interface SchematicCollectionForNgNew {
  name: string;

  description: string;
}

export interface Workspace {
  name: string;

  path: string;

  dependencies?: (Dependencies | null)[] | null;

  extensions?: (Extension | null)[] | null;

  schematicCollections?: (SchematicCollection | null)[] | null;

  npmScripts?: (NpmScript | null)[] | null;

  projects?: (Project | null)[] | null;

  docs: Docs;

  completions?: CompletionsTypes | null;
}

export interface Dependencies {
  name: string;

  version: string;
}

export interface Extension {
  name: string;

  description?: string | null;

  detailedDescription?: string | null;
}

export interface SchematicCollection {
  name: string;

  schematics?: (Schematic | null)[] | null;
}

export interface Schematic {
  collection: string;

  name: string;

  description?: string | null;

  schema?: (SchematicSchema | null)[] | null;
}

export interface SchematicSchema {
  name: string;

  type: string;

  description?: string | null;

  defaultValue?: string | null;

  required: boolean;

  positional: boolean;

  enum?: (string | null)[] | null;
}

export interface NpmScript {
  name: string;

  npmClient: string;

  schema?: (ArchitectSchema | null)[] | null;
}

export interface ArchitectSchema {
  name: string;

  type: string;

  description?: string | null;

  defaultValue?: string | null;

  required: boolean;

  positional: boolean;

  enum?: (string | null)[] | null;
}

export interface Project {
  name: string;

  root: string;

  projectType: string;

  architect?: (Architect | null)[] | null;
}

export interface Architect {
  name: string;

  project: string;

  builder: string;

  configurations?: (ArchitectConfigurations | null)[] | null;

  schema?: (ArchitectSchema | null)[] | null;
}

export interface ArchitectConfigurations {
  name: string;
}

export interface Docs {
  workspaceDocs: Doc[];

  schematicDocs: Doc[];
}

export interface Doc {
  prop?: string | null;

  description?: string | null;

  id: string;
}

export interface CompletionsTypes {
  files?: (CompletionResultType | null)[] | null;

  projects?: (CompletionResultType | null)[] | null;

  localModules?: (CompletionResultType | null)[] | null;

  absoluteModules?: (CompletionResultType | null)[] | null;
}

export interface CompletionResultType {
  value: string;

  display?: string | null;
}

export interface EditorSupport {
  name: string;

  icon: string;
}

export interface InstallNodeJsStatus {
  downloadPercentage?: number | null;

  downloadSpeed?: number | null;

  success?: boolean | null;

  cancelled?: boolean | null;

  error?: string | null;
}

export interface IsNodeInstalledResult {
  result: boolean;
}

export interface FilesType {
  path: string;

  exists: boolean;

  files?: (FileListType | null)[] | null;
}

export interface FileListType {
  name: string;

  type: FileType;
}

export interface CommandResponse {
  type: string;

  id: string;

  workspace?: string | null;

  command: string;

  status: string;

  detailedStatus?: string | null;

  outChunk: string;

  out: string;
}

export interface Mutation {
  ngAdd?: CommandStarted | null;

  ngNew?: CommandStarted | null;

  generate?: CommandStarted | null;

  runNg?: CommandStarted | null;

  runNpm?: CommandStarted | null;

  stopCommand?: StopResult | null;

  removeCommand?: RemoveResult | null;

  removeAllCommands?: RemoveResult | null;

  restartCommand?: RemoveResult | null;

  openInEditor?: OpenInEditor | null;

  updateSettings: Settings;

  installNodeJs?: InstallNodeJsStatus | null;

  openInBrowser?: OpenInBrowserResult | null;

  selectDirectory?: SelectDirectoryResult | null;

  showItemInFolder?: ShowItemInFolderResult | null;

  openDoc?: OpenDocResult | null;
}

export interface CommandStarted {
  id: string;
}

export interface StopResult {
  result?: boolean | null;
}

export interface RemoveResult {
  result?: boolean | null;
}

export interface OpenInEditor {
  response: string;
}

export interface OpenInBrowserResult {
  result: boolean;
}

export interface SelectDirectoryResult {
  selectedDirectoryPath?: string | null;

  error?: string | null;
}

export interface ShowItemInFolderResult {
  result: boolean;
}

export interface OpenDocResult {
  result: boolean;
}

// ====================================================
// Arguments
// ====================================================

export interface WorkspaceDatabaseArgs {
  path: string;
}
export interface AvailableExtensionsDatabaseArgs {
  name?: string | null;
}
export interface DirectoryDatabaseArgs {
  path?: string | null;

  onlyDirectories?: boolean | null;

  showHidden?: boolean | null;
}
export interface CommandsDatabaseArgs {
  id?: string | null;
}
export interface SchematicCollectionsWorkspaceArgs {
  name?: string | null;
}
export interface NpmScriptsWorkspaceArgs {
  name?: string | null;
}
export interface ProjectsWorkspaceArgs {
  name?: string | null;
}
export interface SchematicsSchematicCollectionArgs {
  name?: string | null;
}
export interface ArchitectProjectArgs {
  name?: string | null;
}
export interface SchematicDocsDocsArgs {
  collectionName: string;

  collectionVersion?: string | null;

  name: string;
}
export interface FilesCompletionsTypesArgs {
  input?: string | null;
}
export interface ProjectsCompletionsTypesArgs {
  input?: string | null;
}
export interface LocalModulesCompletionsTypesArgs {
  input?: string | null;
}
export interface AbsoluteModulesCompletionsTypesArgs {
  input?: string | null;
}
export interface NgAddMutationArgs {
  path: string;

  name: string;
}
export interface NgNewMutationArgs {
  path: string;

  name: string;

  collection: string;
}
export interface GenerateMutationArgs {
  path: string;

  genCommand?: (string | null)[] | null;

  dryRun: boolean;
}
export interface RunNgMutationArgs {
  path: string;

  runCommand?: (string | null)[] | null;
}
export interface RunNpmMutationArgs {
  path: string;

  npmClient: string;

  runCommand?: (string | null)[] | null;
}
export interface StopCommandMutationArgs {
  id: string;
}
export interface RemoveCommandMutationArgs {
  id: string;
}
export interface RestartCommandMutationArgs {
  id: string;
}
export interface OpenInEditorMutationArgs {
  editor: string;

  path: string;
}
export interface UpdateSettingsMutationArgs {
  data: string;
}
export interface OpenInBrowserMutationArgs {
  url: string;
}
export interface SelectDirectoryMutationArgs {
  dialogTitle: string;

  dialogButtonLabel: string;

  angularWorkspace: boolean;
}
export interface ShowItemInFolderMutationArgs {
  item: string;
}
export interface OpenDocMutationArgs {
  id: string;
}

import { GraphQLResolveInfo, GraphQLScalarTypeConfig } from 'graphql';

export type Resolver<Result, Parent = {}, Context = {}, Args = {}> = (
  parent: Parent,
  args: Args,
  context: Context,
  info: GraphQLResolveInfo
) => Promise<Result> | Result;

export interface ISubscriptionResolverObject<Result, Parent, Context, Args> {
  subscribe<R = Result, P = Parent>(
    parent: P,
    args: Args,
    context: Context,
    info: GraphQLResolveInfo
  ): AsyncIterator<R | Result> | Promise<AsyncIterator<R | Result>>;
  resolve?<R = Result, P = Parent>(
    parent: P,
    args: Args,
    context: Context,
    info: GraphQLResolveInfo
  ): R | Result | Promise<R | Result>;
}

export type SubscriptionResolver<
  Result,
  Parent = {},
  Context = {},
  Args = {}
> =
  | ((
      ...args: any[]
    ) => ISubscriptionResolverObject<Result, Parent, Context, Args>)
  | ISubscriptionResolverObject<Result, Parent, Context, Args>;

type Maybe<T> = T | null | undefined;

export type TypeResolveFn<Types, Parent = {}, Context = {}> = (
  parent: Parent,
  context: Context,
  info: GraphQLResolveInfo
) => Maybe<Types>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult, TArgs = {}, TContext = {}> = (
  next: NextResolverFn<TResult>,
  source: any,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export namespace DatabaseResolvers {
  export interface Resolvers<Context = any, TypeParent = {}> {
    settings?: SettingsResolver<any, TypeParent, Context>;

    schematicCollections?: SchematicCollectionsResolver<
      (any | null)[] | null,
      TypeParent,
      Context
    >;

    workspace?: WorkspaceResolver<any, TypeParent, Context>;

    editors?: EditorsResolver<any[], TypeParent, Context>;

    availableExtensions?: AvailableExtensionsResolver<
      (any | null)[] | null,
      TypeParent,
      Context
    >;

    installNodeJsStatus?: InstallNodeJsStatusResolver<
      any | null,
      TypeParent,
      Context
    >;

    isNodejsInstalled?: IsNodejsInstalledResolver<
      any | null,
      TypeParent,
      Context
    >;

    directory?: DirectoryResolver<any, TypeParent, Context>;

    commands?: CommandsResolver<(any | null)[] | null, TypeParent, Context>;
  }

  export type SettingsResolver<R = any, Parent = {}, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type SchematicCollectionsResolver<
    R = (any | null)[] | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context>;
  export type WorkspaceResolver<R = any, Parent = {}, Context = any> = Resolver<
    R,
    Parent,
    Context,
    WorkspaceArgs
  >;
  export interface WorkspaceArgs {
    path: string;
  }

  export type EditorsResolver<R = any[], Parent = {}, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type AvailableExtensionsResolver<
    R = (any | null)[] | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, AvailableExtensionsArgs>;
  export interface AvailableExtensionsArgs {
    name?: string | null;
  }

  export type InstallNodeJsStatusResolver<
    R = any | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context>;
  export type IsNodejsInstalledResolver<
    R = any | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context>;
  export type DirectoryResolver<R = any, Parent = {}, Context = any> = Resolver<
    R,
    Parent,
    Context,
    DirectoryArgs
  >;
  export interface DirectoryArgs {
    path?: string | null;

    onlyDirectories?: boolean | null;

    showHidden?: boolean | null;
  }

  export type CommandsResolver<
    R = (any | null)[] | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, CommandsArgs>;
  export interface CommandsArgs {
    id?: string | null;
  }
}

export namespace SettingsResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    canCollectData?: CanCollectDataResolver<boolean, TypeParent, Context>;

    showSupportPlugin?: ShowSupportPluginResolver<
      boolean | null,
      TypeParent,
      Context
    >;

    installNodeManually?: InstallNodeManuallyResolver<
      boolean | null,
      TypeParent,
      Context
    >;

    enableDetailedStatus?: EnableDetailedStatusResolver<
      boolean | null,
      TypeParent,
      Context
    >;

    channel?: ChannelResolver<string | null, TypeParent, Context>;

    recent?: RecentResolver<(any | null)[] | null, TypeParent, Context>;
  }

  export type CanCollectDataResolver<
    R = boolean,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type ShowSupportPluginResolver<
    R = boolean | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type InstallNodeManuallyResolver<
    R = boolean | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type EnableDetailedStatusResolver<
    R = boolean | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type ChannelResolver<
    R = string | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type RecentResolver<
    R = (any | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace WorkspaceDefinitionResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    path?: PathResolver<string, TypeParent, Context>;

    name?: NameResolver<string, TypeParent, Context>;

    favorite?: FavoriteResolver<boolean | null, TypeParent, Context>;
  }

  export type PathResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type NameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type FavoriteResolver<
    R = boolean | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace SchematicCollectionForNgNewResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;

    description?: DescriptionResolver<string, TypeParent, Context>;
  }

  export type NameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type DescriptionResolver<
    R = string,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace WorkspaceResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;

    path?: PathResolver<string, TypeParent, Context>;

    dependencies?: DependenciesResolver<
      (any | null)[] | null,
      TypeParent,
      Context
    >;

    extensions?: ExtensionsResolver<(any | null)[] | null, TypeParent, Context>;

    schematicCollections?: SchematicCollectionsResolver<
      (any | null)[] | null,
      TypeParent,
      Context
    >;

    npmScripts?: NpmScriptsResolver<(any | null)[] | null, TypeParent, Context>;

    projects?: ProjectsResolver<(any | null)[] | null, TypeParent, Context>;

    docs?: DocsResolver<any, TypeParent, Context>;

    completions?: CompletionsResolver<any | null, TypeParent, Context>;
  }

  export type NameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type PathResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type DependenciesResolver<
    R = (any | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type ExtensionsResolver<
    R = (any | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type SchematicCollectionsResolver<
    R = (any | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, SchematicCollectionsArgs>;
  export interface SchematicCollectionsArgs {
    name?: string | null;
  }

  export type NpmScriptsResolver<
    R = (any | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, NpmScriptsArgs>;
  export interface NpmScriptsArgs {
    name?: string | null;
  }

  export type ProjectsResolver<
    R = (any | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, ProjectsArgs>;
  export interface ProjectsArgs {
    name?: string | null;
  }

  export type DocsResolver<R = any, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type CompletionsResolver<
    R = any | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace DependenciesResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;

    version?: VersionResolver<string, TypeParent, Context>;
  }

  export type NameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type VersionResolver<
    R = string,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace ExtensionResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;

    description?: DescriptionResolver<string | null, TypeParent, Context>;

    detailedDescription?: DetailedDescriptionResolver<
      string | null,
      TypeParent,
      Context
    >;
  }

  export type NameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type DescriptionResolver<
    R = string | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type DetailedDescriptionResolver<
    R = string | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace SchematicCollectionResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;

    schematics?: SchematicsResolver<(any | null)[] | null, TypeParent, Context>;
  }

  export type NameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type SchematicsResolver<
    R = (any | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, SchematicsArgs>;
  export interface SchematicsArgs {
    name?: string | null;
  }
}

export namespace SchematicResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    collection?: CollectionResolver<string, TypeParent, Context>;

    name?: NameResolver<string, TypeParent, Context>;

    description?: DescriptionResolver<string | null, TypeParent, Context>;

    schema?: SchemaResolver<(any | null)[] | null, TypeParent, Context>;
  }

  export type CollectionResolver<
    R = string,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type NameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type DescriptionResolver<
    R = string | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type SchemaResolver<
    R = (any | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace SchematicSchemaResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;

    type?: TypeResolver<string, TypeParent, Context>;

    description?: DescriptionResolver<string | null, TypeParent, Context>;

    defaultValue?: DefaultValueResolver<string | null, TypeParent, Context>;

    required?: RequiredResolver<boolean, TypeParent, Context>;

    positional?: PositionalResolver<boolean, TypeParent, Context>;

    enum?: EnumResolver<(string | null)[] | null, TypeParent, Context>;
  }

  export type NameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TypeResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type DescriptionResolver<
    R = string | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type DefaultValueResolver<
    R = string | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type RequiredResolver<
    R = boolean,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type PositionalResolver<
    R = boolean,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type EnumResolver<
    R = (string | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace NpmScriptResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;

    npmClient?: NpmClientResolver<string, TypeParent, Context>;

    schema?: SchemaResolver<(any | null)[] | null, TypeParent, Context>;
  }

  export type NameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type NpmClientResolver<
    R = string,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type SchemaResolver<
    R = (any | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace ArchitectSchemaResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;

    type?: TypeResolver<string, TypeParent, Context>;

    description?: DescriptionResolver<string | null, TypeParent, Context>;

    defaultValue?: DefaultValueResolver<string | null, TypeParent, Context>;

    required?: RequiredResolver<boolean, TypeParent, Context>;

    positional?: PositionalResolver<boolean, TypeParent, Context>;

    enum?: EnumResolver<(string | null)[] | null, TypeParent, Context>;
  }

  export type NameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TypeResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type DescriptionResolver<
    R = string | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type DefaultValueResolver<
    R = string | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type RequiredResolver<
    R = boolean,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type PositionalResolver<
    R = boolean,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type EnumResolver<
    R = (string | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace ProjectResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;

    root?: RootResolver<string, TypeParent, Context>;

    projectType?: ProjectTypeResolver<string, TypeParent, Context>;

    architect?: ArchitectResolver<(any | null)[] | null, TypeParent, Context>;
  }

  export type NameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type RootResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type ProjectTypeResolver<
    R = string,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type ArchitectResolver<
    R = (any | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, ArchitectArgs>;
  export interface ArchitectArgs {
    name?: string | null;
  }
}

export namespace ArchitectResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;

    project?: ProjectResolver<string, TypeParent, Context>;

    builder?: BuilderResolver<string, TypeParent, Context>;

    configurations?: ConfigurationsResolver<
      (any | null)[] | null,
      TypeParent,
      Context
    >;

    schema?: SchemaResolver<(any | null)[] | null, TypeParent, Context>;
  }

  export type NameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type ProjectResolver<
    R = string,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type BuilderResolver<
    R = string,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type ConfigurationsResolver<
    R = (any | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type SchemaResolver<
    R = (any | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace ArchitectConfigurationsResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;
  }

  export type NameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace DocsResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    workspaceDocs?: WorkspaceDocsResolver<any[], TypeParent, Context>;

    schematicDocs?: SchematicDocsResolver<any[], TypeParent, Context>;
  }

  export type WorkspaceDocsResolver<
    R = any[],
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type SchematicDocsResolver<
    R = any[],
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, SchematicDocsArgs>;
  export interface SchematicDocsArgs {
    collectionName: string;

    collectionVersion?: string | null;

    name: string;
  }
}

export namespace DocResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    prop?: PropResolver<string | null, TypeParent, Context>;

    description?: DescriptionResolver<string | null, TypeParent, Context>;

    id?: IdResolver<string, TypeParent, Context>;
  }

  export type PropResolver<
    R = string | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type DescriptionResolver<
    R = string | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type IdResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace CompletionsTypesResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    files?: FilesResolver<(any | null)[] | null, TypeParent, Context>;

    projects?: ProjectsResolver<(any | null)[] | null, TypeParent, Context>;

    localModules?: LocalModulesResolver<
      (any | null)[] | null,
      TypeParent,
      Context
    >;

    absoluteModules?: AbsoluteModulesResolver<
      (any | null)[] | null,
      TypeParent,
      Context
    >;
  }

  export type FilesResolver<
    R = (any | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, FilesArgs>;
  export interface FilesArgs {
    input?: string | null;
  }

  export type ProjectsResolver<
    R = (any | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, ProjectsArgs>;
  export interface ProjectsArgs {
    input?: string | null;
  }

  export type LocalModulesResolver<
    R = (any | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, LocalModulesArgs>;
  export interface LocalModulesArgs {
    input?: string | null;
  }

  export type AbsoluteModulesResolver<
    R = (any | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, AbsoluteModulesArgs>;
  export interface AbsoluteModulesArgs {
    input?: string | null;
  }
}

export namespace CompletionResultTypeResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    value?: ValueResolver<string, TypeParent, Context>;

    display?: DisplayResolver<string | null, TypeParent, Context>;
  }

  export type ValueResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type DisplayResolver<
    R = string | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace EditorSupportResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;

    icon?: IconResolver<string, TypeParent, Context>;
  }

  export type NameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type IconResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace InstallNodeJsStatusResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    downloadPercentage?: DownloadPercentageResolver<
      number | null,
      TypeParent,
      Context
    >;

    downloadSpeed?: DownloadSpeedResolver<number | null, TypeParent, Context>;

    success?: SuccessResolver<boolean | null, TypeParent, Context>;

    cancelled?: CancelledResolver<boolean | null, TypeParent, Context>;

    error?: ErrorResolver<string | null, TypeParent, Context>;
  }

  export type DownloadPercentageResolver<
    R = number | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type DownloadSpeedResolver<
    R = number | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type SuccessResolver<
    R = boolean | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type CancelledResolver<
    R = boolean | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type ErrorResolver<
    R = string | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace IsNodeInstalledResultResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    result?: ResultResolver<boolean, TypeParent, Context>;
  }

  export type ResultResolver<
    R = boolean,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace FilesTypeResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    path?: PathResolver<string, TypeParent, Context>;

    exists?: ExistsResolver<boolean, TypeParent, Context>;

    files?: FilesResolver<(any | null)[] | null, TypeParent, Context>;
  }

  export type PathResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type ExistsResolver<
    R = boolean,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type FilesResolver<
    R = (any | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace FileListTypeResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;

    type?: TypeResolver<FileType, TypeParent, Context>;
  }

  export type NameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TypeResolver<
    R = FileType,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace CommandResponseResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    type?: TypeResolver<string, TypeParent, Context>;

    id?: IdResolver<string, TypeParent, Context>;

    workspace?: WorkspaceResolver<string | null, TypeParent, Context>;

    command?: CommandResolver<string, TypeParent, Context>;

    status?: StatusResolver<string, TypeParent, Context>;

    detailedStatus?: DetailedStatusResolver<string | null, TypeParent, Context>;

    outChunk?: OutChunkResolver<string, TypeParent, Context>;

    out?: OutResolver<string, TypeParent, Context>;
  }

  export type TypeResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type IdResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type WorkspaceResolver<
    R = string | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type CommandResolver<
    R = string,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type StatusResolver<
    R = string,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type DetailedStatusResolver<
    R = string | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type OutChunkResolver<
    R = string,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type OutResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace MutationResolvers {
  export interface Resolvers<Context = any, TypeParent = {}> {
    ngAdd?: NgAddResolver<any | null, TypeParent, Context>;

    ngNew?: NgNewResolver<any | null, TypeParent, Context>;

    generate?: GenerateResolver<any | null, TypeParent, Context>;

    runNg?: RunNgResolver<any | null, TypeParent, Context>;

    runNpm?: RunNpmResolver<any | null, TypeParent, Context>;

    stopCommand?: StopCommandResolver<any | null, TypeParent, Context>;

    removeCommand?: RemoveCommandResolver<any | null, TypeParent, Context>;

    removeAllCommands?: RemoveAllCommandsResolver<
      any | null,
      TypeParent,
      Context
    >;

    restartCommand?: RestartCommandResolver<any | null, TypeParent, Context>;

    openInEditor?: OpenInEditorResolver<any | null, TypeParent, Context>;

    updateSettings?: UpdateSettingsResolver<any, TypeParent, Context>;

    installNodeJs?: InstallNodeJsResolver<any | null, TypeParent, Context>;

    openInBrowser?: OpenInBrowserResolver<any | null, TypeParent, Context>;

    selectDirectory?: SelectDirectoryResolver<any | null, TypeParent, Context>;

    showItemInFolder?: ShowItemInFolderResolver<
      any | null,
      TypeParent,
      Context
    >;

    openDoc?: OpenDocResolver<any | null, TypeParent, Context>;
  }

  export type NgAddResolver<
    R = any | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, NgAddArgs>;
  export interface NgAddArgs {
    path: string;

    name: string;
  }

  export type NgNewResolver<
    R = any | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, NgNewArgs>;
  export interface NgNewArgs {
    path: string;

    name: string;

    collection: string;
  }

  export type GenerateResolver<
    R = any | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, GenerateArgs>;
  export interface GenerateArgs {
    path: string;

    genCommand?: (string | null)[] | null;

    dryRun: boolean;
  }

  export type RunNgResolver<
    R = any | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, RunNgArgs>;
  export interface RunNgArgs {
    path: string;

    runCommand?: (string | null)[] | null;
  }

  export type RunNpmResolver<
    R = any | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, RunNpmArgs>;
  export interface RunNpmArgs {
    path: string;

    npmClient: string;

    runCommand?: (string | null)[] | null;
  }

  export type StopCommandResolver<
    R = any | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, StopCommandArgs>;
  export interface StopCommandArgs {
    id: string;
  }

  export type RemoveCommandResolver<
    R = any | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, RemoveCommandArgs>;
  export interface RemoveCommandArgs {
    id: string;
  }

  export type RemoveAllCommandsResolver<
    R = any | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context>;
  export type RestartCommandResolver<
    R = any | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, RestartCommandArgs>;
  export interface RestartCommandArgs {
    id: string;
  }

  export type OpenInEditorResolver<
    R = any | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, OpenInEditorArgs>;
  export interface OpenInEditorArgs {
    editor: string;

    path: string;
  }

  export type UpdateSettingsResolver<
    R = any,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, UpdateSettingsArgs>;
  export interface UpdateSettingsArgs {
    data: string;
  }

  export type InstallNodeJsResolver<
    R = any | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context>;
  export type OpenInBrowserResolver<
    R = any | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, OpenInBrowserArgs>;
  export interface OpenInBrowserArgs {
    url: string;
  }

  export type SelectDirectoryResolver<
    R = any | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, SelectDirectoryArgs>;
  export interface SelectDirectoryArgs {
    dialogTitle: string;

    dialogButtonLabel: string;

    angularWorkspace: boolean;
  }

  export type ShowItemInFolderResolver<
    R = any | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, ShowItemInFolderArgs>;
  export interface ShowItemInFolderArgs {
    item: string;
  }

  export type OpenDocResolver<
    R = any | null,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, OpenDocArgs>;
  export interface OpenDocArgs {
    id: string;
  }
}

export namespace CommandStartedResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    id?: IdResolver<string, TypeParent, Context>;
  }

  export type IdResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace StopResultResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    result?: ResultResolver<boolean | null, TypeParent, Context>;
  }

  export type ResultResolver<
    R = boolean | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace RemoveResultResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    result?: ResultResolver<boolean | null, TypeParent, Context>;
  }

  export type ResultResolver<
    R = boolean | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace OpenInEditorResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    response?: ResponseResolver<string, TypeParent, Context>;
  }

  export type ResponseResolver<
    R = string,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace OpenInBrowserResultResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    result?: ResultResolver<boolean, TypeParent, Context>;
  }

  export type ResultResolver<
    R = boolean,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace SelectDirectoryResultResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    selectedDirectoryPath?: SelectedDirectoryPathResolver<
      string | null,
      TypeParent,
      Context
    >;

    error?: ErrorResolver<string | null, TypeParent, Context>;
  }

  export type SelectedDirectoryPathResolver<
    R = string | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type ErrorResolver<
    R = string | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace ShowItemInFolderResultResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    result?: ResultResolver<boolean, TypeParent, Context>;
  }

  export type ResultResolver<
    R = boolean,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace OpenDocResultResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    result?: ResultResolver<boolean, TypeParent, Context>;
  }

  export type ResultResolver<
    R = boolean,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

/** Directs the executor to skip this field or fragment when the `if` argument is true. */
export type SkipDirectiveResolver<Result> = DirectiveResolverFn<
  Result,
  SkipDirectiveArgs,
  any
>;
export interface SkipDirectiveArgs {
  /** Skipped when true. */
  if: boolean;
}

/** Directs the executor to include this field or fragment only when the `if` argument is true. */
export type IncludeDirectiveResolver<Result> = DirectiveResolverFn<
  Result,
  IncludeDirectiveArgs,
  any
>;
export interface IncludeDirectiveArgs {
  /** Included when true. */
  if: boolean;
}

/** Marks an element of a GraphQL schema as no longer supported. */
export type DeprecatedDirectiveResolver<Result> = DirectiveResolverFn<
  Result,
  DeprecatedDirectiveArgs,
  any
>;
export interface DeprecatedDirectiveArgs {
  /** Explains why this element was deprecated, usually also including a suggestion for how to access supported similar data. Formatted in [Markdown](https://daringfireball.net/projects/markdown/). */
  reason?: string | null;
}
