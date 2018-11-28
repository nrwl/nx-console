import { Component, Input, OnInit } from '@angular/core';
import { OpenDocGQL } from '@angular-console/utils';

@Component({
  selector: 'ui-entity-docs',
  templateUrl: './entity-docs.component.html',
  styleUrls: ['./entity-docs.component.scss']
})
export class EntityDocsComponent implements OnInit {
  @Input() docs: { id: string; description: string }[] = [];

  constructor(private readonly openDocGQL: OpenDocGQL) {}

  ngOnInit() {}

  openDoc(doc: { id: string; description: string }) {
    this.openDocGQL
      .mutate({
        id: doc.id
      })
      .subscribe();
    return false;
  }
}
