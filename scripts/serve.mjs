import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL(process.argv.includes('--dist') ? '../dist/' : '../', import.meta.url));
const port = Number(process.env.PORT || 5173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname.replace(/^\/+/, '') || 'index.html';
    if (relative.split('/').some(part => part.startsWith('.')) || !['index.html', 'src', 'public'].includes(relative.split('/')[0])) {
      response.writeHead(404).end('Not found');
      return;
    }
    const file = path.resolve(root, relative);
    if (!file.startsWith(root) || !(await stat(file)).isFile()) throw new Error('Not found');
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Luscore is ready at http://localhost:${port}`));
