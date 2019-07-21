import { InjectionToken, Provider } from '@angular/core';

export type ApplicationPlatform = 'electron' | 'vscode' | 'intellij';

export const ENVIRONMENT = new InjectionToken('ENVIRONMENT');
export const IS_VSCODE = new InjectionToken('IS_VSCODE');
export const IS_INTELLIJ = new InjectionToken('IS_INTELLIJ');
export const IS_ELECTRON = new InjectionToken('IS_ELECTRON');
export interface Environment {
  production: boolean;
  disableAnimations?: boolean;
  providers: Provider[];
  application: ApplicationPlatform;
}
