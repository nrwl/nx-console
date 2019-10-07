import {
  Component,
  ElementRef,
  Input,
  SimpleChanges,
  OnChanges
} from '@angular/core';

export interface FieldTreeBin {
  title: string;
  fields: Array<string>;
}

@Component({
  selector: 'vscode-ui-field-tree',
  templateUrl: './field-tree.component.html',
  styleUrls: ['./field-tree.component.scss']
})
export class FieldTreeComponent implements OnChanges {
  @Input() fieldBins: Array<{ title: string; fields: Array<string> }>;
  @Input() activeFieldName: string;
  @Input() filteredFields: Set<string>;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngOnChanges(simpleChanges: SimpleChanges) {
    if (simpleChanges.activeFieldName) {
      const item = document.getElementById(
        this.activeFieldName + '-field-tree-item'
      );

      const parentTop = Number(this.elementRef.nativeElement.scrollTop);
      const parentBottom =
        parentTop + Number(this.elementRef.nativeElement.clientHeight);

      if (
        item &&
        (item.offsetTop < parentTop || item.offsetTop > parentBottom)
      ) {
        item.scrollIntoView({
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }
  }

  camelToTitle(camelCase: string) {
    const result = camelCase.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  scrollToField(fieldName: string) {
    const element = document.getElementById(
      fieldName + '-angular-console-field'
    );
    if (element) {
      element.scrollIntoView({
        block: 'start',
        inline: 'start'
      });
    }
  }
}
