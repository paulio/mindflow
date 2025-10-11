import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { version as appVersion } from './package.json';

const buildTimestamp = new Date().toISOString();
const buildVersion = `${appVersion}+${buildTimestamp}`;

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
});
