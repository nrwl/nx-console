import { Injectable } from '@angular/core';
import { Directory } from '@angular-console/schema';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ListFilesGQL } from './generated/graphql';

@Injectable({
  providedIn: 'root'
})
export class Finder {
  constructor(private readonly listFilesGQL: ListFilesGQL) {}

  listFiles(
    path: string,
    onlyDirectories?: boolean,
    showHidden?: boolean
  ): Observable<Directory> {
    return this.listFilesGQL
      .fetch({
        path,
        onlyDirectories
      })
      .pipe(map((v: any) => v.data.directory));
  }
}
