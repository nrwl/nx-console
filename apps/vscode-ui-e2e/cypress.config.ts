import { defineConfig } from 'cypress';
import { nxE2EPreset } from '@nrwl/cypress/plugins/cypress-preset';

const cypressJsonConfig = {
  fileServerFolder: '.',
  video: true,
  videosFolder: '../../dist/cypress/apps/vscode-ui-e2e/videos',
  screenshotsFolder: '../../dist/cypress/apps/vscode-ui-e2e/screenshots',
  chromeWebSecurity: false,
  baseUrl: 'http://localhost:4400',
  specPattern: 'src/e2e/**/*.cy.{js,jsx,ts,tsx}',
  supportFile: 'src/support/e2e.ts',
};
export default defineConfig({
  e2e: {
    ...nxE2EPreset(__dirname),
    ...cypressJsonConfig,
  },
});
