const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'dist');
let port = Number(process.env.KDMP_LIVE_PORT || 8014);
if (!fs.existsSync(path.join(root, 'index.html'))) {
  throw new Error('Build belum tersedia. Jalankan tools/build-netlify.js terlebih dahulu.');
}
const types = {
  '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.webp':'image/webp', '.avif':'image/avif', '.woff2':'font/woff2'
};

const server = http.createServer((req,res)=>{
  let pathname;
  try { pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }
  const relative=pathname==='/'?'index.html':pathname.replace(/^[/\\]+/,'');
  const file=path.resolve(root,relative),fromRoot=path.relative(root,file);
  if (fromRoot==='..'||fromRoot.startsWith('..'+path.sep)||path.isAbsolute(fromRoot)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  if (!fs.existsSync(file)||!fs.statSync(file).isFile()) {
    res.writeHead(404); return res.end('Not found');
  }
  res.writeHead(200,{'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    port += 1;
    console.log(`Port sedang dipakai; mencoba http://127.0.0.1:${port}...`);
    server.listen(port,'127.0.0.1');
    return;
  }
  console.error('Server live gagal dijalankan:', error.message);
  process.exitCode = 1;
});

server.on('listening',()=>console.log(`KDKMP LIVE Supabase at http://127.0.0.1:${port} — browser writes go to the configured Supabase project`));
server.listen(port,'127.0.0.1');
