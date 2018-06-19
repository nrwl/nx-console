import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Messenger {
  error(m: any) {
    console.error(m);
  }
}

