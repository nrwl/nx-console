import { Component, OnInit } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { ActivatedRoute } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import gql from 'graphql-tag';
import { Observable } from 'rxjs';
import { Project } from '@nxui/utils';

@Component({
  selector: 'nxui-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.css']
})
export class DetailsComponent implements OnInit {
  public workspace$: Observable<any>;

  constructor(private apollo: Apollo, private route: ActivatedRoute) {}

  ngOnInit() {
    this.workspace$ = this.route.params.pipe(
      map(m => m['path']),
      switchMap(path => {
        return this.apollo.watchQuery({
          pollInterval: 2000,
          query: gql`
            query($path: String!) {
              workspace(path: $path) {
                name
                path
                dependencies {
                  name
                  version
                }
                projects {
                  name
                  root
                  projectType
                  architect {
                    name
                  }
                }
              }
            }
          `,
          variables: {
            path
          }
        }).valueChanges;
      }),
      map((r: any) => {
        const w = r.data.workspace;
        const projects = w.projects.map(p => {
          const actions = [
            ...createLinkForTask(p, 'build', 'Build'),
            ...createLinkForTask(p, 'test', 'Test'),
            ...createLinkForTask(p, 'e2e', 'E2E'),
            ...createLinkForCoreSchematic(p, 'component', 'Generate Component'),
            ...createLinkForCoreSchematic(p, 'service', 'Generate Service')
          ] as any[];
          return { ...p, actions };
        });
        return { ...w, projects };
      })
    );
  }

  trackByName(p: any) {
    return p.name;
  }
}

function createLinkForTask(
  project: Project,
  name: string,
  actionDescription: string
) {
  if (project.architect.find(a => a.name === name)) {
    return [{ actionDescription, link: ['../tasks', name, project.name] }];
  } else {
    return [];
  }
}

function createLinkForCoreSchematic(
  project: Project,
  name: string,
  actionDescription: string
) {
  return [
    {
      actionDescription,
      link: [
        '../generate',
        decodeURIComponent('@schematics/angular'),
        name,
        { project: project.name }
      ]
    }
  ];
}
