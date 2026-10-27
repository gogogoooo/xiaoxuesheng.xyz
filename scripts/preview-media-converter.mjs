import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const base = new URL('../public/tools/media-converter/', import.meta.url);
const prefix = '/tools/media-converter/';
const root = path.resolve(fileURLToPath(base));
const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json'],
  ['.bin', 'application/octet-stream'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

const server = http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end(); return; }
  if (pathname === '/' || pathname === prefix.slice(0, -1)) {
    response.writeHead(302, {Location: prefix});
    response.end();
    return;
  }
  if (pathname === '/favicon.ico') {
    response.writeHead(204);
    response.end();
    return;
  }
  const name = pathname.startsWith(prefix) ? pathname.slice(prefix.length) || 'index.html' : '';
  const target = path.resolve(root, name);
  if (!name || !target.startsWith(`${root}${path.sep}`) || !mimeTypes.has(path.extname(name))) {
    response.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
    response.end('页面不存在');
    return;
  }
  try {
    const realPath = fs.realpathSync(target);
    const realRoot = fs.realpathSync(root);
    if (!realPath.startsWith(`${realRoot}${path.sep}`) || !fs.statSync(realPath).isFile()) throw Object.assign(new Error('Invalid path'), {code: 'ENOENT'});
    const stat = fs.statSync(realPath);
    response.writeHead(200, {'Content-Type': mimeTypes.get(path.extname(name)), 'Content-Length': stat.size, 'Cache-Control': 'no-store'});
    if (request.method === 'HEAD') response.end();
    else fs.createReadStream(realPath).pipe(response);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500);
    response.end('预览文件不存在或无法读取');
  }
});

server.listen(3012, '127.0.0.1', () => {
  console.log(`Local: http://localhost:3012${prefix}`);
});
