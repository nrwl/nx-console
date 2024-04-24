import { defineConfig } from 'cypress';
import { nxE2EPreset } from '@nx/cypress/plugins/cypress-preset';

export default defineConfig({
  e2e: {
    ...nxE2EPreset(__dirname, {
      bundler: 'vite',
      webServerCommands: {
        default: 'nx run generate-ui-v2-e2e:serve',
      },
      ciWebServerCommand: 'nx run generate-ui-v2-e2e:serve',
    }),
    baseUrl: 'http://localhost:4200',
  },
});
