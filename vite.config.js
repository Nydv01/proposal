import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  root: '.',
  publicDir: 'assets',
  plugins: [
    glsl(),
    {
      name: 'debug-logger',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/log-debug' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                fs.appendFileSync(resolve(__dirname, 'debug.log'), body + '\n');
              } catch (e) {
                console.error('Failed to write debug log:', e);
              }
              res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
              res.end('ok');
            });
          } else {
            next();
          }
        });
      }
    }
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html')
      }
    }
  },
  server: {
    port: 5173,
    open: true,
  },
});
