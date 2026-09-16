import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.jpeg'],
        manifest: {
          name: 'Aquarius Tattoo Studio',
          short_name: 'Aquarius',
          description: 'Studio management and inventory tracking for Aquarius Tattoo',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          // One source image declared as "any size" — claiming 192x192 and 512x512
          // for the same file made installers pick a wrongly-scaled icon.
          icons: [
            {
              src: '/logo.jpeg',
              sizes: 'any',
              type: 'image/jpeg',
              purpose: 'any'
            }
          ]
        }
      })
    ],

    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
