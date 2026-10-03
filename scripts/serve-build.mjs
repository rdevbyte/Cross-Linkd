/**
 * Local production preview of the Vercel build output.
 *
 *   npm run build && npm run preview          (default http://localhost:4321)
 *
 * `astro preview` refuses to run with the @astrojs/vercel adapter, so `npm run preview` used to fail
 * with "The @astrojs/vercel adapter does not support the preview command". This serves
 * `.vercel/output` roughly the way the platform does:
 *   - static files from `.vercel/output/static` (hashed `/_astro/*` files are cached immutably),
 *   - everything else through the function bundle (`_render.func`), i.e. the real SSR build,
 *   - the response headers configured in vercel.json (CSP, HSTS, …), so what you see here is what ships.
 *
 * It runs with NODE_ENV=production unless you set it (Secure cookies, production-only caching, …).
 * Environment variables (DATABASE_URL, AUTH_SECRET, …) are read from the real environment, not .env.
 * Over plain http the HSTS header and the CSP `upgrade-insecure-requests` directive are dropped,
 * otherwise the browser would try to reload every asset over https://localhost.
 */
import http from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Readable } from 'node:stream';

const root = process.cwd();
const outDir = join(root, '.vercel', 'output');
const staticDir = join(outDir, 'static');
const entry = join(outDir, 'functions', '_render.func', 'dist', 'server', 'entry.mjs');

if (!existsSync(entry)) {
  console.error('No build output found (.vercel/output). Run `npm run build` first.');
  process.exit(1);
}

const port = Number(process.env.PORT ?? 4321);
const hostname = process.env.HOST ?? '0.0.0.0';
process.env.NODE_ENV ??= 'production';

const { default: handler } = await import(pathToFileURL(entry).href);

// Headers from vercel.json for the catch-all source.
const configured = new Map();
try {
  const config = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
  for (const rule of config.headers ?? []) {
    if (rule.source !== '/(.*)') continue;
    for (const { key, value } of rule.headers) {
      if (key.toLowerCase() === 'strict-transport-security') continue; // http only
      const v = key.toLowerCase() === 'content-security-policy'
        ? value.split(';').map((d) => d.trim()).filter((d) => d && d !== 'upgrade-insecure-requests').join('; ')
        : value;
      configured.set(key, v);
    }
  }
} catch { /* no vercel.json: serve without extra headers */ }

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

function applyHeaders(res) {
  for (const [key, value] of configured) if (!res.hasHeader(key)) res.setHeader(key, value);
}

function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return false; }
  const file = resolve(staticDir, `.${decoded}`);
  if (file !== staticDir && !file.startsWith(staticDir + sep)) return false; // path traversal
  if (!existsSync(file) || !statSync(file).isFile()) return false;
  res.statusCode = 200;
  res.setHeader('Content-Type', TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream');
  res.setHeader('Content-Length', statSync(file).size);
  res.setHeader('Cache-Control', decoded.startsWith('/_astro/') ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate');
  applyHeaders(res);
  if (req.method === 'HEAD') res.end();
  else createReadStream(file).pipe(res);
  return true;
}

async function serveDynamic(req, res) {
  const peer = req.socket.remoteAddress ?? '';
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else if (value !== undefined) headers.set(key, value);
  }
  // The platform sets these from the real client address; mimic that.
  headers.set('x-vercel-forwarded-for', peer);
  headers.set('x-forwarded-for', peer);

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const request = new Request(`http://${req.headers.host ?? `localhost:${port}`}${req.url}`, {
    method: req.method,
    headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: 'half',
  });

  const response = await handler.fetch(request);
  res.statusCode = response.status;
  response.headers.forEach((value, key) => { if (key !== 'set-cookie') res.setHeader(key, value); });
  const cookies = response.headers.getSetCookie?.() ?? [];
  if (cookies.length) res.setHeader('set-cookie', cookies);
  applyHeaders(res);
  if (!response.body || req.method === 'HEAD') return res.end();
  Readable.fromWeb(response.body).pipe(res);
}

http
  .createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url ?? '/', 'http://localhost');
      if (serveStatic(req, res, pathname)) return;
      await serveDynamic(req, res);
    } catch (err) {
      console.error('[preview] request failed:', err);
      if (!res.headersSent) res.statusCode = 500;
      res.end('Internal Server Error');
    }
  })
  .listen(port, hostname, () => {
    console.log(`Production preview on http://localhost:${port}  (NODE_ENV=${process.env.NODE_ENV}; run \`npm run build\` again after code changes)`);
  });
