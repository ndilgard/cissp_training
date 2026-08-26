import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
  plugins: [react(), progressBackupPlugin()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
  },
});
