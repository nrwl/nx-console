import { Injectable } from '@angular/core';
import { ShowItemInFolderGQL } from './generated/graphql';

@Injectable({
  providedIn: 'root'
})
export class ShowItemInFolderService {
  constructor(private readonly showItemInFolderGQL: ShowItemInFolderGQL) {}

  showItem(item: string) {
    return this.showItemInFolderGQL
      .mutate({
        item
      })
      .subscribe(() => {});
  }
}
