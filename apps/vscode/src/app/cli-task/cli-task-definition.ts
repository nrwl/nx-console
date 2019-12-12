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

export interface ProjectDef {
  root: string;
  architect?: {
    [architectName: string]: ArchitectDef;
  };
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
