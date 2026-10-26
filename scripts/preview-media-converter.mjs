import http from 'node:http';
import fs from 'node:fs';

const base = new URL('../public/tools/media-converter/', import.meta.url);
const prefix = '/tools/media-converter/';
const files = new Map([
  ['index.html', 'text/html; charset=utf-8'],
  ['styles.css', 'text/css; charset=utf-8'],
  ['app.js', 'text/javascript; charset=utf-8'],
]);

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
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
  if (!files.has(name)) {
    response.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
    response.end('页面不存在');
    return;
  }
  try {
    response.writeHead(200, {'Content-Type': files.get(name), 'Cache-Control': 'no-store'});
    response.end(fs.readFileSync(new URL(name, base)));
  } catch {
    response.writeHead(500);
    response.end('预览文件读取失败');
  }
});

server.listen(3012, '127.0.0.1', () => {
  console.log(`Local: http://localhost:3012${prefix}`);
});
