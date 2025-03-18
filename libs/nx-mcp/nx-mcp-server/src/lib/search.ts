import MiniSearch from 'minisearch';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, basename } from 'path';

export class ProjectSearch {
  private miniSearch: MiniSearch;

  constructor() {
    this.miniSearch = new MiniSearch({
      fields: ['description', 'keywords', 'path', 'name', 'data'],
      storeFields: ['description', 'keywords', 'path', 'name', 'data', 'id'],
      searchOptions: {
        boost: { name: 3, keywords: 2 }, // boost title matches
        fuzzy: 0.2,
      },
    });
  }

  loadProjects(projectGraph: any, directory: string) {
    for (const projectName of Object.keys(projectGraph.nodes)) {
      if (projectName == '@nrwl/ocean') continue
      const project = projectGraph.nodes[projectName];
      const file = join(directory, project.data.root, projectName + ".project-summary.json")
      try {
        const summary = JSON.parse(readFileSync(file).toString());
        this.miniSearch.add({
          id: projectName,
          name: projectName,
          description: summary.description,
          keywords: summary.keywords,
          path: project.data.root,
          data: project.data,
        });
      } catch (e) {
        console.error(`Error loading project ${projectName}. Path: ${file}`, e);
        // throw e;
      }
    }
  }

  search(query: string) {
    return this.miniSearch.search(query);
  }
}

export class FileSearch {
  private miniSearch: MiniSearch;

  constructor() {
    this.miniSearch = new MiniSearch({
      fields: ['description', 'keywords', 'exportedTokens', 'name'],
      storeFields: ['description', 'keywords', 'exportedTokens', 'name', 'projectName', 'id'],
      searchOptions: {
        boost: { name: 3, keywords: 2, exportedTokens: 2 }, // boost title matches
        fuzzy: 0.2,
      },
    });
  }

  loadFilesForProjects(projectGraph: any, selectedProjects: string[], directory: string) {
    for (const projectName of selectedProjects) {
      const project = projectGraph.nodes[projectName];
      const files = this.findSummaryFiles(join(directory, project.data.root));
      for (const file of files) {
        try {
          this.miniSearch.add({
            id: file.fullPath,
            name: file.name,
            description: file.description,
            keywords: file.keywords,
            exportedTokens: file.exportedTokens,
            project: projectName,
          });
        } catch (e) {
          console.error(`Error loading file ${file}`, e);
        }
      }
    }
  }

  loadFiles(directory: string) {
    const files = this.findSummaryFiles(directory);
    for (const file of files) {
      try {
        this.miniSearch.add({
          id: file.fullPath,
          name: file.name,
          description: file.description,
          keywords: file.keywords,
          exportedTokens: file.exportedTokens,
        });
      } catch (e) {
        console.error(`Error loading file ${file}`, e);
      }
    }
  }

  private findSummaryFiles(directory: string): any[] {
    const results: string[] = [];
    
    const traverseDirectory = (dir: string) => {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        if (entry.endsWith('ts.summary.json') || entry.endsWith('kt.summary.json')) {
          results.push({...JSON.parse(readFileSync(fullPath).toString()), name: entry, fullPath: fullPath});
        } else if (statSync(fullPath).isDirectory()) {
          traverseDirectory(fullPath);
        }
      }
    };
    
    traverseDirectory(directory);
    return results;

  }

  search(query: string) {
    return this.miniSearch.search(query);
  }
}
