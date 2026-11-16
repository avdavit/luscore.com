import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const read = path => readFile(new URL(path, root), 'utf8');
const [html, css, services, galaxy, spark, main, icon, logo] = await Promise.all([
  read('index.html'), read('src/style.css'), read('src/services.js'), read('src/galaxy.js'), read('src/spark.js'), read('src/main.js'), read('public/favicon.svg'), read('public/luscore-logo.svg'),
]);
const script = [
  services.replace('export const services', 'const services'),
  galaxy.replace('export class Galaxy', 'class Galaxy'),
  spark.replace('export class IdeaSpark', 'class IdeaSpark'),
  main.replace(/^import .*;\n/gm, ''),
].join('\n');
const output = html
  .replace('<link rel="stylesheet" href="/src/style.css" />', () => `<style>${css}</style>`)
  .replace('href="/public/favicon.svg"', () => `href="data:image/svg+xml,${encodeURIComponent(icon)}"`)
  .replace('src="/public/luscore-logo.svg"', () => `src="data:image/svg+xml,${encodeURIComponent(logo)}"`)
  .replace('<script type="module" src="/src/main.js"></script>', () => `<script type="module">${script}</script>`);
await writeFile(new URL('index.html', dist), output);
console.log('Built dist/index.html — portable HTML, ready to open directly or deploy to static hosting.');
