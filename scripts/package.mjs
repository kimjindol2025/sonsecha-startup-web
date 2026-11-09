import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const assets = new Map();

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'server' && entry.name !== '.openai') await collect(fullPath);
      continue;
    }

    const pathname = `/${relative(dist, fullPath).replaceAll('\\', '/')}`;
    const content = await readFile(fullPath);
    assets.set(pathname, content.toString('base64'));
  }
}

await collect(dist);
await mkdir(join(dist, 'server'), { recursive: true });
await mkdir(join(dist, '.openai'), { recursive: true });
await cp(join(root, '.openai', 'hosting.json'), join(dist, '.openai', 'hosting.json'));

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const worker = `
const assets = new Map(${JSON.stringify([...assets])});
const mimeTypes = ${JSON.stringify(mimeTypes)};

function decode(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const encoded = assets.get(pathname);
    if (!encoded) return new Response('Not found', { status: 404 });
    const extension = pathname.slice(pathname.lastIndexOf('.'));
    return new Response(decode(encoded), {
      headers: {
        'content-type': mimeTypes[extension] || 'application/octet-stream',
        'cache-control': pathname === '/index.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
      },
    });
  },
};
`;

await writeFile(join(dist, 'server', 'index.js'), worker);
console.log(`Packaged ${assets.size} static assets for Sites.`);
