import type { NxCloudFixData } from './nx-cloud-fix-component';

// Input messages (from IDE to webview)
export type NxCloudFixInputMessage =
  | { type: 'update-details'; details: NxCloudFixData }
  | { type: 'styles'; payload: NxCloudFixStyles };

// Output messages (from webview to IDE)
export type NxCloudFixOutputMessage =
  | { type: 'apply' }
  | { type: 'apply-locally' }
  | { type: 'reject' }
  | { type: 'show-diff' }
  | { type: 'output-init' };

// Styles for IntelliJ theming
export interface NxCloudFixStyles {
  foregroundColor: string;
  mutedForegroundColor: string;
  backgroundColor: string;
  primaryColor: string;
  errorColor: string;
  fieldBackgroundColor: string;
  fieldBorderColor: string;
  selectFieldBackgroundColor: string;
  activeSelectionBackgroundColor: string;
  focusBorderColor: string;
  bannerWarningBackgroundColor: string;
  bannerTextColor: string;
  badgeBackgroundColor: string;
  badgeForegroundColor: string;
  separatorColor: string;
  fieldNavHoverColor: string;
  scrollbarThumbColor: string;
  fontFamily: string;
  fontSize: string;
  // Cloud fix specific colors
  successColor: string;
  warningColor: string;
  hoverColor: string;
  borderColor: string;
  secondaryColor: string;
  secondaryForegroundColor: string;
}
