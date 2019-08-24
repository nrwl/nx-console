export interface NgTaskDefinition {
  type: string;
  projectName: string;
  architectName: string;
  configuration?: string;
}

export interface ArchitectDef {
  configurations?: {
    [key: string]: {};
  };
}

export interface ProjectDef {
  architect?: {
    [key: string]: ArchitectDef;
  };
}

export interface AngularJson {
  projects: {
    [key: string]: ProjectDef;
  };
}
