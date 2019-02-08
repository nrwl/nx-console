import { InjectionToken, Provider } from '@angular/core';

export const ENVIRONMENT = new InjectionToken('ENVIRONMENT');
export const IS_VSCODE = new InjectionToken('IS_VSCODE');

export interface Environment {
  production: boolean;
  disableAnimations?: boolean;
  providers: Provider[];
  application: 'electron' | 'vscode';
}
