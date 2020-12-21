export interface CliTaskDefinition {
  positional: string;
  command: string;
  flags: Array<string>;
}

export interface ArchitectDef {
  builder: string;
  configurations?: {
    [configuration: string]: {};
  };
}

export interface ArchitectsDef {
  [targetName: string]: ArchitectDef;
}

export interface TargetDef {
  executor: string;
  configurations?: {
    [configuration: string]: {};
  };
}

export interface TargetsDef {
  [targetName: string]: TargetDef;
}

export interface ProjectDef {
  root: string;
  architect?: ArchitectsDef;
  targets?: TargetsDef;
}

export interface NamedProject extends ProjectDef {
  name: string;
}

export interface Projects {
  [projectName: string]: ProjectDef | undefined;
}

export interface WorkspaceJson {
  projects: Projects;
}
