export interface WorkspaceFilterOptions {
  includeProjectGraph?: boolean;
  includeNxJson?: boolean;
  includeErrors?: boolean;
  projectLimit?: number;
  projectFilter?: string; // glob pattern
}

export interface FilteredProjectGraphResult {
  content: string;
  totalProjects: number;
  includedProjects: number;
  wasFiltered: boolean;
}
