import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { ControlContainer, FormControl, FormGroup } from '@angular/forms';
import { Option } from '@nx-console/schema';
import { Subscription } from 'rxjs';

@Component({
  selector: 'nx-console-multiple-select',
  templateUrl: './multiple-select.component.html',
  styleUrls: ['./multiple-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultipleSelectComponent implements OnInit, OnDestroy {
  @Input() field: Option;
  @Input() value: string[];
  @Output() readonly valueChange = new EventEmitter<string[]>();

  get parentFormGroup(): FormGroup {
    return this.controlContainer.control as FormGroup;
  }

  get selectControl(): FormControl {
    return this.parentFormGroup?.get(this.field?.name) as FormControl;
  }

  constructor(private readonly controlContainer: ControlContainer) {}

  private readonly subscriptions = new Subscription();

  ngOnInit(): void {
    this.subscriptions.add(
      this.selectControl.valueChanges.subscribe((value) =>
        this.valueChange.emit(value)
      )
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
