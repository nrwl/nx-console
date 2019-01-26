import { InjectionToken, Provider } from '@angular/core';

export const ENVIRONMENT = new InjectionToken('ENVIRONMENT');

export interface Environment {
  production: boolean;
  providers: Provider[];
  application: 'electron' | 'vscode';
}
