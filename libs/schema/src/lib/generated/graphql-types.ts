export type Maybe<T> = T | null;

export enum FileType {
  File = 'file',
  Directory = 'directory',
  AngularDirectory = 'angularDirectory'
}

// ====================================================
// Types
// ====================================================

export interface Query {
  settings: Settings;

  schematicCollections: SchematicCollectionForNgNew[];

  workspace: Workspace;

  editors: EditorSupport[];

  availableExtensions: Extension[];

  installNodeJsStatus?: Maybe<InstallNodeJsStatus>;

  isNodejsInstalled?: Maybe<IsNodeInstalledResult>;

  directory: FilesType;

  commands: CommandResponse[];
}

export interface Settings {
  canCollectData: boolean;

  isConnectUser?: Maybe<boolean>;

  showSupportPlugin?: Maybe<boolean>;

  installNodeManually?: Maybe<boolean>;

  enableDetailedStatus?: Maybe<boolean>;

  channel?: Maybe<string>;

  workspaceSchematicsDirectory?: Maybe<string>;

  workspaceSchematicsNpmScript?: Maybe<string>;

  recent: WorkspaceDefinition[];
}

export interface WorkspaceDefinition {
  path: string;

  name: string;

  favorite?: Maybe<boolean>;

  pinnedProjectNames: string[];
}

export interface SchematicCollectionForNgNew {
  name: string;

  description: string;

  schema: Schema[];
}

export interface Schema {
  name: string;

  type: string;

  description: string;

  defaultValue?: Maybe<string>;

  important?: Maybe<boolean>;

  completion?: Maybe<string>;

  required: boolean;

  positional: boolean;

  enum?: Maybe<string[]>;
}

export interface Workspace {
  name: string;

  path: string;

  dependencies: Dependencies[];

  extensions: Extension[];

  schematicCollections: SchematicCollection[];

  npmScripts: NpmScript[];

  projects: Project[];

  docs: Docs;

  completions?: Maybe<CompletionsTypes>;
}

export interface Dependencies {
  name: string;

  version: string;
}

export interface Extension {
  name: string;

  description: string;

  detailedDescription?: Maybe<string>;

  installed?: Maybe<boolean>;
}

export interface SchematicCollection {
  name: string;

  schematics: Schematic[];
}

export interface Schematic {
  collection: string;

  name: string;

  description: string;

  npmClient?: Maybe<string>;

  npmScript?: Maybe<string>;

  schema: Schema[];
}

export interface NpmScript {
  name: string;

  npmClient?: Maybe<string>;

  schema: Schema[];
}

export interface Project {
  name: string;

  root: string;

  projectType: string;

  architect: Architect[];
}

export interface Architect {
  name: string;

  project: string;

  builder: string;

  description: string;

  configurations: ArchitectConfigurations[];

  schema: Schema[];
}

export interface ArchitectConfigurations {
  name: string;
}

export interface Docs {
  workspaceDocs: Doc[];

  schematicDocs: Doc[];
}

export interface Doc {
  prop?: Maybe<string>;

  description?: Maybe<string>;

  id: string;
}

export interface CompletionsTypes {
  files: CompletionResultType[];

  projects: CompletionResultType[];

  localModules: CompletionResultType[];

  absoluteModules: CompletionResultType[];
}

export interface CompletionResultType {
  value: string;

  display?: Maybe<string>;
}

export interface EditorSupport {
  name: string;

  icon: string;
}

export interface InstallNodeJsStatus {
  downloadPercentage?: Maybe<number>;

  downloadSpeed?: Maybe<number>;

  success?: Maybe<boolean>;

  cancelled?: Maybe<boolean>;

  error?: Maybe<string>;
}

export interface IsNodeInstalledResult {
  result: boolean;
}

export interface FilesType {
  path: string;

  exists: boolean;

  files: FileListType[];
}

export interface FileListType {
  name: string;

  type: FileType;
}

export interface CommandResponse {
  id: string;

  workspace?: Maybe<string>;

  command: string;

  status: string;

  detailedStatus?: Maybe<string>;

  outChunk: string;

  out: string;
}

export interface Mutation {
  ngAdd?: Maybe<CommandStarted>;

  ngNew?: Maybe<CommandStarted>;

  generate?: Maybe<CommandStarted>;

  generateUsingNpm?: Maybe<CommandStarted>;

  runNg?: Maybe<CommandStarted>;

  runNpm?: Maybe<CommandStarted>;

  stopCommand?: Maybe<StopResult>;

  removeCommand?: Maybe<RemoveResult>;

  removeAllCommands?: Maybe<RemoveResult>;

  restartCommand?: Maybe<RemoveResult>;

  openInEditor?: Maybe<OpenInEditor>;

  updateSettings: Settings;

  installNodeJs?: Maybe<InstallNodeJsStatus>;

  openInBrowser?: Maybe<OpenInBrowserResult>;

  selectDirectory?: Maybe<SelectDirectoryResult>;

  showItemInFolder?: Maybe<ShowItemInFolderResult>;

  openDoc?: Maybe<OpenDocResult>;
}

export interface CommandStarted {
  id: string;
}

export interface StopResult {
  result?: Maybe<boolean>;
}

export interface RemoveResult {
  result?: Maybe<boolean>;
}

export interface OpenInEditor {
  response: string;
}

export interface OpenInBrowserResult {
  result: boolean;
}

export interface SelectDirectoryResult {
  selectedDirectoryPath?: Maybe<string>;

  error?: Maybe<string>;
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

export interface WorkspaceQueryArgs {
  path: string;
}
export interface AvailableExtensionsQueryArgs {
  name?: Maybe<string>;
}
export interface DirectoryQueryArgs {
  path?: Maybe<string>;

  onlyDirectories?: Maybe<boolean>;

  showHidden?: Maybe<boolean>;
}
export interface CommandsQueryArgs {
  id?: Maybe<string>;

  cols?: Maybe<number>;
}
export interface SchematicCollectionsWorkspaceArgs {
  name?: Maybe<string>;
}
export interface NpmScriptsWorkspaceArgs {
  name?: Maybe<string>;
}
export interface ProjectsWorkspaceArgs {
  name?: Maybe<string>;
}
export interface SchematicsSchematicCollectionArgs {
  name?: Maybe<string>;
}
export interface ArchitectProjectArgs {
  name?: Maybe<string>;
}
export interface SchematicDocsDocsArgs {
  collectionName: string;

  collectionVersion?: Maybe<string>;

  name: string;
}
export interface FilesCompletionsTypesArgs {
  input: string;
}
export interface ProjectsCompletionsTypesArgs {
  input: string;
}
export interface LocalModulesCompletionsTypesArgs {
  input: string;
}
export interface AbsoluteModulesCompletionsTypesArgs {
  input: string;
}
export interface NgAddMutationArgs {
  path: string;

  name: string;
}
export interface NgNewMutationArgs {
  path: string;

  name: string;

  collection: string;

  newCommand: string[];
}
export interface GenerateMutationArgs {
  path: string;

  genCommand: string[];

  dryRun: boolean;
}
export interface GenerateUsingNpmMutationArgs {
  path: string;

  npmClient?: Maybe<string>;

  genCommand: string[];

  dryRun: boolean;
}
export interface RunNgMutationArgs {
  path: string;

  runCommand: string[];
}
export interface RunNpmMutationArgs {
  path: string;

  npmClient?: Maybe<string>;

  runCommand: string[];
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

import { GraphQLResolveInfo } from 'graphql';

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

export namespace QueryResolvers {
  export interface Resolvers<Context = any, TypeParent = {}> {
    settings?: SettingsResolver<any, TypeParent, Context>;

    schematicCollections?: SchematicCollectionsResolver<
      any[],
      TypeParent,
      Context
    >;

    workspace?: WorkspaceResolver<any, TypeParent, Context>;

    editors?: EditorsResolver<any[], TypeParent, Context>;

    availableExtensions?: AvailableExtensionsResolver<
      any[],
      TypeParent,
      Context
    >;

    installNodeJsStatus?: InstallNodeJsStatusResolver<
      Maybe<any>,
      TypeParent,
      Context
    >;

    isNodejsInstalled?: IsNodejsInstalledResolver<
      Maybe<any>,
      TypeParent,
      Context
    >;

    directory?: DirectoryResolver<any, TypeParent, Context>;

    commands?: CommandsResolver<any[], TypeParent, Context>;
  }

  export type SettingsResolver<R = any, Parent = {}, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type SchematicCollectionsResolver<
    R = any[],
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
    R = any[],
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, AvailableExtensionsArgs>;
  export interface AvailableExtensionsArgs {
    name?: Maybe<string>;
  }

  export type InstallNodeJsStatusResolver<
    R = Maybe<any>,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context>;
  export type IsNodejsInstalledResolver<
    R = Maybe<any>,
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
    path?: Maybe<string>;

    onlyDirectories?: Maybe<boolean>;

    showHidden?: Maybe<boolean>;
  }

  export type CommandsResolver<
    R = any[],
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, CommandsArgs>;
  export interface CommandsArgs {
    id?: Maybe<string>;

    cols?: Maybe<number>;
  }
}

export namespace SettingsResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    canCollectData?: CanCollectDataResolver<boolean, TypeParent, Context>;

    isConnectUser?: IsConnectUserResolver<Maybe<boolean>, TypeParent, Context>;

    showSupportPlugin?: ShowSupportPluginResolver<
      Maybe<boolean>,
      TypeParent,
      Context
    >;

    installNodeManually?: InstallNodeManuallyResolver<
      Maybe<boolean>,
      TypeParent,
      Context
    >;

    enableDetailedStatus?: EnableDetailedStatusResolver<
      Maybe<boolean>,
      TypeParent,
      Context
    >;

    channel?: ChannelResolver<Maybe<string>, TypeParent, Context>;

    workspaceSchematicsDirectory?: WorkspaceSchematicsDirectoryResolver<
      Maybe<string>,
      TypeParent,
      Context
    >;

    workspaceSchematicsNpmScript?: WorkspaceSchematicsNpmScriptResolver<
      Maybe<string>,
      TypeParent,
      Context
    >;

    recent?: RecentResolver<any[], TypeParent, Context>;
  }

  export type CanCollectDataResolver<
    R = boolean,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type IsConnectUserResolver<
    R = Maybe<boolean>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type ShowSupportPluginResolver<
    R = Maybe<boolean>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type InstallNodeManuallyResolver<
    R = Maybe<boolean>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type EnableDetailedStatusResolver<
    R = Maybe<boolean>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type ChannelResolver<
    R = Maybe<string>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type WorkspaceSchematicsDirectoryResolver<
    R = Maybe<string>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type WorkspaceSchematicsNpmScriptResolver<
    R = Maybe<string>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type RecentResolver<R = any[], Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace WorkspaceDefinitionResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    path?: PathResolver<string, TypeParent, Context>;

    name?: NameResolver<string, TypeParent, Context>;

    favorite?: FavoriteResolver<Maybe<boolean>, TypeParent, Context>;

    pinnedProjectNames?: PinnedProjectNamesResolver<
      string[],
      TypeParent,
      Context
    >;
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
    R = Maybe<boolean>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type PinnedProjectNamesResolver<
    R = string[],
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace SchematicCollectionForNgNewResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;

    description?: DescriptionResolver<string, TypeParent, Context>;

    schema?: SchemaResolver<any[], TypeParent, Context>;
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
  export type SchemaResolver<R = any[], Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace SchemaResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;

    type?: TypeResolver<string, TypeParent, Context>;

    description?: DescriptionResolver<string, TypeParent, Context>;

    defaultValue?: DefaultValueResolver<Maybe<string>, TypeParent, Context>;

    important?: ImportantResolver<Maybe<boolean>, TypeParent, Context>;

    completion?: CompletionResolver<Maybe<string>, TypeParent, Context>;

    required?: RequiredResolver<boolean, TypeParent, Context>;

    positional?: PositionalResolver<boolean, TypeParent, Context>;

    enum?: EnumResolver<Maybe<string[]>, TypeParent, Context>;
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
    R = string,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type DefaultValueResolver<
    R = Maybe<string>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type ImportantResolver<
    R = Maybe<boolean>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type CompletionResolver<
    R = Maybe<string>,
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
    R = Maybe<string[]>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace WorkspaceResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;

    path?: PathResolver<string, TypeParent, Context>;

    dependencies?: DependenciesResolver<any[], TypeParent, Context>;

    extensions?: ExtensionsResolver<any[], TypeParent, Context>;

    schematicCollections?: SchematicCollectionsResolver<
      any[],
      TypeParent,
      Context
    >;

    npmScripts?: NpmScriptsResolver<any[], TypeParent, Context>;

    projects?: ProjectsResolver<any[], TypeParent, Context>;

    docs?: DocsResolver<any, TypeParent, Context>;

    completions?: CompletionsResolver<Maybe<any>, TypeParent, Context>;
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
    R = any[],
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type ExtensionsResolver<
    R = any[],
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type SchematicCollectionsResolver<
    R = any[],
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, SchematicCollectionsArgs>;
  export interface SchematicCollectionsArgs {
    name?: Maybe<string>;
  }

  export type NpmScriptsResolver<
    R = any[],
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, NpmScriptsArgs>;
  export interface NpmScriptsArgs {
    name?: Maybe<string>;
  }

  export type ProjectsResolver<
    R = any[],
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, ProjectsArgs>;
  export interface ProjectsArgs {
    name?: Maybe<string>;
  }

  export type DocsResolver<R = any, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type CompletionsResolver<
    R = Maybe<any>,
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

    description?: DescriptionResolver<string, TypeParent, Context>;

    detailedDescription?: DetailedDescriptionResolver<
      Maybe<string>,
      TypeParent,
      Context
    >;

    installed?: InstalledResolver<Maybe<boolean>, TypeParent, Context>;
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
  export type DetailedDescriptionResolver<
    R = Maybe<string>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type InstalledResolver<
    R = Maybe<boolean>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace SchematicCollectionResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;

    schematics?: SchematicsResolver<any[], TypeParent, Context>;
  }

  export type NameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type SchematicsResolver<
    R = any[],
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, SchematicsArgs>;
  export interface SchematicsArgs {
    name?: Maybe<string>;
  }
}

export namespace SchematicResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    collection?: CollectionResolver<string, TypeParent, Context>;

    name?: NameResolver<string, TypeParent, Context>;

    description?: DescriptionResolver<string, TypeParent, Context>;

    npmClient?: NpmClientResolver<Maybe<string>, TypeParent, Context>;

    npmScript?: NpmScriptResolver<Maybe<string>, TypeParent, Context>;

    schema?: SchemaResolver<any[], TypeParent, Context>;
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
    R = string,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type NpmClientResolver<
    R = Maybe<string>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type NpmScriptResolver<
    R = Maybe<string>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type SchemaResolver<R = any[], Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace NpmScriptResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;

    npmClient?: NpmClientResolver<Maybe<string>, TypeParent, Context>;

    schema?: SchemaResolver<any[], TypeParent, Context>;
  }

  export type NameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type NpmClientResolver<
    R = Maybe<string>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type SchemaResolver<R = any[], Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace ProjectResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;

    root?: RootResolver<string, TypeParent, Context>;

    projectType?: ProjectTypeResolver<string, TypeParent, Context>;

    architect?: ArchitectResolver<any[], TypeParent, Context>;
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
    R = any[],
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, ArchitectArgs>;
  export interface ArchitectArgs {
    name?: Maybe<string>;
  }
}

export namespace ArchitectResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, Context>;

    project?: ProjectResolver<string, TypeParent, Context>;

    builder?: BuilderResolver<string, TypeParent, Context>;

    description?: DescriptionResolver<string, TypeParent, Context>;

    configurations?: ConfigurationsResolver<any[], TypeParent, Context>;

    schema?: SchemaResolver<any[], TypeParent, Context>;
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
  export type DescriptionResolver<
    R = string,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type ConfigurationsResolver<
    R = any[],
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type SchemaResolver<R = any[], Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
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

    collectionVersion?: Maybe<string>;

    name: string;
  }
}

export namespace DocResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    prop?: PropResolver<Maybe<string>, TypeParent, Context>;

    description?: DescriptionResolver<Maybe<string>, TypeParent, Context>;

    id?: IdResolver<string, TypeParent, Context>;
  }

  export type PropResolver<
    R = Maybe<string>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type DescriptionResolver<
    R = Maybe<string>,
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
    files?: FilesResolver<any[], TypeParent, Context>;

    projects?: ProjectsResolver<any[], TypeParent, Context>;

    localModules?: LocalModulesResolver<any[], TypeParent, Context>;

    absoluteModules?: AbsoluteModulesResolver<any[], TypeParent, Context>;
  }

  export type FilesResolver<R = any[], Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context,
    FilesArgs
  >;
  export interface FilesArgs {
    input: string;
  }

  export type ProjectsResolver<
    R = any[],
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, ProjectsArgs>;
  export interface ProjectsArgs {
    input: string;
  }

  export type LocalModulesResolver<
    R = any[],
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, LocalModulesArgs>;
  export interface LocalModulesArgs {
    input: string;
  }

  export type AbsoluteModulesResolver<
    R = any[],
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, AbsoluteModulesArgs>;
  export interface AbsoluteModulesArgs {
    input: string;
  }
}

export namespace CompletionResultTypeResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    value?: ValueResolver<string, TypeParent, Context>;

    display?: DisplayResolver<Maybe<string>, TypeParent, Context>;
  }

  export type ValueResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type DisplayResolver<
    R = Maybe<string>,
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
      Maybe<number>,
      TypeParent,
      Context
    >;

    downloadSpeed?: DownloadSpeedResolver<Maybe<number>, TypeParent, Context>;

    success?: SuccessResolver<Maybe<boolean>, TypeParent, Context>;

    cancelled?: CancelledResolver<Maybe<boolean>, TypeParent, Context>;

    error?: ErrorResolver<Maybe<string>, TypeParent, Context>;
  }

  export type DownloadPercentageResolver<
    R = Maybe<number>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type DownloadSpeedResolver<
    R = Maybe<number>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type SuccessResolver<
    R = Maybe<boolean>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type CancelledResolver<
    R = Maybe<boolean>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type ErrorResolver<
    R = Maybe<string>,
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

    files?: FilesResolver<any[], TypeParent, Context>;
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
  export type FilesResolver<R = any[], Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
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
    id?: IdResolver<string, TypeParent, Context>;

    workspace?: WorkspaceResolver<Maybe<string>, TypeParent, Context>;

    command?: CommandResolver<string, TypeParent, Context>;

    status?: StatusResolver<string, TypeParent, Context>;

    detailedStatus?: DetailedStatusResolver<Maybe<string>, TypeParent, Context>;

    outChunk?: OutChunkResolver<string, TypeParent, Context>;

    out?: OutResolver<string, TypeParent, Context>;
  }

  export type IdResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type WorkspaceResolver<
    R = Maybe<string>,
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
    R = Maybe<string>,
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
    ngAdd?: NgAddResolver<Maybe<any>, TypeParent, Context>;

    ngNew?: NgNewResolver<Maybe<any>, TypeParent, Context>;

    generate?: GenerateResolver<Maybe<any>, TypeParent, Context>;

    generateUsingNpm?: GenerateUsingNpmResolver<
      Maybe<any>,
      TypeParent,
      Context
    >;

    runNg?: RunNgResolver<Maybe<any>, TypeParent, Context>;

    runNpm?: RunNpmResolver<Maybe<any>, TypeParent, Context>;

    stopCommand?: StopCommandResolver<Maybe<any>, TypeParent, Context>;

    removeCommand?: RemoveCommandResolver<Maybe<any>, TypeParent, Context>;

    removeAllCommands?: RemoveAllCommandsResolver<
      Maybe<any>,
      TypeParent,
      Context
    >;

    restartCommand?: RestartCommandResolver<Maybe<any>, TypeParent, Context>;

    openInEditor?: OpenInEditorResolver<Maybe<any>, TypeParent, Context>;

    updateSettings?: UpdateSettingsResolver<any, TypeParent, Context>;

    installNodeJs?: InstallNodeJsResolver<Maybe<any>, TypeParent, Context>;

    openInBrowser?: OpenInBrowserResolver<Maybe<any>, TypeParent, Context>;

    selectDirectory?: SelectDirectoryResolver<Maybe<any>, TypeParent, Context>;

    showItemInFolder?: ShowItemInFolderResolver<
      Maybe<any>,
      TypeParent,
      Context
    >;

    openDoc?: OpenDocResolver<Maybe<any>, TypeParent, Context>;
  }

  export type NgAddResolver<
    R = Maybe<any>,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, NgAddArgs>;
  export interface NgAddArgs {
    path: string;

    name: string;
  }

  export type NgNewResolver<
    R = Maybe<any>,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, NgNewArgs>;
  export interface NgNewArgs {
    path: string;

    name: string;

    collection: string;

    newCommand: string[];
  }

  export type GenerateResolver<
    R = Maybe<any>,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, GenerateArgs>;
  export interface GenerateArgs {
    path: string;

    genCommand: string[];

    dryRun: boolean;
  }

  export type GenerateUsingNpmResolver<
    R = Maybe<any>,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, GenerateUsingNpmArgs>;
  export interface GenerateUsingNpmArgs {
    path: string;

    npmClient?: Maybe<string>;

    genCommand: string[];

    dryRun: boolean;
  }

  export type RunNgResolver<
    R = Maybe<any>,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, RunNgArgs>;
  export interface RunNgArgs {
    path: string;

    runCommand: string[];
  }

  export type RunNpmResolver<
    R = Maybe<any>,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, RunNpmArgs>;
  export interface RunNpmArgs {
    path: string;

    npmClient?: Maybe<string>;

    runCommand: string[];
  }

  export type StopCommandResolver<
    R = Maybe<any>,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, StopCommandArgs>;
  export interface StopCommandArgs {
    id: string;
  }

  export type RemoveCommandResolver<
    R = Maybe<any>,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, RemoveCommandArgs>;
  export interface RemoveCommandArgs {
    id: string;
  }

  export type RemoveAllCommandsResolver<
    R = Maybe<any>,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context>;
  export type RestartCommandResolver<
    R = Maybe<any>,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, RestartCommandArgs>;
  export interface RestartCommandArgs {
    id: string;
  }

  export type OpenInEditorResolver<
    R = Maybe<any>,
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
    R = Maybe<any>,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context>;
  export type OpenInBrowserResolver<
    R = Maybe<any>,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, OpenInBrowserArgs>;
  export interface OpenInBrowserArgs {
    url: string;
  }

  export type SelectDirectoryResolver<
    R = Maybe<any>,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, SelectDirectoryArgs>;
  export interface SelectDirectoryArgs {
    dialogTitle: string;

    dialogButtonLabel: string;

    angularWorkspace: boolean;
  }

  export type ShowItemInFolderResolver<
    R = Maybe<any>,
    Parent = {},
    Context = any
  > = Resolver<R, Parent, Context, ShowItemInFolderArgs>;
  export interface ShowItemInFolderArgs {
    item: string;
  }

  export type OpenDocResolver<
    R = Maybe<any>,
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
    result?: ResultResolver<Maybe<boolean>, TypeParent, Context>;
  }

  export type ResultResolver<
    R = Maybe<boolean>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace RemoveResultResolvers {
  export interface Resolvers<Context = any, TypeParent = any> {
    result?: ResultResolver<Maybe<boolean>, TypeParent, Context>;
  }

  export type ResultResolver<
    R = Maybe<boolean>,
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
      Maybe<string>,
      TypeParent,
      Context
    >;

    error?: ErrorResolver<Maybe<string>, TypeParent, Context>;
  }

  export type SelectedDirectoryPathResolver<
    R = Maybe<string>,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type ErrorResolver<
    R = Maybe<string>,
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
  /** Explains why this element was deprecated, usually also including a suggestion for how to access supported similar data. Formatted using the Markdown syntax (as specified by [CommonMark](https://commonmark.org/). */
  reason?: string;
}

export interface IResolvers<Context = any> {
  Query?: QueryResolvers.Resolvers<Context>;
  Settings?: SettingsResolvers.Resolvers<Context>;
  WorkspaceDefinition?: WorkspaceDefinitionResolvers.Resolvers<Context>;
  SchematicCollectionForNgNew?: SchematicCollectionForNgNewResolvers.Resolvers<
    Context
  >;
  Schema?: SchemaResolvers.Resolvers<Context>;
  Workspace?: WorkspaceResolvers.Resolvers<Context>;
  Dependencies?: DependenciesResolvers.Resolvers<Context>;
  Extension?: ExtensionResolvers.Resolvers<Context>;
  SchematicCollection?: SchematicCollectionResolvers.Resolvers<Context>;
  Schematic?: SchematicResolvers.Resolvers<Context>;
  NpmScript?: NpmScriptResolvers.Resolvers<Context>;
  Project?: ProjectResolvers.Resolvers<Context>;
  Architect?: ArchitectResolvers.Resolvers<Context>;
  ArchitectConfigurations?: ArchitectConfigurationsResolvers.Resolvers<Context>;
  Docs?: DocsResolvers.Resolvers<Context>;
  Doc?: DocResolvers.Resolvers<Context>;
  CompletionsTypes?: CompletionsTypesResolvers.Resolvers<Context>;
  CompletionResultType?: CompletionResultTypeResolvers.Resolvers<Context>;
  EditorSupport?: EditorSupportResolvers.Resolvers<Context>;
  InstallNodeJsStatus?: InstallNodeJsStatusResolvers.Resolvers<Context>;
  IsNodeInstalledResult?: IsNodeInstalledResultResolvers.Resolvers<Context>;
  FilesType?: FilesTypeResolvers.Resolvers<Context>;
  FileListType?: FileListTypeResolvers.Resolvers<Context>;
  CommandResponse?: CommandResponseResolvers.Resolvers<Context>;
  Mutation?: MutationResolvers.Resolvers<Context>;
  CommandStarted?: CommandStartedResolvers.Resolvers<Context>;
  StopResult?: StopResultResolvers.Resolvers<Context>;
  RemoveResult?: RemoveResultResolvers.Resolvers<Context>;
  OpenInEditor?: OpenInEditorResolvers.Resolvers<Context>;
  OpenInBrowserResult?: OpenInBrowserResultResolvers.Resolvers<Context>;
  SelectDirectoryResult?: SelectDirectoryResultResolvers.Resolvers<Context>;
  ShowItemInFolderResult?: ShowItemInFolderResultResolvers.Resolvers<Context>;
  OpenDocResult?: OpenDocResultResolvers.Resolvers<Context>;
}

export interface IDirectiveResolvers<Result> {
  skip?: SkipDirectiveResolver<Result>;
  include?: IncludeDirectiveResolver<Result>;
  deprecated?: DeprecatedDirectiveResolver<Result>;
}
