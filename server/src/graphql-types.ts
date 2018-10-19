/* tslint:disable */
import { GraphQLResolveInfo } from 'graphql';

export type Resolver<Result, Parent = any, Context = any, Args = any> = (
  parent: Parent,
  args: Args,
  context: Context,
  info: GraphQLResolveInfo
) => Promise<Result> | Result;

export type SubscriptionResolver<
  Result,
  Parent = any,
  Context = any,
  Args = any
> = {
  subscribe<R = Result, P = Parent>(
    parent: P,
    args: Args,
    context: Context,
    info: GraphQLResolveInfo
  ): AsyncIterator<R | Result>;
  resolve?<R = Result, P = Parent>(
    parent: P,
    args: Args,
    context: Context,
    info: GraphQLResolveInfo
  ): R | Result | Promise<R | Result>;
};

export interface Database {
  settings: Settings;
  schematicCollections?: (SchematicCollectionForNgNew | null)[] | null;
  workspace: Workspace;
  editors?: (EditorSupport | null)[] | null;
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

export enum FileType {
  file = 'file',
  directory = 'directory',
  angularDirectory = 'angularDirectory'
}

export namespace DatabaseResolvers {
  export interface Resolvers<Context = any> {
    settings?: SettingsResolver<Settings, any, Context>;
    schematicCollections?: SchematicCollectionsResolver<
      (SchematicCollectionForNgNew | null)[] | null,
      any,
      Context
    >;
    workspace?: WorkspaceResolver<Workspace, any, Context>;
    editors?: EditorsResolver<(EditorSupport | null)[] | null, any, Context>;
    availableExtensions?: AvailableExtensionsResolver<
      (Extension | null)[] | null,
      any,
      Context
    >;
    installNodeJsStatus?: InstallNodeJsStatusResolver<
      InstallNodeJsStatus | null,
      any,
      Context
    >;
    isNodejsInstalled?: IsNodejsInstalledResolver<
      IsNodeInstalledResult | null,
      any,
      Context
    >;
    directory?: DirectoryResolver<FilesType, any, Context>;
    commands?: CommandsResolver<
      (CommandResponse | null)[] | null,
      any,
      Context
    >;
  }

  export type SettingsResolver<
    R = Settings,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type SchematicCollectionsResolver<
    R = (SchematicCollectionForNgNew | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type WorkspaceResolver<
    R = Workspace,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, WorkspaceArgs>;
  export interface WorkspaceArgs {
    path: string;
  }

  export type EditorsResolver<
    R = (EditorSupport | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type AvailableExtensionsResolver<
    R = (Extension | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, AvailableExtensionsArgs>;
  export interface AvailableExtensionsArgs {
    name?: string | null;
  }

  export type InstallNodeJsStatusResolver<
    R = InstallNodeJsStatus | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type IsNodejsInstalledResolver<
    R = IsNodeInstalledResult | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type DirectoryResolver<
    R = FilesType,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, DirectoryArgs>;
  export interface DirectoryArgs {
    path?: string | null;
    onlyDirectories?: boolean | null;
    showHidden?: boolean | null;
  }

  export type CommandsResolver<
    R = (CommandResponse | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, CommandsArgs>;
  export interface CommandsArgs {
    id?: string | null;
  }
}

export namespace SettingsResolvers {
  export interface Resolvers<Context = any> {
    canCollectData?: CanCollectDataResolver<boolean, any, Context>;
    showSupportPlugin?: ShowSupportPluginResolver<boolean | null, any, Context>;
    installNodeManually?: InstallNodeManuallyResolver<
      boolean | null,
      any,
      Context
    >;
    recent?: RecentResolver<
      (WorkspaceDefinition | null)[] | null,
      any,
      Context
    >;
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
  export type RecentResolver<
    R = (WorkspaceDefinition | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace WorkspaceDefinitionResolvers {
  export interface Resolvers<Context = any> {
    path?: PathResolver<string, any, Context>;
    name?: NameResolver<string, any, Context>;
    favorite?: FavoriteResolver<boolean | null, any, Context>;
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
  export interface Resolvers<Context = any> {
    name?: NameResolver<string, any, Context>;
    description?: DescriptionResolver<string, any, Context>;
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
  export interface Resolvers<Context = any> {
    name?: NameResolver<string, any, Context>;
    path?: PathResolver<string, any, Context>;
    dependencies?: DependenciesResolver<
      (Dependencies | null)[] | null,
      any,
      Context
    >;
    extensions?: ExtensionsResolver<(Extension | null)[] | null, any, Context>;
    schematicCollections?: SchematicCollectionsResolver<
      (SchematicCollection | null)[] | null,
      any,
      Context
    >;
    npmScripts?: NpmScriptsResolver<(NpmScript | null)[] | null, any, Context>;
    projects?: ProjectsResolver<(Project | null)[] | null, any, Context>;
    completions?: CompletionsResolver<CompletionsTypes | null, any, Context>;
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
    R = (Dependencies | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type ExtensionsResolver<
    R = (Extension | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type SchematicCollectionsResolver<
    R = (SchematicCollection | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, SchematicCollectionsArgs>;
  export interface SchematicCollectionsArgs {
    name?: string | null;
  }

  export type NpmScriptsResolver<
    R = (NpmScript | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, NpmScriptsArgs>;
  export interface NpmScriptsArgs {
    name?: string | null;
  }

  export type ProjectsResolver<
    R = (Project | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, ProjectsArgs>;
  export interface ProjectsArgs {
    name?: string | null;
  }

  export type CompletionsResolver<
    R = CompletionsTypes | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace DependenciesResolvers {
  export interface Resolvers<Context = any> {
    name?: NameResolver<string, any, Context>;
    version?: VersionResolver<string, any, Context>;
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
  export interface Resolvers<Context = any> {
    name?: NameResolver<string, any, Context>;
    description?: DescriptionResolver<string | null, any, Context>;
    detailedDescription?: DetailedDescriptionResolver<
      string | null,
      any,
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
  export interface Resolvers<Context = any> {
    name?: NameResolver<string, any, Context>;
    schematics?: SchematicsResolver<(Schematic | null)[] | null, any, Context>;
  }

  export type NameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type SchematicsResolver<
    R = (Schematic | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, SchematicsArgs>;
  export interface SchematicsArgs {
    name?: string | null;
  }
}

export namespace SchematicResolvers {
  export interface Resolvers<Context = any> {
    collection?: CollectionResolver<string, any, Context>;
    name?: NameResolver<string, any, Context>;
    description?: DescriptionResolver<string | null, any, Context>;
    schema?: SchemaResolver<(SchematicSchema | null)[] | null, any, Context>;
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
    R = (SchematicSchema | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace SchematicSchemaResolvers {
  export interface Resolvers<Context = any> {
    name?: NameResolver<string, any, Context>;
    type?: TypeResolver<string, any, Context>;
    description?: DescriptionResolver<string | null, any, Context>;
    defaultValue?: DefaultValueResolver<string | null, any, Context>;
    required?: RequiredResolver<boolean, any, Context>;
    positional?: PositionalResolver<boolean, any, Context>;
    enum?: EnumResolver<(string | null)[] | null, any, Context>;
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
  export interface Resolvers<Context = any> {
    name?: NameResolver<string, any, Context>;
    npmClient?: NpmClientResolver<string, any, Context>;
    schema?: SchemaResolver<(ArchitectSchema | null)[] | null, any, Context>;
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
    R = (ArchitectSchema | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace ArchitectSchemaResolvers {
  export interface Resolvers<Context = any> {
    name?: NameResolver<string, any, Context>;
    type?: TypeResolver<string, any, Context>;
    description?: DescriptionResolver<string | null, any, Context>;
    defaultValue?: DefaultValueResolver<string | null, any, Context>;
    required?: RequiredResolver<boolean, any, Context>;
    positional?: PositionalResolver<boolean, any, Context>;
    enum?: EnumResolver<(string | null)[] | null, any, Context>;
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
  export interface Resolvers<Context = any> {
    name?: NameResolver<string, any, Context>;
    root?: RootResolver<string, any, Context>;
    projectType?: ProjectTypeResolver<string, any, Context>;
    architect?: ArchitectResolver<(Architect | null)[] | null, any, Context>;
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
    R = (Architect | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, ArchitectArgs>;
  export interface ArchitectArgs {
    name?: string | null;
  }
}

export namespace ArchitectResolvers {
  export interface Resolvers<Context = any> {
    name?: NameResolver<string, any, Context>;
    project?: ProjectResolver<string, any, Context>;
    builder?: BuilderResolver<string, any, Context>;
    configurations?: ConfigurationsResolver<
      (ArchitectConfigurations | null)[] | null,
      any,
      Context
    >;
    schema?: SchemaResolver<(ArchitectSchema | null)[] | null, any, Context>;
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
    R = (ArchitectConfigurations | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type SchemaResolver<
    R = (ArchitectSchema | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace ArchitectConfigurationsResolvers {
  export interface Resolvers<Context = any> {
    name?: NameResolver<string, any, Context>;
  }

  export type NameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace CompletionsTypesResolvers {
  export interface Resolvers<Context = any> {
    files?: FilesResolver<(CompletionResultType | null)[] | null, any, Context>;
    projects?: ProjectsResolver<
      (CompletionResultType | null)[] | null,
      any,
      Context
    >;
    localModules?: LocalModulesResolver<
      (CompletionResultType | null)[] | null,
      any,
      Context
    >;
    absoluteModules?: AbsoluteModulesResolver<
      (CompletionResultType | null)[] | null,
      any,
      Context
    >;
  }

  export type FilesResolver<
    R = (CompletionResultType | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, FilesArgs>;
  export interface FilesArgs {
    input?: string | null;
  }

  export type ProjectsResolver<
    R = (CompletionResultType | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, ProjectsArgs>;
  export interface ProjectsArgs {
    input?: string | null;
  }

  export type LocalModulesResolver<
    R = (CompletionResultType | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, LocalModulesArgs>;
  export interface LocalModulesArgs {
    input?: string | null;
  }

  export type AbsoluteModulesResolver<
    R = (CompletionResultType | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, AbsoluteModulesArgs>;
  export interface AbsoluteModulesArgs {
    input?: string | null;
  }
}

export namespace CompletionResultTypeResolvers {
  export interface Resolvers<Context = any> {
    value?: ValueResolver<string, any, Context>;
    display?: DisplayResolver<string | null, any, Context>;
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
  export interface Resolvers<Context = any> {
    name?: NameResolver<string, any, Context>;
    icon?: IconResolver<string, any, Context>;
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
  export interface Resolvers<Context = any> {
    downloadPercentage?: DownloadPercentageResolver<
      number | null,
      any,
      Context
    >;
    downloadSpeed?: DownloadSpeedResolver<number | null, any, Context>;
    success?: SuccessResolver<boolean | null, any, Context>;
    cancelled?: CancelledResolver<boolean | null, any, Context>;
    error?: ErrorResolver<string | null, any, Context>;
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
  export interface Resolvers<Context = any> {
    result?: ResultResolver<boolean, any, Context>;
  }

  export type ResultResolver<
    R = boolean,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace FilesTypeResolvers {
  export interface Resolvers<Context = any> {
    path?: PathResolver<string, any, Context>;
    exists?: ExistsResolver<boolean, any, Context>;
    files?: FilesResolver<(FileListType | null)[] | null, any, Context>;
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
    R = (FileListType | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace FileListTypeResolvers {
  export interface Resolvers<Context = any> {
    name?: NameResolver<string, any, Context>;
    type?: TypeResolver<FileType, any, Context>;
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
  export interface Resolvers<Context = any> {
    type?: TypeResolver<string, any, Context>;
    id?: IdResolver<string, any, Context>;
    workspace?: WorkspaceResolver<string | null, any, Context>;
    command?: CommandResolver<string, any, Context>;
    status?: StatusResolver<string, any, Context>;
    detailedStatus?: DetailedStatusResolver<string | null, any, Context>;
    outChunk?: OutChunkResolver<string, any, Context>;
    out?: OutResolver<string, any, Context>;
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
  export interface Resolvers<Context = any> {
    ngAdd?: NgAddResolver<CommandStarted | null, any, Context>;
    ngNew?: NgNewResolver<CommandStarted | null, any, Context>;
    generate?: GenerateResolver<CommandStarted | null, any, Context>;
    runNg?: RunNgResolver<CommandStarted | null, any, Context>;
    runNpm?: RunNpmResolver<CommandStarted | null, any, Context>;
    stopCommand?: StopCommandResolver<StopResult | null, any, Context>;
    removeCommand?: RemoveCommandResolver<RemoveResult | null, any, Context>;
    removeAllCommands?: RemoveAllCommandsResolver<
      RemoveResult | null,
      any,
      Context
    >;
    restartCommand?: RestartCommandResolver<RemoveResult | null, any, Context>;
    openInEditor?: OpenInEditorResolver<OpenInEditor | null, any, Context>;
    updateSettings?: UpdateSettingsResolver<Settings, any, Context>;
    installNodeJs?: InstallNodeJsResolver<
      InstallNodeJsStatus | null,
      any,
      Context
    >;
    openInBrowser?: OpenInBrowserResolver<
      OpenInBrowserResult | null,
      any,
      Context
    >;
    selectDirectory?: SelectDirectoryResolver<
      SelectDirectoryResult | null,
      any,
      Context
    >;
  }

  export type NgAddResolver<
    R = CommandStarted | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, NgAddArgs>;
  export interface NgAddArgs {
    path: string;
    name: string;
  }

  export type NgNewResolver<
    R = CommandStarted | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, NgNewArgs>;
  export interface NgNewArgs {
    path: string;
    name: string;
    collection: string;
  }

  export type GenerateResolver<
    R = CommandStarted | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, GenerateArgs>;
  export interface GenerateArgs {
    path: string;
    genCommand?: (string | null)[] | null;
    dryRun: boolean;
  }

  export type RunNgResolver<
    R = CommandStarted | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, RunNgArgs>;
  export interface RunNgArgs {
    path: string;
    runCommand?: (string | null)[] | null;
  }

  export type RunNpmResolver<
    R = CommandStarted | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, RunNpmArgs>;
  export interface RunNpmArgs {
    path: string;
    npmClient: string;
    runCommand?: (string | null)[] | null;
  }

  export type StopCommandResolver<
    R = StopResult | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, StopCommandArgs>;
  export interface StopCommandArgs {
    id: string;
  }

  export type RemoveCommandResolver<
    R = RemoveResult | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, RemoveCommandArgs>;
  export interface RemoveCommandArgs {
    id: string;
  }

  export type RemoveAllCommandsResolver<
    R = RemoveResult | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type RestartCommandResolver<
    R = RemoveResult | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, RestartCommandArgs>;
  export interface RestartCommandArgs {
    id: string;
  }

  export type OpenInEditorResolver<
    R = OpenInEditor | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, OpenInEditorArgs>;
  export interface OpenInEditorArgs {
    editor: string;
    path: string;
  }

  export type UpdateSettingsResolver<
    R = Settings,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, UpdateSettingsArgs>;
  export interface UpdateSettingsArgs {
    data: string;
  }

  export type InstallNodeJsResolver<
    R = InstallNodeJsStatus | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type OpenInBrowserResolver<
    R = OpenInBrowserResult | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, OpenInBrowserArgs>;
  export interface OpenInBrowserArgs {
    url: string;
  }

  export type SelectDirectoryResolver<
    R = SelectDirectoryResult | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, SelectDirectoryArgs>;
  export interface SelectDirectoryArgs {
    dialogTitle: string;
    dialogButtonLabel: string;
    angularWorkspace: boolean;
  }
}

export namespace CommandStartedResolvers {
  export interface Resolvers<Context = any> {
    id?: IdResolver<string, any, Context>;
  }

  export type IdResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace StopResultResolvers {
  export interface Resolvers<Context = any> {
    result?: ResultResolver<boolean | null, any, Context>;
  }

  export type ResultResolver<
    R = boolean | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace RemoveResultResolvers {
  export interface Resolvers<Context = any> {
    result?: ResultResolver<boolean | null, any, Context>;
  }

  export type ResultResolver<
    R = boolean | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace OpenInEditorResolvers {
  export interface Resolvers<Context = any> {
    response?: ResponseResolver<string, any, Context>;
  }

  export type ResponseResolver<
    R = string,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace OpenInBrowserResultResolvers {
  export interface Resolvers<Context = any> {
    result?: ResultResolver<boolean, any, Context>;
  }

  export type ResultResolver<
    R = boolean,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}

export namespace SelectDirectoryResultResolvers {
  export interface Resolvers<Context = any> {
    selectedDirectoryPath?: SelectedDirectoryPathResolver<
      string | null,
      any,
      Context
    >;
    error?: ErrorResolver<string | null, any, Context>;
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
