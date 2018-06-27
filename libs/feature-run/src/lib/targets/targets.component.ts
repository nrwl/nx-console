import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Apollo } from 'apollo-angular';
import { map, switchMap } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import gql from 'graphql-tag';
import { Builder, Project } from '@nxui/utils';

@Component({
  selector: 'nxui-targets',
  templateUrl: './targets.component.html',
  styleUrls: ['./targets.component.css']
})
export class TargetsComponent implements OnInit {
  public projects$: Observable<Project>;

  constructor(private apollo: Apollo, private route: ActivatedRoute) {}

  ngOnInit() {
    this.projects$ = this.route.params.pipe(
      map(m => m['path']),
      switchMap(path => {
        return this.apollo.watchQuery({
          pollInterval: 5000,
          query: gql`
            query($path: String!) {
              workspace(path: $path) {
                projects {
                  name
                  root
                  projectType
                  architect {
                    name
                    description
                    builder
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
      map((r: any) => r.data.workspace.projects)
    );
  }

  trackByName(index: number, project: Project) {
    return project.name;
  }
}
