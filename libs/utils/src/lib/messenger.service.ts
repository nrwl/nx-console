import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material';

@Injectable({
  providedIn: 'root'
})
export class Messenger {
  constructor(private readonly snackBar: MatSnackBar) {}

  error(m: string) {
    this.snackBar.open(m, 'Close', { duration: 15000 });
  }

  notify(m: string) {
    this.snackBar.open(m, undefined, { duration: 3000 });
  }
}
