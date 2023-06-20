import '@nx-console/shared/lit-utils';
import {
  allComponents,
  provideVSCodeDesignSystem,
} from '@vscode/webview-ui-toolkit';
import './components/claim-callout';
import './components/no-cache';
import './components/run-list';
import './components/status-labels';
import './components/steps';
import './components/ui/callout';
import './components/ui/logo';

provideVSCodeDesignSystem().register(allComponents);
