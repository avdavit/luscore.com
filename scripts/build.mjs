import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { services as serviceCatalog } from '../src/services.js';
const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const read = path => readFile(new URL(path, root), 'utf8');
const [html, css, services, galaxy, spark, main, icon, logo, aboutTemplate, aboutCss, robots, sitemap] = await Promise.all([
  read('src/page.html'), read('src/style.css'), read('src/services.js'), read('src/galaxy.js'), read('src/spark.js'), read('src/main.js'), read('public/favicon.svg'), read('public/luscore-logo.svg'),
  read('src/about.html'), read('src/about.css'), read('public/robots.txt'), read('public/sitemap.xml'),
]);
const script = [
  services.replace('export const services', 'const services'),
  galaxy.replace('export class Galaxy', 'class Galaxy'),
  spark.replace('export class IdeaSpark', 'class IdeaSpark'),
  main.replace(/^import .*;\n/gm, ''),
].join('\n');
// Standalone previews cannot fetch project files or network fonts.
const embeddedCss = css.replace(/^@import\s+url\([^\n]+\);\s*/m, '');
const embedBrand = page => page
  .replace('href="/public/favicon.svg"', () => `href="data:image/svg+xml,${encodeURIComponent(icon)}"`)
  .replace('src="/public/luscore-logo.svg"', () => `src="data:image/svg+xml,${encodeURIComponent(logo)}"`);
const output = embedBrand(html)
  .replace('<link rel="stylesheet" href="/src/style.css" />', () => `<style>${embeddedCss}</style>`)
  .replace('<script type="module" src="/src/main.js"></script>', () => `<script>\n(() => {\n${script}\n})();\n</script>`);
const escapeHtml = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const serviceDetails = serviceCatalog.map((service, index) => `
          <article class="service" id="service-${service.id}" style="--service-color: ${service.color}">
            <div class="service-title"><span class="service-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(service.name)}</h3></div>
            <div class="service-copy"><p>${escapeHtml(service.description)}</p><ul>${service.capabilities.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul><a class="service-email" href="mailto:info@luscore.com?subject=${encodeURIComponent(`Let’s talk about ${service.name}`)}">Discuss your project <span aria-hidden="true">↗</span></a></div>
          </article>`).join('\n');
const aboutOutput = embedBrand(aboutTemplate)
  .replace('<link rel="stylesheet" href="/src/about.css" />', () => `<style>${aboutCss}</style>`)
  .replace(/^[ \t]*<!-- SERVICE_DETAILS -->/m, () => serviceDetails.trimStart());
await Promise.all([
  writeFile(new URL('index.html', root), output),
  writeFile(new URL('index.html', dist), output),
  writeFile(new URL('Luscore-Preview.html', dist), output),
  writeFile(new URL('about.html', root), aboutOutput),
  writeFile(new URL('about.html', dist), aboutOutput),
  ...[root, dist].flatMap(base => [
    writeFile(new URL('robots.txt', base), robots),
    writeFile(new URL('sitemap.xml', base), sitemap),
  ]),
]);
console.log('Built the galaxy homepage, About page, sitemap, and robots.txt in the root and dist/.');
