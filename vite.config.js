import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Dev-only middleware that persists progress to a file on disk, independent
// of the browser's localStorage. Protects against localStorage being wiped
// by an unclean browser shutdown (e.g. sign-out/reboot killing Firefox
// mid-write) — the app restores from this file if localStorage comes back
// empty. See src/utils/backup.js for the client side of this.
function progressBackupPlugin() {
  const backupFile = path.resolve(process.cwd(), '.data/progress-backup.json');

  return {
    name: 'cissp-progress-backup',
    configureServer(server) {
      server.middlewares.use('/api/progress-backup', (req, res) => {
        if (req.method === 'GET') {
          if (fs.existsSync(backupFile)) {
            res.setHeader('Content-Type', 'application/json');
            res.end(fs.readFileSync(backupFile, 'utf-8'));
          } else {
            res.statusCode = 404;
            res.end('{}');
          }
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              JSON.parse(body);
              fs.mkdirSync(path.dirname(backupFile), { recursive: true });
              fs.writeFileSync(backupFile, body, 'utf-8');
              res.statusCode = 204;
              res.end();
            } catch {
              res.statusCode = 400;
              res.end('Invalid JSON');
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: '/cissp_training/',
  plugins: [
    react(),
    progressBackupPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'CISSPrep',
        short_name: 'CISSPrep',
        description: 'CISSP practice exam and flashcard study app',
        theme_color: '#7e14ff',
        background_color: '#7e14ff',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Default cap is 2 MiB; the question bank bundle alone is ~4.6MB.
        maximumFileSizeToCacheInBytes: 8000000,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
  },
});
