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

export namespace DatabaseResolvers {
  export interface Resolvers<Context = {}, TypeParent = {}> {
    settings?: SettingsResolver<Settings, TypeParent, Context>;

    schematicCollections?: SchematicCollectionsResolver<
      (SchematicCollectionForNgNew | null)[] | null,
      TypeParent,
      Context
    >;

    workspace?: WorkspaceResolver<Workspace, TypeParent, Context>;

    editors?: EditorsResolver<EditorSupport[], TypeParent, Context>;

    availableExtensions?: AvailableExtensionsResolver<
      (Extension | null)[] | null,
      TypeParent,
      Context
    >;

    installNodeJsStatus?: InstallNodeJsStatusResolver<
      InstallNodeJsStatus | null,
      TypeParent,
      Context
    >;

    isNodejsInstalled?: IsNodejsInstalledResolver<
      IsNodeInstalledResult | null,
      TypeParent,
      Context
    >;

    directory?: DirectoryResolver<FilesType, TypeParent, Context>;

    commands?: CommandsResolver<
      (CommandResponse | null)[] | null,
      TypeParent,
      Context
    >;
  }

  export type SettingsResolver<
    R = Settings,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type SchematicCollectionsResolver<
    R = (SchematicCollectionForNgNew | null)[] | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type WorkspaceResolver<
    R = Workspace,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context, WorkspaceArgs>;
  export interface WorkspaceArgs {
    path: string;
  }

  export type EditorsResolver<
    R = EditorSupport[],
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type AvailableExtensionsResolver<
    R = (Extension | null)[] | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context, AvailableExtensionsArgs>;
  export interface AvailableExtensionsArgs {
    name?: string | null;
  }

  export type InstallNodeJsStatusResolver<
    R = InstallNodeJsStatus | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type IsNodejsInstalledResolver<
    R = IsNodeInstalledResult | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type DirectoryResolver<
    R = FilesType,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context, DirectoryArgs>;
  export interface DirectoryArgs {
    path?: string | null;

    onlyDirectories?: boolean | null;

    showHidden?: boolean | null;
  }

  export type CommandsResolver<
    R = (CommandResponse | null)[] | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context, CommandsArgs>;
  export interface CommandsArgs {
    id?: string | null;
  }
}

export namespace SettingsResolvers {
  export interface Resolvers<Context = {}, TypeParent = Settings> {
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

    recent?: RecentResolver<
      (WorkspaceDefinition | null)[] | null,
      TypeParent,
      Context
    >;
  }

  export type CanCollectDataResolver<
    R = boolean,
    Parent = Settings,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type ShowSupportPluginResolver<
    R = boolean | null,
    Parent = Settings,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type InstallNodeManuallyResolver<
    R = boolean | null,
    Parent = Settings,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type EnableDetailedStatusResolver<
    R = boolean | null,
    Parent = Settings,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type RecentResolver<
    R = (WorkspaceDefinition | null)[] | null,
    Parent = Settings,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace WorkspaceDefinitionResolvers {
  export interface Resolvers<Context = {}, TypeParent = WorkspaceDefinition> {
    path?: PathResolver<string, TypeParent, Context>;

    name?: NameResolver<string, TypeParent, Context>;

    favorite?: FavoriteResolver<boolean | null, TypeParent, Context>;
  }

  export type PathResolver<
    R = string,
    Parent = WorkspaceDefinition,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = string,
    Parent = WorkspaceDefinition,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type FavoriteResolver<
    R = boolean | null,
    Parent = WorkspaceDefinition,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace SchematicCollectionForNgNewResolvers {
  export interface Resolvers<
    Context = {},
    TypeParent = SchematicCollectionForNgNew
  > {
    name?: NameResolver<string, TypeParent, Context>;

    description?: DescriptionResolver<string, TypeParent, Context>;
  }

  export type NameResolver<
    R = string,
    Parent = SchematicCollectionForNgNew,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type DescriptionResolver<
    R = string,
    Parent = SchematicCollectionForNgNew,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace WorkspaceResolvers {
  export interface Resolvers<Context = {}, TypeParent = Workspace> {
    name?: NameResolver<string, TypeParent, Context>;

    path?: PathResolver<string, TypeParent, Context>;

    dependencies?: DependenciesResolver<
      (Dependencies | null)[] | null,
      TypeParent,
      Context
    >;

    extensions?: ExtensionsResolver<
      (Extension | null)[] | null,
      TypeParent,
      Context
    >;

    schematicCollections?: SchematicCollectionsResolver<
      (SchematicCollection | null)[] | null,
      TypeParent,
      Context
    >;

    npmScripts?: NpmScriptsResolver<
      (NpmScript | null)[] | null,
      TypeParent,
      Context
    >;

    projects?: ProjectsResolver<(Project | null)[] | null, TypeParent, Context>;

    docs?: DocsResolver<Docs, TypeParent, Context>;

    completions?: CompletionsResolver<
      CompletionsTypes | null,
      TypeParent,
      Context
    >;
  }

  export type NameResolver<
    R = string,
    Parent = Workspace,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type PathResolver<
    R = string,
    Parent = Workspace,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type DependenciesResolver<
    R = (Dependencies | null)[] | null,
    Parent = Workspace,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type ExtensionsResolver<
    R = (Extension | null)[] | null,
    Parent = Workspace,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type SchematicCollectionsResolver<
    R = (SchematicCollection | null)[] | null,
    Parent = Workspace,
    Context = {}
  > = Resolver<R, Parent, Context, SchematicCollectionsArgs>;
  export interface SchematicCollectionsArgs {
    name?: string | null;
  }

  export type NpmScriptsResolver<
    R = (NpmScript | null)[] | null,
    Parent = Workspace,
    Context = {}
  > = Resolver<R, Parent, Context, NpmScriptsArgs>;
  export interface NpmScriptsArgs {
    name?: string | null;
  }

  export type ProjectsResolver<
    R = (Project | null)[] | null,
    Parent = Workspace,
    Context = {}
  > = Resolver<R, Parent, Context, ProjectsArgs>;
  export interface ProjectsArgs {
    name?: string | null;
  }

  export type DocsResolver<
    R = Docs,
    Parent = Workspace,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type CompletionsResolver<
    R = CompletionsTypes | null,
    Parent = Workspace,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace DependenciesResolvers {
  export interface Resolvers<Context = {}, TypeParent = Dependencies> {
    name?: NameResolver<string, TypeParent, Context>;

    version?: VersionResolver<string, TypeParent, Context>;
  }

  export type NameResolver<
    R = string,
    Parent = Dependencies,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type VersionResolver<
    R = string,
    Parent = Dependencies,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace ExtensionResolvers {
  export interface Resolvers<Context = {}, TypeParent = Extension> {
    name?: NameResolver<string, TypeParent, Context>;

    description?: DescriptionResolver<string | null, TypeParent, Context>;

    detailedDescription?: DetailedDescriptionResolver<
      string | null,
      TypeParent,
      Context
    >;
  }

  export type NameResolver<
    R = string,
    Parent = Extension,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type DescriptionResolver<
    R = string | null,
    Parent = Extension,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type DetailedDescriptionResolver<
    R = string | null,
    Parent = Extension,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace SchematicCollectionResolvers {
  export interface Resolvers<Context = {}, TypeParent = SchematicCollection> {
    name?: NameResolver<string, TypeParent, Context>;

    schematics?: SchematicsResolver<
      (Schematic | null)[] | null,
      TypeParent,
      Context
    >;
  }

  export type NameResolver<
    R = string,
    Parent = SchematicCollection,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type SchematicsResolver<
    R = (Schematic | null)[] | null,
    Parent = SchematicCollection,
    Context = {}
  > = Resolver<R, Parent, Context, SchematicsArgs>;
  export interface SchematicsArgs {
    name?: string | null;
  }
}

export namespace SchematicResolvers {
  export interface Resolvers<Context = {}, TypeParent = Schematic> {
    collection?: CollectionResolver<string, TypeParent, Context>;

    name?: NameResolver<string, TypeParent, Context>;

    description?: DescriptionResolver<string | null, TypeParent, Context>;

    schema?: SchemaResolver<
      (SchematicSchema | null)[] | null,
      TypeParent,
      Context
    >;
  }

  export type CollectionResolver<
    R = string,
    Parent = Schematic,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = string,
    Parent = Schematic,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type DescriptionResolver<
    R = string | null,
    Parent = Schematic,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type SchemaResolver<
    R = (SchematicSchema | null)[] | null,
    Parent = Schematic,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace SchematicSchemaResolvers {
  export interface Resolvers<Context = {}, TypeParent = SchematicSchema> {
    name?: NameResolver<string, TypeParent, Context>;

    type?: TypeResolver<string, TypeParent, Context>;

    description?: DescriptionResolver<string | null, TypeParent, Context>;

    defaultValue?: DefaultValueResolver<string | null, TypeParent, Context>;

    required?: RequiredResolver<boolean, TypeParent, Context>;

    positional?: PositionalResolver<boolean, TypeParent, Context>;

    enum?: EnumResolver<(string | null)[] | null, TypeParent, Context>;
  }

  export type NameResolver<
    R = string,
    Parent = SchematicSchema,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type TypeResolver<
    R = string,
    Parent = SchematicSchema,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type DescriptionResolver<
    R = string | null,
    Parent = SchematicSchema,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type DefaultValueResolver<
    R = string | null,
    Parent = SchematicSchema,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type RequiredResolver<
    R = boolean,
    Parent = SchematicSchema,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type PositionalResolver<
    R = boolean,
    Parent = SchematicSchema,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type EnumResolver<
    R = (string | null)[] | null,
    Parent = SchematicSchema,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace NpmScriptResolvers {
  export interface Resolvers<Context = {}, TypeParent = NpmScript> {
    name?: NameResolver<string, TypeParent, Context>;

    npmClient?: NpmClientResolver<string, TypeParent, Context>;

    schema?: SchemaResolver<
      (ArchitectSchema | null)[] | null,
      TypeParent,
      Context
    >;
  }

  export type NameResolver<
    R = string,
    Parent = NpmScript,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type NpmClientResolver<
    R = string,
    Parent = NpmScript,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type SchemaResolver<
    R = (ArchitectSchema | null)[] | null,
    Parent = NpmScript,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace ArchitectSchemaResolvers {
  export interface Resolvers<Context = {}, TypeParent = ArchitectSchema> {
    name?: NameResolver<string, TypeParent, Context>;

    type?: TypeResolver<string, TypeParent, Context>;

    description?: DescriptionResolver<string | null, TypeParent, Context>;

    defaultValue?: DefaultValueResolver<string | null, TypeParent, Context>;

    required?: RequiredResolver<boolean, TypeParent, Context>;

    positional?: PositionalResolver<boolean, TypeParent, Context>;

    enum?: EnumResolver<(string | null)[] | null, TypeParent, Context>;
  }

  export type NameResolver<
    R = string,
    Parent = ArchitectSchema,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type TypeResolver<
    R = string,
    Parent = ArchitectSchema,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type DescriptionResolver<
    R = string | null,
    Parent = ArchitectSchema,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type DefaultValueResolver<
    R = string | null,
    Parent = ArchitectSchema,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type RequiredResolver<
    R = boolean,
    Parent = ArchitectSchema,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type PositionalResolver<
    R = boolean,
    Parent = ArchitectSchema,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type EnumResolver<
    R = (string | null)[] | null,
    Parent = ArchitectSchema,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace ProjectResolvers {
  export interface Resolvers<Context = {}, TypeParent = Project> {
    name?: NameResolver<string, TypeParent, Context>;

    root?: RootResolver<string, TypeParent, Context>;

    projectType?: ProjectTypeResolver<string, TypeParent, Context>;

    architect?: ArchitectResolver<
      (Architect | null)[] | null,
      TypeParent,
      Context
    >;
  }

  export type NameResolver<
    R = string,
    Parent = Project,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type RootResolver<
    R = string,
    Parent = Project,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type ProjectTypeResolver<
    R = string,
    Parent = Project,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type ArchitectResolver<
    R = (Architect | null)[] | null,
    Parent = Project,
    Context = {}
  > = Resolver<R, Parent, Context, ArchitectArgs>;
  export interface ArchitectArgs {
    name?: string | null;
  }
}

export namespace ArchitectResolvers {
  export interface Resolvers<Context = {}, TypeParent = Architect> {
    name?: NameResolver<string, TypeParent, Context>;

    project?: ProjectResolver<string, TypeParent, Context>;

    builder?: BuilderResolver<string, TypeParent, Context>;

    configurations?: ConfigurationsResolver<
      (ArchitectConfigurations | null)[] | null,
      TypeParent,
      Context
    >;

    schema?: SchemaResolver<
      (ArchitectSchema | null)[] | null,
      TypeParent,
      Context
    >;
  }

  export type NameResolver<
    R = string,
    Parent = Architect,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type ProjectResolver<
    R = string,
    Parent = Architect,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type BuilderResolver<
    R = string,
    Parent = Architect,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type ConfigurationsResolver<
    R = (ArchitectConfigurations | null)[] | null,
    Parent = Architect,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type SchemaResolver<
    R = (ArchitectSchema | null)[] | null,
    Parent = Architect,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace ArchitectConfigurationsResolvers {
  export interface Resolvers<
    Context = {},
    TypeParent = ArchitectConfigurations
  > {
    name?: NameResolver<string, TypeParent, Context>;
  }

  export type NameResolver<
    R = string,
    Parent = ArchitectConfigurations,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace DocsResolvers {
  export interface Resolvers<Context = {}, TypeParent = Docs> {
    workspaceDocs?: WorkspaceDocsResolver<Doc[], TypeParent, Context>;

    schematicDocs?: SchematicDocsResolver<Doc[], TypeParent, Context>;
  }

  export type WorkspaceDocsResolver<
    R = Doc[],
    Parent = Docs,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type SchematicDocsResolver<
    R = Doc[],
    Parent = Docs,
    Context = {}
  > = Resolver<R, Parent, Context, SchematicDocsArgs>;
  export interface SchematicDocsArgs {
    collectionName: string;

    collectionVersion?: string | null;

    name: string;
  }
}

export namespace DocResolvers {
  export interface Resolvers<Context = {}, TypeParent = Doc> {
    prop?: PropResolver<string | null, TypeParent, Context>;

    description?: DescriptionResolver<string | null, TypeParent, Context>;

    id?: IdResolver<string, TypeParent, Context>;
  }

  export type PropResolver<
    R = string | null,
    Parent = Doc,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type DescriptionResolver<
    R = string | null,
    Parent = Doc,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type IdResolver<R = string, Parent = Doc, Context = {}> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace CompletionsTypesResolvers {
  export interface Resolvers<Context = {}, TypeParent = CompletionsTypes> {
    files?: FilesResolver<
      (CompletionResultType | null)[] | null,
      TypeParent,
      Context
    >;

    projects?: ProjectsResolver<
      (CompletionResultType | null)[] | null,
      TypeParent,
      Context
    >;

    localModules?: LocalModulesResolver<
      (CompletionResultType | null)[] | null,
      TypeParent,
      Context
    >;

    absoluteModules?: AbsoluteModulesResolver<
      (CompletionResultType | null)[] | null,
      TypeParent,
      Context
    >;
  }

  export type FilesResolver<
    R = (CompletionResultType | null)[] | null,
    Parent = CompletionsTypes,
    Context = {}
  > = Resolver<R, Parent, Context, FilesArgs>;
  export interface FilesArgs {
    input?: string | null;
  }

  export type ProjectsResolver<
    R = (CompletionResultType | null)[] | null,
    Parent = CompletionsTypes,
    Context = {}
  > = Resolver<R, Parent, Context, ProjectsArgs>;
  export interface ProjectsArgs {
    input?: string | null;
  }

  export type LocalModulesResolver<
    R = (CompletionResultType | null)[] | null,
    Parent = CompletionsTypes,
    Context = {}
  > = Resolver<R, Parent, Context, LocalModulesArgs>;
  export interface LocalModulesArgs {
    input?: string | null;
  }

  export type AbsoluteModulesResolver<
    R = (CompletionResultType | null)[] | null,
    Parent = CompletionsTypes,
    Context = {}
  > = Resolver<R, Parent, Context, AbsoluteModulesArgs>;
  export interface AbsoluteModulesArgs {
    input?: string | null;
  }
}

export namespace CompletionResultTypeResolvers {
  export interface Resolvers<Context = {}, TypeParent = CompletionResultType> {
    value?: ValueResolver<string, TypeParent, Context>;

    display?: DisplayResolver<string | null, TypeParent, Context>;
  }

  export type ValueResolver<
    R = string,
    Parent = CompletionResultType,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type DisplayResolver<
    R = string | null,
    Parent = CompletionResultType,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace EditorSupportResolvers {
  export interface Resolvers<Context = {}, TypeParent = EditorSupport> {
    name?: NameResolver<string, TypeParent, Context>;

    icon?: IconResolver<string, TypeParent, Context>;
  }

  export type NameResolver<
    R = string,
    Parent = EditorSupport,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type IconResolver<
    R = string,
    Parent = EditorSupport,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace InstallNodeJsStatusResolvers {
  export interface Resolvers<Context = {}, TypeParent = InstallNodeJsStatus> {
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
    Parent = InstallNodeJsStatus,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type DownloadSpeedResolver<
    R = number | null,
    Parent = InstallNodeJsStatus,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type SuccessResolver<
    R = boolean | null,
    Parent = InstallNodeJsStatus,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type CancelledResolver<
    R = boolean | null,
    Parent = InstallNodeJsStatus,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type ErrorResolver<
    R = string | null,
    Parent = InstallNodeJsStatus,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace IsNodeInstalledResultResolvers {
  export interface Resolvers<Context = {}, TypeParent = IsNodeInstalledResult> {
    result?: ResultResolver<boolean, TypeParent, Context>;
  }

  export type ResultResolver<
    R = boolean,
    Parent = IsNodeInstalledResult,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace FilesTypeResolvers {
  export interface Resolvers<Context = {}, TypeParent = FilesType> {
    path?: PathResolver<string, TypeParent, Context>;

    exists?: ExistsResolver<boolean, TypeParent, Context>;

    files?: FilesResolver<(FileListType | null)[] | null, TypeParent, Context>;
  }

  export type PathResolver<
    R = string,
    Parent = FilesType,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type ExistsResolver<
    R = boolean,
    Parent = FilesType,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type FilesResolver<
    R = (FileListType | null)[] | null,
    Parent = FilesType,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace FileListTypeResolvers {
  export interface Resolvers<Context = {}, TypeParent = FileListType> {
    name?: NameResolver<string, TypeParent, Context>;

    type?: TypeResolver<FileType, TypeParent, Context>;
  }

  export type NameResolver<
    R = string,
    Parent = FileListType,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type TypeResolver<
    R = FileType,
    Parent = FileListType,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace CommandResponseResolvers {
  export interface Resolvers<Context = {}, TypeParent = CommandResponse> {
    type?: TypeResolver<string, TypeParent, Context>;

    id?: IdResolver<string, TypeParent, Context>;

    workspace?: WorkspaceResolver<string | null, TypeParent, Context>;

    command?: CommandResolver<string, TypeParent, Context>;

    status?: StatusResolver<string, TypeParent, Context>;

    detailedStatus?: DetailedStatusResolver<string | null, TypeParent, Context>;

    outChunk?: OutChunkResolver<string, TypeParent, Context>;

    out?: OutResolver<string, TypeParent, Context>;
  }

  export type TypeResolver<
    R = string,
    Parent = CommandResponse,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type IdResolver<
    R = string,
    Parent = CommandResponse,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type WorkspaceResolver<
    R = string | null,
    Parent = CommandResponse,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type CommandResolver<
    R = string,
    Parent = CommandResponse,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type StatusResolver<
    R = string,
    Parent = CommandResponse,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type DetailedStatusResolver<
    R = string | null,
    Parent = CommandResponse,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type OutChunkResolver<
    R = string,
    Parent = CommandResponse,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type OutResolver<
    R = string,
    Parent = CommandResponse,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace MutationResolvers {
  export interface Resolvers<Context = {}, TypeParent = {}> {
    ngAdd?: NgAddResolver<CommandStarted | null, TypeParent, Context>;

    ngNew?: NgNewResolver<CommandStarted | null, TypeParent, Context>;

    generate?: GenerateResolver<CommandStarted | null, TypeParent, Context>;

    runNg?: RunNgResolver<CommandStarted | null, TypeParent, Context>;

    runNpm?: RunNpmResolver<CommandStarted | null, TypeParent, Context>;

    stopCommand?: StopCommandResolver<StopResult | null, TypeParent, Context>;

    removeCommand?: RemoveCommandResolver<
      RemoveResult | null,
      TypeParent,
      Context
    >;

    removeAllCommands?: RemoveAllCommandsResolver<
      RemoveResult | null,
      TypeParent,
      Context
    >;

    restartCommand?: RestartCommandResolver<
      RemoveResult | null,
      TypeParent,
      Context
    >;

    openInEditor?: OpenInEditorResolver<
      OpenInEditor | null,
      TypeParent,
      Context
    >;

    updateSettings?: UpdateSettingsResolver<Settings, TypeParent, Context>;

    installNodeJs?: InstallNodeJsResolver<
      InstallNodeJsStatus | null,
      TypeParent,
      Context
    >;

    openInBrowser?: OpenInBrowserResolver<
      OpenInBrowserResult | null,
      TypeParent,
      Context
    >;

    selectDirectory?: SelectDirectoryResolver<
      SelectDirectoryResult | null,
      TypeParent,
      Context
    >;

    showItemInFolder?: ShowItemInFolderResolver<
      ShowItemInFolderResult | null,
      TypeParent,
      Context
    >;

    openDoc?: OpenDocResolver<OpenDocResult | null, TypeParent, Context>;
  }

  export type NgAddResolver<
    R = CommandStarted | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context, NgAddArgs>;
  export interface NgAddArgs {
    path: string;

    name: string;
  }

  export type NgNewResolver<
    R = CommandStarted | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context, NgNewArgs>;
  export interface NgNewArgs {
    path: string;

    name: string;

    collection: string;
  }

  export type GenerateResolver<
    R = CommandStarted | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context, GenerateArgs>;
  export interface GenerateArgs {
    path: string;

    genCommand?: (string | null)[] | null;

    dryRun: boolean;
  }

  export type RunNgResolver<
    R = CommandStarted | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context, RunNgArgs>;
  export interface RunNgArgs {
    path: string;

    runCommand?: (string | null)[] | null;
  }

  export type RunNpmResolver<
    R = CommandStarted | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context, RunNpmArgs>;
  export interface RunNpmArgs {
    path: string;

    npmClient: string;

    runCommand?: (string | null)[] | null;
  }

  export type StopCommandResolver<
    R = StopResult | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context, StopCommandArgs>;
  export interface StopCommandArgs {
    id: string;
  }

  export type RemoveCommandResolver<
    R = RemoveResult | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context, RemoveCommandArgs>;
  export interface RemoveCommandArgs {
    id: string;
  }

  export type RemoveAllCommandsResolver<
    R = RemoveResult | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type RestartCommandResolver<
    R = RemoveResult | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context, RestartCommandArgs>;
  export interface RestartCommandArgs {
    id: string;
  }

  export type OpenInEditorResolver<
    R = OpenInEditor | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context, OpenInEditorArgs>;
  export interface OpenInEditorArgs {
    editor: string;

    path: string;
  }

  export type UpdateSettingsResolver<
    R = Settings,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context, UpdateSettingsArgs>;
  export interface UpdateSettingsArgs {
    data: string;
  }

  export type InstallNodeJsResolver<
    R = InstallNodeJsStatus | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type OpenInBrowserResolver<
    R = OpenInBrowserResult | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context, OpenInBrowserArgs>;
  export interface OpenInBrowserArgs {
    url: string;
  }

  export type SelectDirectoryResolver<
    R = SelectDirectoryResult | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context, SelectDirectoryArgs>;
  export interface SelectDirectoryArgs {
    dialogTitle: string;

    dialogButtonLabel: string;

    angularWorkspace: boolean;
  }

  export type ShowItemInFolderResolver<
    R = ShowItemInFolderResult | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context, ShowItemInFolderArgs>;
  export interface ShowItemInFolderArgs {
    item: string;
  }

  export type OpenDocResolver<
    R = OpenDocResult | null,
    Parent = {},
    Context = {}
  > = Resolver<R, Parent, Context, OpenDocArgs>;
  export interface OpenDocArgs {
    id: string;
  }
}

export namespace CommandStartedResolvers {
  export interface Resolvers<Context = {}, TypeParent = CommandStarted> {
    id?: IdResolver<string, TypeParent, Context>;
  }

  export type IdResolver<
    R = string,
    Parent = CommandStarted,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace StopResultResolvers {
  export interface Resolvers<Context = {}, TypeParent = StopResult> {
    result?: ResultResolver<boolean | null, TypeParent, Context>;
  }

  export type ResultResolver<
    R = boolean | null,
    Parent = StopResult,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace RemoveResultResolvers {
  export interface Resolvers<Context = {}, TypeParent = RemoveResult> {
    result?: ResultResolver<boolean | null, TypeParent, Context>;
  }

  export type ResultResolver<
    R = boolean | null,
    Parent = RemoveResult,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace OpenInEditorResolvers {
  export interface Resolvers<Context = {}, TypeParent = OpenInEditor> {
    response?: ResponseResolver<string, TypeParent, Context>;
  }

  export type ResponseResolver<
    R = string,
    Parent = OpenInEditor,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace OpenInBrowserResultResolvers {
  export interface Resolvers<Context = {}, TypeParent = OpenInBrowserResult> {
    result?: ResultResolver<boolean, TypeParent, Context>;
  }

  export type ResultResolver<
    R = boolean,
    Parent = OpenInBrowserResult,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace SelectDirectoryResultResolvers {
  export interface Resolvers<Context = {}, TypeParent = SelectDirectoryResult> {
    selectedDirectoryPath?: SelectedDirectoryPathResolver<
      string | null,
      TypeParent,
      Context
    >;

    error?: ErrorResolver<string | null, TypeParent, Context>;
  }

  export type SelectedDirectoryPathResolver<
    R = string | null,
    Parent = SelectDirectoryResult,
    Context = {}
  > = Resolver<R, Parent, Context>;
  export type ErrorResolver<
    R = string | null,
    Parent = SelectDirectoryResult,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace ShowItemInFolderResultResolvers {
  export interface Resolvers<
    Context = {},
    TypeParent = ShowItemInFolderResult
  > {
    result?: ResultResolver<boolean, TypeParent, Context>;
  }

  export type ResultResolver<
    R = boolean,
    Parent = ShowItemInFolderResult,
    Context = {}
  > = Resolver<R, Parent, Context>;
}

export namespace OpenDocResultResolvers {
  export interface Resolvers<Context = {}, TypeParent = OpenDocResult> {
    result?: ResultResolver<boolean, TypeParent, Context>;
  }

  export type ResultResolver<
    R = boolean,
    Parent = OpenDocResult,
    Context = {}
  > = Resolver<R, Parent, Context>;
}
