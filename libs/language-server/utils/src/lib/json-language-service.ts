import {
  getLanguageService,
  LanguageService,
  LanguageServiceParams,
  LanguageSettings,
} from 'vscode-json-languageservice';

let languageService: LanguageService | undefined;

export function configureJsonLanguageService(
  params: LanguageServiceParams,
  settings: LanguageSettings
) {
  if (languageService) {
    throw 'Language service already configured';
  }

  languageService = getLanguageService(params);
  languageService.configure(settings);
}

export function getJsonLanguageService(): LanguageService {
  if (!languageService) {
    throw 'Language service not configured';
  }

  return languageService;
}
