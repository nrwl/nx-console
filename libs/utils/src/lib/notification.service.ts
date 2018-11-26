import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { Settings } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class Notification {
  constructor(private readonly settings: Settings) {}

  notify(body: string, title: string = 'Angular Console'): Observable<any> {

    if (!this.settings.enableNotifications) {
        return of({});
    }

    const notificationInstance = (window as any).Notification.requestPermission().then(
      () => {
        return new (window as any).Notification(title, {
          body,
          icon: 'assets/console.png'
        });
      }
    );
    return from(notificationInstance);
  }
}
