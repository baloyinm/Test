// Serves the production build (.vercel/output) locally: static files first, then the server function.
//   INTAKE_DRY_RUN=1 node tests/e2e/serve.mjs 4391
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const out = path.resolve('.vercel/output');
const fn = path.join(out, 'functions/_render.func');
const cfg = JSON.parse(await readFile(path.join(fn, '.vc-config.json'), 'utf8'));
const mod = await import(pathToFileURL(path.join(fn, cfg.handler)).href);
const app = mod.default;
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.json': 'application/json', '.woff2': 'font/woff2' };

http.createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(out, 'static', p);
  if (file.startsWith(path.join(out, 'static')) && existsSync(file) && statSync(file).isFile()) {
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    return res.end(await readFile(file));
  }
  const chunks = []; for await (const c of req) chunks.push(c);
  const hasBody = !['GET', 'HEAD'].includes(req.method);
  const r = await app.fetch(new Request('http://' + req.headers.host + req.url, { method: req.method, headers: req.headers, body: hasBody ? Buffer.concat(chunks) : undefined }));
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(Number(process.argv[2] || 4391), '127.0.0.1', () => console.log('serving'));
