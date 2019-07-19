import { Observable, of } from 'rxjs';

import { Workspace, WorkspaceSchematics } from '../generated/graphql';
import { FilterMenuLink } from './filter-menu/filter-menu.component';

export interface ProjectAction extends FilterMenuLink {
  name: string;
  displayText: string;
  schematicName?: string;
  link$?: Observable<any[]>;
}

export function createLinkForTask(
  project: Workspace.Projects,
  name: string,
  displayText: string
) {
  if ((project.architect || []).find(a => a.name === name)) {
    return { displayText, name, link: ['./task', name, project.name] };
  } else {
    return undefined;
  }
}

export function createLinksForCollection(
  project: Workspace.Projects,
  collection: WorkspaceSchematics.SchematicCollections
): ProjectAction[] {
  const newLinks = (collection.schematics || [])
    .map(schematic =>
      createLinkForSchematic(
        project,
        collection.name,
        schematic ? schematic.name : '',
        schematic ? schematic.name : ''
      )
    )
    .filter(isDefinedProjectAction);
  if (newLinks.length > 0) {
    newLinks.unshift({
      name: collection.name,
      displayText: collection.name
    });
  }
  return newLinks;
}

export function createLinkForSchematic(
  project: Workspace.Projects,
  schematicName: string,
  name: string,
  displayText: string
): ProjectAction | undefined {
  {
    return {
      name,
      schematicName,
      displayText: displayText,
      link: [
        './generate',
        decodeURIComponent(schematicName),
        name,
        { project: project.name }
      ]
    };
  }
}

export function isDefinedProjectAction(
  action: ProjectAction | undefined
): action is ProjectAction {
  return action !== undefined;
}

export const SCHEMATIC_COLLECTION_ERROR_RESPONSE = of({
  data: {
    workspace: {
      schematicCollections: [] as WorkspaceSchematics.SchematicCollections[]
    }
  }
});
