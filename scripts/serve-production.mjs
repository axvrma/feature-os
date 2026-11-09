import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve('dist/ng-os');
const port = Number(process.env.PORT || 4173);
const e2e = process.argv.includes('--e2e');
let testRevision = 0;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
const netlify = await readFile('netlify.toml', 'utf8');
const csp = netlify.match(/Content-Security-Policy\s*=\s*"([^"]+)"/)?.[1];
await stat(resolve(root, 'index.html')).catch(() => {
  throw new Error('Production output is missing. Run npm run build first.');
});
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
    if (pathname === '/__e2e/version') {
      if (!e2e) {
        response.writeHead(404);
        response.end('Test control is disabled.');
        return;
      }
      if (request.method === 'POST') testRevision += 1;
      if (request.method === 'DELETE') testRevision = 0;
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ revision: testRevision }));
      return;
    }
    let file = resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403);
      response.end();
      return;
    }
    if (pathname.endsWith('/')) file = resolve(file, 'index.html');
    try {
      if (!(await stat(file)).isFile()) throw new Error('Not a file');
    } catch {
      if (extname(pathname)) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }
      file = resolve(root, 'index.html');
    }
    let body = await readFile(file);
    if (e2e && testRevision && pathname === '/ngsw.json') {
      const manifest = JSON.parse(body.toString('utf8'));
      manifest.appData = { ...manifest.appData, e2eRevision: testRevision };
      body = Buffer.from(JSON.stringify(manifest));
    }
    const headers = {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': /\.[a-f0-9]{8,}\.(js|css)$/.test(file)
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
      'Permissions-Policy': 'geolocation=(), microphone=(), payment=()',
    };
    if (csp) headers['Content-Security-Policy'] = csp;
    if (pathname === '/ngsw-worker.js') headers['Service-Worker-Allowed'] = '/';
    response.writeHead(200, headers);
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    response.writeHead(500);
    response.end('Unable to serve production output.');
    console.error(error);
  }
});
server.listen(port, '127.0.0.1', () =>
  console.log(`Feature OS production: http://127.0.0.1:${port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit(0)));
