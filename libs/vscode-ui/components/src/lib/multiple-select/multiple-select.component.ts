import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnInit,
  OnDestroy
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { Option } from '@nx-console/schema';
import { Subscription } from 'rxjs';

@Component({
  selector: 'nx-console-multiple-select',
  templateUrl: './multiple-select.component.html',
  styleUrls: ['./multiple-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultipleSelectComponent implements OnInit, OnChanges, OnDestroy {
  @Input() field: Option;
  @Input() disabled = false;
  @Input() value: string[];
  @Output() readonly valueChange = new EventEmitter<string[]>();
  selectControl = new FormControl([]);
  private readonly subscriptioins = new Subscription();

  ngOnInit(): void {
    this.subscriptioins.add(
      this.selectControl.valueChanges.subscribe(value =>
        this.valueChange.emit(value)
      )
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.value) {
      this.selectControl.setValue(changes.value.currentValue);
    }
  }

  getOptionTooltip(optionValue: string): string | null {
    if (
      this.field &&
      this.field.itemTooltips &&
      this.field.itemTooltips[optionValue]
    ) {
      return this.field.itemTooltips[optionValue];
    }
    return null;
  }

  ngOnDestroy(): void {
    this.subscriptioins.unsubscribe();
  }
}
