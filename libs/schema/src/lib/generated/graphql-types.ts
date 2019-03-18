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

  disableAnimations?: Maybe<boolean>;

  showSupportPlugin?: Maybe<boolean>;

  installNodeManually?: Maybe<boolean>;

  enableDetailedStatus?: Maybe<boolean>;

  channel?: Maybe<string>;

  workspaceSchematicsDirectory?: Maybe<string>;

  workspaceSchematicsNpmScript?: Maybe<string>;

  recent: WorkspaceDefinition[];

  isWsl?: Maybe<boolean>;

  useNvm?: Maybe<boolean>;
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

  recentActions: RecentAction[];
}

export interface Architect {
  name: string;

  project: string;

  builder: string;

  description: string;

  options: Options;

  configurations: ArchitectConfigurations[];

  schema: Schema[];
}

export interface Options {
  defaultValues: FieldValue[];
}

export interface FieldValue {
  name: string;

  defaultValue?: Maybe<string>;
}

export interface ArchitectConfigurations {
  name: string;

  defaultValues: FieldValue[];
}

export interface RecentAction {
  actionName: string;

  schematicName?: Maybe<string>;
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

  saveRecentAction: RecentAction[];

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
export interface SaveRecentActionMutationArgs {
  workspacePath: string;

  projectName: string;

  actionName: string;

  schematicName?: Maybe<string>;
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

export type Resolver<Result, Parent = {}, TContext = {}, Args = {}> = (
  parent: Parent,
  args: Args,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<Result> | Result;

export interface ISubscriptionResolverObject<Result, Parent, TContext, Args> {
  subscribe<R = Result, P = Parent>(
    parent: P,
    args: Args,
    context: TContext,
    info: GraphQLResolveInfo
  ): AsyncIterator<R | Result> | Promise<AsyncIterator<R | Result>>;
  resolve?<R = Result, P = Parent>(
    parent: P,
    args: Args,
    context: TContext,
    info: GraphQLResolveInfo
  ): R | Result | Promise<R | Result>;
}

export type SubscriptionResolver<
  Result,
  Parent = {},
  TContext = {},
  Args = {}
> =
  | ((
      ...args: any[]
    ) => ISubscriptionResolverObject<Result, Parent, TContext, Args>)
  | ISubscriptionResolverObject<Result, Parent, TContext, Args>;

export type TypeResolveFn<Types, Parent = {}, TContext = {}> = (
  parent: Parent,
  context: TContext,
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
  export interface Resolvers<TContext = any, TypeParent = {}> {
    settings?: SettingsResolver<any, TypeParent, TContext>;

    schematicCollections?: SchematicCollectionsResolver<
      any[],
      TypeParent,
      TContext
    >;

    workspace?: WorkspaceResolver<any, TypeParent, TContext>;

    editors?: EditorsResolver<any[], TypeParent, TContext>;

    availableExtensions?: AvailableExtensionsResolver<
      any[],
      TypeParent,
      TContext
    >;

    installNodeJsStatus?: InstallNodeJsStatusResolver<
      Maybe<any>,
      TypeParent,
      TContext
    >;

    isNodejsInstalled?: IsNodejsInstalledResolver<
      Maybe<any>,
      TypeParent,
      TContext
    >;

    directory?: DirectoryResolver<any, TypeParent, TContext>;

    commands?: CommandsResolver<any[], TypeParent, TContext>;
  }

  export type SettingsResolver<R = any, Parent = {}, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type SchematicCollectionsResolver<
    R = any[],
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type WorkspaceResolver<
    R = any,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, WorkspaceArgs>;
  export interface WorkspaceArgs {
    path: string;
  }

  export type EditorsResolver<
    R = any[],
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type AvailableExtensionsResolver<
    R = any[],
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, AvailableExtensionsArgs>;
  export interface AvailableExtensionsArgs {
    name?: Maybe<string>;
  }

  export type InstallNodeJsStatusResolver<
    R = Maybe<any>,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type IsNodejsInstalledResolver<
    R = Maybe<any>,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type DirectoryResolver<
    R = any,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, DirectoryArgs>;
  export interface DirectoryArgs {
    path?: Maybe<string>;

    onlyDirectories?: Maybe<boolean>;

    showHidden?: Maybe<boolean>;
  }

  export type CommandsResolver<
    R = any[],
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, CommandsArgs>;
  export interface CommandsArgs {
    id?: Maybe<string>;

    cols?: Maybe<number>;
  }
}

export namespace SettingsResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    canCollectData?: CanCollectDataResolver<boolean, TypeParent, TContext>;

    isConnectUser?: IsConnectUserResolver<Maybe<boolean>, TypeParent, TContext>;

    disableAnimations?: DisableAnimationsResolver<
      Maybe<boolean>,
      TypeParent,
      TContext
    >;

    showSupportPlugin?: ShowSupportPluginResolver<
      Maybe<boolean>,
      TypeParent,
      TContext
    >;

    installNodeManually?: InstallNodeManuallyResolver<
      Maybe<boolean>,
      TypeParent,
      TContext
    >;

    enableDetailedStatus?: EnableDetailedStatusResolver<
      Maybe<boolean>,
      TypeParent,
      TContext
    >;

    channel?: ChannelResolver<Maybe<string>, TypeParent, TContext>;

    workspaceSchematicsDirectory?: WorkspaceSchematicsDirectoryResolver<
      Maybe<string>,
      TypeParent,
      TContext
    >;

    workspaceSchematicsNpmScript?: WorkspaceSchematicsNpmScriptResolver<
      Maybe<string>,
      TypeParent,
      TContext
    >;

    recent?: RecentResolver<any[], TypeParent, TContext>;

    isWsl?: IsWslResolver<Maybe<boolean>, TypeParent, TContext>;

    useNvm?: UseNvmResolver<Maybe<boolean>, TypeParent, TContext>;
  }

  export type CanCollectDataResolver<
    R = boolean,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type IsConnectUserResolver<
    R = Maybe<boolean>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type DisableAnimationsResolver<
    R = Maybe<boolean>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type ShowSupportPluginResolver<
    R = Maybe<boolean>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type InstallNodeManuallyResolver<
    R = Maybe<boolean>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type EnableDetailedStatusResolver<
    R = Maybe<boolean>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type ChannelResolver<
    R = Maybe<string>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type WorkspaceSchematicsDirectoryResolver<
    R = Maybe<string>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type WorkspaceSchematicsNpmScriptResolver<
    R = Maybe<string>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type RecentResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type IsWslResolver<
    R = Maybe<boolean>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type UseNvmResolver<
    R = Maybe<boolean>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace WorkspaceDefinitionResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    path?: PathResolver<string, TypeParent, TContext>;

    name?: NameResolver<string, TypeParent, TContext>;

    favorite?: FavoriteResolver<Maybe<boolean>, TypeParent, TContext>;

    pinnedProjectNames?: PinnedProjectNamesResolver<
      string[],
      TypeParent,
      TContext
    >;
  }

  export type PathResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type NameResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type FavoriteResolver<
    R = Maybe<boolean>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type PinnedProjectNamesResolver<
    R = string[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace SchematicCollectionForNgNewResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, TContext>;

    description?: DescriptionResolver<string, TypeParent, TContext>;

    schema?: SchemaResolver<any[], TypeParent, TContext>;
  }

  export type NameResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type DescriptionResolver<
    R = string,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type SchemaResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace SchemaResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, TContext>;

    type?: TypeResolver<string, TypeParent, TContext>;

    description?: DescriptionResolver<string, TypeParent, TContext>;

    defaultValue?: DefaultValueResolver<Maybe<string>, TypeParent, TContext>;

    important?: ImportantResolver<Maybe<boolean>, TypeParent, TContext>;

    completion?: CompletionResolver<Maybe<string>, TypeParent, TContext>;

    required?: RequiredResolver<boolean, TypeParent, TContext>;

    positional?: PositionalResolver<boolean, TypeParent, TContext>;

    enum?: EnumResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type NameResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type TypeResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type DescriptionResolver<
    R = string,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type DefaultValueResolver<
    R = Maybe<string>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type ImportantResolver<
    R = Maybe<boolean>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type CompletionResolver<
    R = Maybe<string>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type RequiredResolver<
    R = boolean,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type PositionalResolver<
    R = boolean,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type EnumResolver<
    R = Maybe<string[]>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace WorkspaceResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, TContext>;

    path?: PathResolver<string, TypeParent, TContext>;

    dependencies?: DependenciesResolver<any[], TypeParent, TContext>;

    extensions?: ExtensionsResolver<any[], TypeParent, TContext>;

    schematicCollections?: SchematicCollectionsResolver<
      any[],
      TypeParent,
      TContext
    >;

    npmScripts?: NpmScriptsResolver<any[], TypeParent, TContext>;

    projects?: ProjectsResolver<any[], TypeParent, TContext>;

    docs?: DocsResolver<any, TypeParent, TContext>;

    completions?: CompletionsResolver<Maybe<any>, TypeParent, TContext>;
  }

  export type NameResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type PathResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type DependenciesResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type ExtensionsResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type SchematicCollectionsResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext, SchematicCollectionsArgs>;
  export interface SchematicCollectionsArgs {
    name?: Maybe<string>;
  }

  export type NpmScriptsResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext, NpmScriptsArgs>;
  export interface NpmScriptsArgs {
    name?: Maybe<string>;
  }

  export type ProjectsResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext, ProjectsArgs>;
  export interface ProjectsArgs {
    name?: Maybe<string>;
  }

  export type DocsResolver<R = any, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type CompletionsResolver<
    R = Maybe<any>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace DependenciesResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, TContext>;

    version?: VersionResolver<string, TypeParent, TContext>;
  }

  export type NameResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type VersionResolver<
    R = string,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace ExtensionResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, TContext>;

    description?: DescriptionResolver<string, TypeParent, TContext>;

    detailedDescription?: DetailedDescriptionResolver<
      Maybe<string>,
      TypeParent,
      TContext
    >;

    installed?: InstalledResolver<Maybe<boolean>, TypeParent, TContext>;
  }

  export type NameResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type DescriptionResolver<
    R = string,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type DetailedDescriptionResolver<
    R = Maybe<string>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type InstalledResolver<
    R = Maybe<boolean>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace SchematicCollectionResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, TContext>;

    schematics?: SchematicsResolver<any[], TypeParent, TContext>;
  }

  export type NameResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type SchematicsResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext, SchematicsArgs>;
  export interface SchematicsArgs {
    name?: Maybe<string>;
  }
}

export namespace SchematicResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    collection?: CollectionResolver<string, TypeParent, TContext>;

    name?: NameResolver<string, TypeParent, TContext>;

    description?: DescriptionResolver<string, TypeParent, TContext>;

    npmClient?: NpmClientResolver<Maybe<string>, TypeParent, TContext>;

    npmScript?: NpmScriptResolver<Maybe<string>, TypeParent, TContext>;

    schema?: SchemaResolver<any[], TypeParent, TContext>;
  }

  export type CollectionResolver<
    R = string,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type NameResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type DescriptionResolver<
    R = string,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type NpmClientResolver<
    R = Maybe<string>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type NpmScriptResolver<
    R = Maybe<string>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type SchemaResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace NpmScriptResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, TContext>;

    npmClient?: NpmClientResolver<Maybe<string>, TypeParent, TContext>;

    schema?: SchemaResolver<any[], TypeParent, TContext>;
  }

  export type NameResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type NpmClientResolver<
    R = Maybe<string>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type SchemaResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace ProjectResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, TContext>;

    root?: RootResolver<string, TypeParent, TContext>;

    projectType?: ProjectTypeResolver<string, TypeParent, TContext>;

    architect?: ArchitectResolver<any[], TypeParent, TContext>;

    recentActions?: RecentActionsResolver<any[], TypeParent, TContext>;
  }

  export type NameResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type RootResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type ProjectTypeResolver<
    R = string,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type ArchitectResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext, ArchitectArgs>;
  export interface ArchitectArgs {
    name?: Maybe<string>;
  }

  export type RecentActionsResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace ArchitectResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, TContext>;

    project?: ProjectResolver<string, TypeParent, TContext>;

    builder?: BuilderResolver<string, TypeParent, TContext>;

    description?: DescriptionResolver<string, TypeParent, TContext>;

    options?: OptionsResolver<any, TypeParent, TContext>;

    configurations?: ConfigurationsResolver<any[], TypeParent, TContext>;

    schema?: SchemaResolver<any[], TypeParent, TContext>;
  }

  export type NameResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type ProjectResolver<
    R = string,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type BuilderResolver<
    R = string,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type DescriptionResolver<
    R = string,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type OptionsResolver<R = any, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type ConfigurationsResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type SchemaResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace OptionsResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    defaultValues?: DefaultValuesResolver<any[], TypeParent, TContext>;
  }

  export type DefaultValuesResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace FieldValueResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, TContext>;

    defaultValue?: DefaultValueResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type NameResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type DefaultValueResolver<
    R = Maybe<string>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace ArchitectConfigurationsResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, TContext>;

    defaultValues?: DefaultValuesResolver<any[], TypeParent, TContext>;
  }

  export type NameResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type DefaultValuesResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace RecentActionResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    actionName?: ActionNameResolver<string, TypeParent, TContext>;

    schematicName?: SchematicNameResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type ActionNameResolver<
    R = string,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type SchematicNameResolver<
    R = Maybe<string>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace DocsResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    workspaceDocs?: WorkspaceDocsResolver<any[], TypeParent, TContext>;

    schematicDocs?: SchematicDocsResolver<any[], TypeParent, TContext>;
  }

  export type WorkspaceDocsResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type SchematicDocsResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext, SchematicDocsArgs>;
  export interface SchematicDocsArgs {
    collectionName: string;

    collectionVersion?: Maybe<string>;

    name: string;
  }
}

export namespace DocResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    prop?: PropResolver<Maybe<string>, TypeParent, TContext>;

    description?: DescriptionResolver<Maybe<string>, TypeParent, TContext>;

    id?: IdResolver<string, TypeParent, TContext>;
  }

  export type PropResolver<
    R = Maybe<string>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type DescriptionResolver<
    R = Maybe<string>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type IdResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
}

export namespace CompletionsTypesResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    files?: FilesResolver<any[], TypeParent, TContext>;

    projects?: ProjectsResolver<any[], TypeParent, TContext>;

    localModules?: LocalModulesResolver<any[], TypeParent, TContext>;

    absoluteModules?: AbsoluteModulesResolver<any[], TypeParent, TContext>;
  }

  export type FilesResolver<R = any[], Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext,
    FilesArgs
  >;
  export interface FilesArgs {
    input: string;
  }

  export type ProjectsResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext, ProjectsArgs>;
  export interface ProjectsArgs {
    input: string;
  }

  export type LocalModulesResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext, LocalModulesArgs>;
  export interface LocalModulesArgs {
    input: string;
  }

  export type AbsoluteModulesResolver<
    R = any[],
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext, AbsoluteModulesArgs>;
  export interface AbsoluteModulesArgs {
    input: string;
  }
}

export namespace CompletionResultTypeResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    value?: ValueResolver<string, TypeParent, TContext>;

    display?: DisplayResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type ValueResolver<
    R = string,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type DisplayResolver<
    R = Maybe<string>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace EditorSupportResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, TContext>;

    icon?: IconResolver<string, TypeParent, TContext>;
  }

  export type NameResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type IconResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
}

export namespace InstallNodeJsStatusResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    downloadPercentage?: DownloadPercentageResolver<
      Maybe<number>,
      TypeParent,
      TContext
    >;

    downloadSpeed?: DownloadSpeedResolver<Maybe<number>, TypeParent, TContext>;

    success?: SuccessResolver<Maybe<boolean>, TypeParent, TContext>;

    cancelled?: CancelledResolver<Maybe<boolean>, TypeParent, TContext>;

    error?: ErrorResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type DownloadPercentageResolver<
    R = Maybe<number>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type DownloadSpeedResolver<
    R = Maybe<number>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type SuccessResolver<
    R = Maybe<boolean>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type CancelledResolver<
    R = Maybe<boolean>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type ErrorResolver<
    R = Maybe<string>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace IsNodeInstalledResultResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    result?: ResultResolver<boolean, TypeParent, TContext>;
  }

  export type ResultResolver<
    R = boolean,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace FilesTypeResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    path?: PathResolver<string, TypeParent, TContext>;

    exists?: ExistsResolver<boolean, TypeParent, TContext>;

    files?: FilesResolver<any[], TypeParent, TContext>;
  }

  export type PathResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type ExistsResolver<
    R = boolean,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type FilesResolver<R = any[], Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
}

export namespace FileListTypeResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    name?: NameResolver<string, TypeParent, TContext>;

    type?: TypeResolver<FileType, TypeParent, TContext>;
  }

  export type NameResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type TypeResolver<
    R = FileType,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace CommandResponseResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    id?: IdResolver<string, TypeParent, TContext>;

    workspace?: WorkspaceResolver<Maybe<string>, TypeParent, TContext>;

    command?: CommandResolver<string, TypeParent, TContext>;

    status?: StatusResolver<string, TypeParent, TContext>;

    detailedStatus?: DetailedStatusResolver<
      Maybe<string>,
      TypeParent,
      TContext
    >;

    outChunk?: OutChunkResolver<string, TypeParent, TContext>;

    out?: OutResolver<string, TypeParent, TContext>;
  }

  export type IdResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type WorkspaceResolver<
    R = Maybe<string>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type CommandResolver<
    R = string,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type StatusResolver<
    R = string,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type DetailedStatusResolver<
    R = Maybe<string>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type OutChunkResolver<
    R = string,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type OutResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
}

export namespace MutationResolvers {
  export interface Resolvers<TContext = any, TypeParent = {}> {
    ngAdd?: NgAddResolver<Maybe<any>, TypeParent, TContext>;

    ngNew?: NgNewResolver<Maybe<any>, TypeParent, TContext>;

    generate?: GenerateResolver<Maybe<any>, TypeParent, TContext>;

    generateUsingNpm?: GenerateUsingNpmResolver<
      Maybe<any>,
      TypeParent,
      TContext
    >;

    runNg?: RunNgResolver<Maybe<any>, TypeParent, TContext>;

    runNpm?: RunNpmResolver<Maybe<any>, TypeParent, TContext>;

    stopCommand?: StopCommandResolver<Maybe<any>, TypeParent, TContext>;

    removeCommand?: RemoveCommandResolver<Maybe<any>, TypeParent, TContext>;

    removeAllCommands?: RemoveAllCommandsResolver<
      Maybe<any>,
      TypeParent,
      TContext
    >;

    restartCommand?: RestartCommandResolver<Maybe<any>, TypeParent, TContext>;

    openInEditor?: OpenInEditorResolver<Maybe<any>, TypeParent, TContext>;

    updateSettings?: UpdateSettingsResolver<any, TypeParent, TContext>;

    saveRecentAction?: SaveRecentActionResolver<any[], TypeParent, TContext>;

    installNodeJs?: InstallNodeJsResolver<Maybe<any>, TypeParent, TContext>;

    openInBrowser?: OpenInBrowserResolver<Maybe<any>, TypeParent, TContext>;

    selectDirectory?: SelectDirectoryResolver<Maybe<any>, TypeParent, TContext>;

    showItemInFolder?: ShowItemInFolderResolver<
      Maybe<any>,
      TypeParent,
      TContext
    >;

    openDoc?: OpenDocResolver<Maybe<any>, TypeParent, TContext>;
  }

  export type NgAddResolver<
    R = Maybe<any>,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, NgAddArgs>;
  export interface NgAddArgs {
    path: string;

    name: string;
  }

  export type NgNewResolver<
    R = Maybe<any>,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, NgNewArgs>;
  export interface NgNewArgs {
    path: string;

    name: string;

    collection: string;

    newCommand: string[];
  }

  export type GenerateResolver<
    R = Maybe<any>,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, GenerateArgs>;
  export interface GenerateArgs {
    path: string;

    genCommand: string[];

    dryRun: boolean;
  }

  export type GenerateUsingNpmResolver<
    R = Maybe<any>,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, GenerateUsingNpmArgs>;
  export interface GenerateUsingNpmArgs {
    path: string;

    npmClient?: Maybe<string>;

    genCommand: string[];

    dryRun: boolean;
  }

  export type RunNgResolver<
    R = Maybe<any>,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, RunNgArgs>;
  export interface RunNgArgs {
    path: string;

    runCommand: string[];
  }

  export type RunNpmResolver<
    R = Maybe<any>,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, RunNpmArgs>;
  export interface RunNpmArgs {
    path: string;

    npmClient?: Maybe<string>;

    runCommand: string[];
  }

  export type StopCommandResolver<
    R = Maybe<any>,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, StopCommandArgs>;
  export interface StopCommandArgs {
    id: string;
  }

  export type RemoveCommandResolver<
    R = Maybe<any>,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, RemoveCommandArgs>;
  export interface RemoveCommandArgs {
    id: string;
  }

  export type RemoveAllCommandsResolver<
    R = Maybe<any>,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type RestartCommandResolver<
    R = Maybe<any>,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, RestartCommandArgs>;
  export interface RestartCommandArgs {
    id: string;
  }

  export type OpenInEditorResolver<
    R = Maybe<any>,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, OpenInEditorArgs>;
  export interface OpenInEditorArgs {
    editor: string;

    path: string;
  }

  export type UpdateSettingsResolver<
    R = any,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, UpdateSettingsArgs>;
  export interface UpdateSettingsArgs {
    data: string;
  }

  export type SaveRecentActionResolver<
    R = any[],
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, SaveRecentActionArgs>;
  export interface SaveRecentActionArgs {
    workspacePath: string;

    projectName: string;

    actionName: string;

    schematicName?: Maybe<string>;
  }

  export type InstallNodeJsResolver<
    R = Maybe<any>,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type OpenInBrowserResolver<
    R = Maybe<any>,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, OpenInBrowserArgs>;
  export interface OpenInBrowserArgs {
    url: string;
  }

  export type SelectDirectoryResolver<
    R = Maybe<any>,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, SelectDirectoryArgs>;
  export interface SelectDirectoryArgs {
    dialogTitle: string;

    dialogButtonLabel: string;

    angularWorkspace: boolean;
  }

  export type ShowItemInFolderResolver<
    R = Maybe<any>,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, ShowItemInFolderArgs>;
  export interface ShowItemInFolderArgs {
    item: string;
  }

  export type OpenDocResolver<
    R = Maybe<any>,
    Parent = {},
    TContext = any
  > = Resolver<R, Parent, TContext, OpenDocArgs>;
  export interface OpenDocArgs {
    id: string;
  }
}

export namespace CommandStartedResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    id?: IdResolver<string, TypeParent, TContext>;
  }

  export type IdResolver<R = string, Parent = any, TContext = any> = Resolver<
    R,
    Parent,
    TContext
  >;
}

export namespace StopResultResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    result?: ResultResolver<Maybe<boolean>, TypeParent, TContext>;
  }

  export type ResultResolver<
    R = Maybe<boolean>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace RemoveResultResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    result?: ResultResolver<Maybe<boolean>, TypeParent, TContext>;
  }

  export type ResultResolver<
    R = Maybe<boolean>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace OpenInEditorResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    response?: ResponseResolver<string, TypeParent, TContext>;
  }

  export type ResponseResolver<
    R = string,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace OpenInBrowserResultResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    result?: ResultResolver<boolean, TypeParent, TContext>;
  }

  export type ResultResolver<
    R = boolean,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace SelectDirectoryResultResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    selectedDirectoryPath?: SelectedDirectoryPathResolver<
      Maybe<string>,
      TypeParent,
      TContext
    >;

    error?: ErrorResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type SelectedDirectoryPathResolver<
    R = Maybe<string>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
  export type ErrorResolver<
    R = Maybe<string>,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace ShowItemInFolderResultResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    result?: ResultResolver<boolean, TypeParent, TContext>;
  }

  export type ResultResolver<
    R = boolean,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
}

export namespace OpenDocResultResolvers {
  export interface Resolvers<TContext = any, TypeParent = any> {
    result?: ResultResolver<boolean, TypeParent, TContext>;
  }

  export type ResultResolver<
    R = boolean,
    Parent = any,
    TContext = any
  > = Resolver<R, Parent, TContext>;
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

export type IResolvers<TContext = any> = {
  Query?: QueryResolvers.Resolvers<TContext>;
  Settings?: SettingsResolvers.Resolvers<TContext>;
  WorkspaceDefinition?: WorkspaceDefinitionResolvers.Resolvers<TContext>;
  SchematicCollectionForNgNew?: SchematicCollectionForNgNewResolvers.Resolvers<
    TContext
  >;
  Schema?: SchemaResolvers.Resolvers<TContext>;
  Workspace?: WorkspaceResolvers.Resolvers<TContext>;
  Dependencies?: DependenciesResolvers.Resolvers<TContext>;
  Extension?: ExtensionResolvers.Resolvers<TContext>;
  SchematicCollection?: SchematicCollectionResolvers.Resolvers<TContext>;
  Schematic?: SchematicResolvers.Resolvers<TContext>;
  NpmScript?: NpmScriptResolvers.Resolvers<TContext>;
  Project?: ProjectResolvers.Resolvers<TContext>;
  Architect?: ArchitectResolvers.Resolvers<TContext>;
  Options?: OptionsResolvers.Resolvers<TContext>;
  FieldValue?: FieldValueResolvers.Resolvers<TContext>;
  ArchitectConfigurations?: ArchitectConfigurationsResolvers.Resolvers<
    TContext
  >;
  RecentAction?: RecentActionResolvers.Resolvers<TContext>;
  Docs?: DocsResolvers.Resolvers<TContext>;
  Doc?: DocResolvers.Resolvers<TContext>;
  CompletionsTypes?: CompletionsTypesResolvers.Resolvers<TContext>;
  CompletionResultType?: CompletionResultTypeResolvers.Resolvers<TContext>;
  EditorSupport?: EditorSupportResolvers.Resolvers<TContext>;
  InstallNodeJsStatus?: InstallNodeJsStatusResolvers.Resolvers<TContext>;
  IsNodeInstalledResult?: IsNodeInstalledResultResolvers.Resolvers<TContext>;
  FilesType?: FilesTypeResolvers.Resolvers<TContext>;
  FileListType?: FileListTypeResolvers.Resolvers<TContext>;
  CommandResponse?: CommandResponseResolvers.Resolvers<TContext>;
  Mutation?: MutationResolvers.Resolvers<TContext>;
  CommandStarted?: CommandStartedResolvers.Resolvers<TContext>;
  StopResult?: StopResultResolvers.Resolvers<TContext>;
  RemoveResult?: RemoveResultResolvers.Resolvers<TContext>;
  OpenInEditor?: OpenInEditorResolvers.Resolvers<TContext>;
  OpenInBrowserResult?: OpenInBrowserResultResolvers.Resolvers<TContext>;
  SelectDirectoryResult?: SelectDirectoryResultResolvers.Resolvers<TContext>;
  ShowItemInFolderResult?: ShowItemInFolderResultResolvers.Resolvers<TContext>;
  OpenDocResult?: OpenDocResultResolvers.Resolvers<TContext>;
} & { [typeName: string]: never };

export type IDirectiveResolvers<Result> = {
  skip?: SkipDirectiveResolver<Result>;
  include?: IncludeDirectiveResolver<Result>;
  deprecated?: DeprecatedDirectiveResolver<Result>;
} & { [directiveName: string]: never };
