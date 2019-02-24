const http = require('http');
const httpProxy = require('http-proxy');
const proxy = httpProxy.createProxyServer()


const server = http.createServer((req, res) => {
    console.log(req);
  if (req.url.startsWith('/paint')) {
    console.log('serve /paint api');
    proxy.web(req, res, { target: 'http://localhost:8080'});
    return;
  }

  if (req.url.startsWith('/data') || req.url.startsWith('/stock')) {
    proxy.web(req, res, { target: 'http://localhost:3000'});
    return;
  }

  res.writeHead(404);
  res.end();
}).listen(80);

server.on('upgrade', (req, res, head) => {
  console.log('upgrade');
  proxy.ws(req, res, head, {
    target: 'ws://localhost:8080',
  });
});