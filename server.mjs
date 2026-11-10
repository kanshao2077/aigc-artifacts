import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const arg = process.argv.indexOf('--port');
const port = arg >= 0 ? Number(process.argv[arg + 1]) : 4173;
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.gif':'image/gif','.mp4':'video/mp4','.webm':'video/webm','.wav':'audio/wav','.mp3':'audio/mpeg','.woff2':'font/woff2','.ttf':'font/ttf'};
const handler = (req,res) => {
  let name;
  try { name = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  const target = path.resolve(root,'.' + (name === '/' ? '/index.html' : name));
  if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.stat(target,(err,stat) => {
    if (err || !stat.isFile()) { res.writeHead(404).end('Not found'); return; }
    const headers={'Content-Type':mime[path.extname(target)] || 'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
    let start=0,end=stat.size-1,status=200;
    if(req.headers.range){
      const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(!range){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return;}
      if(!range[1] && range[2]) start=Math.max(0,stat.size-Number(range[2]));
      else {start=Number(range[1]);if(range[2])end=Math.min(Number(range[2]),end);}
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return;}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
    }
    headers['Content-Length']=end-start+1;
    res.writeHead(status,headers);
    if(req.method==='HEAD'){res.end();return;}
    fs.createReadStream(target,{start,end}).on('error',()=>res.destroy()).pipe(res);
  });
};
http.createServer(handler).listen(port,'127.0.0.1',() => console.log(`AIGC Artifacts: http://127.0.0.1:${port}`));
http.createServer(handler).on('error',error=>{if(error.code!=='EADDRINUSE')console.error(error.message);}).listen(port,'::1');
