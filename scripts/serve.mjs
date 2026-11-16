import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL(process.argv.includes('--dist') ? '../dist/' : '../', import.meta.url));
const port = Number(process.env.PORT || 5188);
const host = '127.0.0.1';
try {
  await stat(path.join(root, 'index.html'));
} catch {
  console.error('The website files are missing. Run npm run build, then npm run preview from the luscore.com folder.');
  process.exit(1);
}
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer(async (request, response) => {
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
});
server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Run PORT=${port + 1} npm start to use a different port.`);
  } else if (error.code === 'EPERM' || error.code === 'EACCES') {
    console.error('This environment cannot start a local web server. Run npm start in your Mac Terminal from the luscore.com folder.');
  } else {
    console.error(`Could not start Luscore: ${error.message}`);
  }
  process.exitCode = 1;
});
server.listen(port, host, () => console.log(`Luscore is ready at http://${host}:${port}\nServing ${root}\nKeep this terminal open. Press Ctrl+C to stop.`));
