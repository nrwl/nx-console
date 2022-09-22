import {
  getLanguageService,
  LanguageService,
  LanguageServiceParams,
  LanguageSettings,
} from 'vscode-json-languageservice';
import { lspLogger } from './lsp-log';

let languageService: LanguageService | undefined;

export function configureJsonLanguageService(
  params: LanguageServiceParams,
  settings: LanguageSettings
) {
  languageService = getLanguageService(params);
  languageService.configure(settings);
}

export function getJsonLanguageService(): LanguageService | undefined {
  if (!languageService) {
    lspLogger.log('Language service not configured');
  }

  return languageService;
}
