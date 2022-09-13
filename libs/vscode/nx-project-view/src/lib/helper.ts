import { ProjectConfiguration } from "@nrwl/devkit";

export class NxProjectTreeHelper {

  static async getProjectsInFolders(projects: [string, ProjectConfiguration][]): Promise<Record<string,ProjectConfiguration>> {
    const projectsObject = {};

    projects.forEach((project) => {
      const lastArray = project[1] as ProjectConfiguration;
      const splittedProject = lastArray.root.split('/');

      splittedProject.reduce((previousValue: {[key: string]: string;} & any, currentValue: string, currentIndex: number) => {
          if (splittedProject.length -1 > currentIndex) {
              return previousValue[currentValue] || (previousValue[currentValue] = {});
          }
          return previousValue[currentValue] || (previousValue[currentValue] = project)
      }, projectsObject)
    });

    return projectsObject;
  }

  static async findNestedObject(fields: any, key: string): Promise<any> {
    let result = null;
    if (fields instanceof Array) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [i, _field] of fields.entries()) {
        result = await this.findNestedObject(fields[i], key);
        if (result) {
          break;
        }
      }
    } else {
      for (const prop in fields) {
        if (prop === key) {
          return fields;
        }
        if (fields[prop] instanceof Object || fields[prop] instanceof Array) {
          result = await this.findNestedObject(fields[prop], key);
          if (result) {
            break;
          }
        }
      }
    }
    return result;
  }
}