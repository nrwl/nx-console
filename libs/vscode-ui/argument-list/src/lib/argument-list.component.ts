import {
  Component,
  Input,
  ChangeDetectionStrategy,
  SecurityContext,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'nx-console-argument-list',
  templateUrl: './argument-list.component.html',
  styleUrls: ['./argument-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArgumentListComponent {
  private _formattedArgs: string[];
  @Input()
  get args(): string[] {
    return this._formattedArgs;
  }
  set args(values: string[]) {
    this._formattedArgs =
      values &&
      values.map(
        (value) =>
          this.domSanitizer.sanitize(
            SecurityContext.HTML,
            this.domSanitizer.bypassSecurityTrustHtml(
              value.replace('=', '=<wbr>')
            )
          ) || ''
      );
  }

  constructor(private readonly domSanitizer: DomSanitizer) {}
}
